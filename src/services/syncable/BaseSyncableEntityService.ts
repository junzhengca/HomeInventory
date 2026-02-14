import { HomeScopedEntity } from '../../types/inventory';
import { ApiClient } from '../ApiClient';
import { fileSystemService } from '../FileSystemService';
import { syncLogger } from '../../utils/Logger';
import {
  BatchSyncResponse,
  BatchSyncRequest,
  BatchSyncPullRequest,
  BatchSyncPushRequest,
  Checkpoint,
  SyncEntityType,
} from '../../types/api';

/**
 * Configuration for a syncable entity type
 */
export interface SyncableEntityConfig<TEntity, TServerData> {
  // Entity identification
  entityType: SyncEntityType;
  fileName: string;
  entityName: string; // For error messages/logging

  // ID generation
  generateId: () => string;

  // Data transformation
  toServerData: (entity: TEntity) => TServerData;
  fromServerData: (serverData: TServerData, meta: ServerEntityMeta) => TEntity;
  toSyncEntity: (entity: TEntity, homeId: string) => SyncEntityData;

  // Entity creation
  createEntity: (
    input: CreateEntityInput<TEntity>,
    homeId: string,
    id: string,
    now: string
  ) => TEntity;

  // Field updates
  applyUpdate: (
    entity: TEntity,
    updates: Partial<Omit<TEntity, 'id' | 'version' | 'clientUpdatedAt'>>,
    now: string
  ) => TEntity;

  // Optional: custom behavior
  skipPendingCreateCheck?: boolean; // For TodoService's version check fix
  preserveCreatedAtOnPull?: boolean; // For TodoService's createdAt preservation
}

export interface ServerEntityMeta {
  entityId: string;
  homeId: string;
  updatedAt: string;
  version: number;
  clientUpdatedAt: string;
  serverTimestamp: string;
}

export interface SyncEntityData {
  entityId: string;
  entityType: SyncEntityType;
  homeId: string;
  data: Record<string, unknown>;
  version: number;
  clientUpdatedAt: string;
  pendingCreate: boolean;
  pendingDelete: boolean;
}

export type EntityData<TEntity> = {
  entities?: TEntity[];
  items?: TEntity[];
  todos?: TEntity[];
  categories?: TEntity[];
  locations?: TEntity[];
  lastSyncTime?: string;
  lastPulledVersion?: number;
};

export type CreateEntityInput<TEntity> = Omit<
  TEntity,
  'id' | 'homeId' | 'createdAt' | 'updatedAt' | 'version' | 'clientUpdatedAt' | 'pendingCreate' | 'pendingUpdate' | 'pendingDelete' | 'lastSyncedAt' | 'serverUpdatedAt' | 'deletedAt'
>;

/**
 * Base class for syncable entity services
 * Provides generic CRUD and sync operations for any entity type
 */
export abstract class BaseSyncableEntityService<
  TEntity extends HomeScopedEntity,
  TServerData
> {
  protected constructor(protected config: SyncableEntityConfig<TEntity, TServerData>) {}

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  /**
   * Get all entities (excluding deleted)
   */
  async getAll(homeId: string): Promise<TEntity[]> {
    this.validateHomeId(homeId, `get ${this.config.entityName}`);
    const data = await this.readFile();
    const entities = this.getEntitiesFromData(data);
    return entities.filter((e) => !e.deletedAt);
  }

  /**
   * Get all entities for sync (including deleted)
   */
  async getAllForSync(homeId: string): Promise<TEntity[]> {
    this.validateHomeId(homeId, `get ${this.config.entityName} for sync`);
    const data = await this.readFile();
    return this.getEntitiesFromData(data);
  }

  /**
   * Get entities array from data, handling different property names
   */
  protected getEntitiesFromData(data: EntityData<TEntity> | null): TEntity[] {
    if (!data) return [];

    // The data structure uses different property names: entities, items, todos, categories, locations
    return data.entities || data.items || data.todos || data.categories || data.locations || [];
  }

  /**
   * Get a single entity by ID
   */
  async getById(id: string, homeId: string): Promise<TEntity | null> {
    this.validateHomeId(homeId, `get ${this.config.entityName} by ID`);
    const entities = await this.getAll(homeId);
    return entities.find((e) => (e as { id?: string }).id === id) || null;
  }

  /**
   * Create a new entity
   */
  async create(input: CreateEntityInput<TEntity>, homeId: string): Promise<TEntity | null> {
    try {
      this.validateHomeId(homeId, `create ${this.config.entityName}`);

      const data = await this.readFile();
      const entities = this.getEntitiesFromData(data);
      const now = new Date().toISOString();
      const id = this.config.generateId();

      const newEntity = this.config.createEntity(input, homeId, id, now);

      entities.push(newEntity);
      const success = await this.writeFile({ ...data, entities }, homeId);

      return success ? newEntity : null;
    } catch (error) {
      syncLogger.error(`Error creating ${this.config.entityName}:`, error);
      return null;
    }
  }

  /**
   * Update an existing entity
   */
  async update(
    id: string,
    updates: Partial<Omit<TEntity, 'id' | 'version' | 'clientUpdatedAt'>>,
    homeId: string
  ): Promise<TEntity | null> {
    try {
      this.validateHomeId(homeId, `update ${this.config.entityName}`);

      const data = await this.readFile();
      const entities = this.getEntitiesFromData(data);
      const index = entities.findIndex((e) => e.id === id);

      if (index === -1) {
        return null;
      }

      const now = new Date().toISOString();
      const isPendingCreate = entities[index].pendingCreate;

      entities[index] = this.config.applyUpdate(entities[index], updates, now);

      // Override pending flags based on state
      (entities[index] as TEntity).pendingUpdate = !isPendingCreate;

      const success = await this.writeFile({ ...data, entities }, homeId);
      return success ? entities[index] : null;
    } catch (error) {
      syncLogger.error(`Error updating ${this.config.entityName}:`, error);
      return null;
    }
  }

  /**
   * Delete an entity (soft delete)
   */
  async delete(id: string, homeId: string): Promise<boolean> {
    try {
      this.validateHomeId(homeId, `delete ${this.config.entityName}`);

      const data = await this.readFile();
      const entities = this.getEntitiesFromData(data);
      const index = entities.findIndex((e) => e.id === id);

      if (index === -1) {
        return false;
      }

      if (entities[index].deletedAt) {
        return true; // Already deleted (idempotent)
      }

      const now = new Date().toISOString();
      const isPendingCreate = entities[index].pendingCreate;

      if (isPendingCreate) {
        // Hard delete if never synced
        entities.splice(index, 1);
      } else {
        // Soft delete
        entities[index] = {
          ...entities[index],
          deletedAt: now,
          updatedAt: now,
          version: entities[index].version + 1,
          clientUpdatedAt: now,
          pendingDelete: true,
          pendingUpdate: false,
        } as TEntity;
      }

      return await this.writeFile({ ...data, entities }, homeId);
    } catch (error) {
      syncLogger.error(`Error deleting ${this.config.entityName}:`, error);
      return false;
    }
  }

  // ===========================================================================
  // Sync Operations
  // ===========================================================================

  /**
   * Sync entities with server
   */
  async sync(homeId: string, apiClient: ApiClient, deviceId: string): Promise<void> {
    syncLogger.info(`Starting ${this.config.entityName} sync...`);
    try {
      const data = await this.readFile();
      let entities = this.getEntitiesFromData(data);
      const lastSyncTime = data?.lastSyncTime;
      const lastPulledVersion = data?.lastPulledVersion || 0;

      // 1. Prepare push request
      const pendingEntities = entities.filter(
        (e) => e.pendingCreate || e.pendingUpdate || e.pendingDelete
      );
      const pushRequests = this.buildPushRequests(
        pendingEntities,
        homeId,
        lastSyncTime,
        lastPulledVersion
      );

      // 2. Prepare pull request
      const pullRequests: BatchSyncPullRequest[] = [
        {
          entityType: this.config.entityType,
          since: lastSyncTime,
          includeDeleted: true,
          checkpoint: { lastPulledVersion },
        },
      ];

      // 3. Perform batch sync
      const batchRequest: BatchSyncRequest = {
        homeId,
        deviceId,
        pullRequests,
        pushRequests: pushRequests.length > 0 ? pushRequests : undefined,
      };

      const response = await apiClient.batchSync(batchRequest);

      if (!response.success) {
        syncLogger.error(`${this.config.entityName} sync failed:`, response);
        return;
      }

      // CRITICAL FIX: Re-read data before applying results
      const freshData = await this.readFile();
      if (freshData?.entities) {
        entities = freshData.entities;
      }

      // 4. Process push results
      entities = this.processPushResults(
        entities,
        response,
        pendingEntities
      );

      // 5. Process pull results
      entities = this.processPullResults(entities, response);

      // 6. Save changes
      const checkpoint = this.extractCheckpoint(response.pullResults);
      await this.writeFile({
        entities,
        lastSyncTime: response.serverTimestamp,
        lastPulledVersion: checkpoint.lastPulledVersion ?? lastPulledVersion,
      }, homeId);

      syncLogger.info(`${this.config.entityName} sync complete`);
    } catch (error) {
      syncLogger.error(`Error syncing ${this.config.entityName}:`, error);
    }
  }

  // ===========================================================================
  // Protected Helper Methods
  // ===========================================================================

  protected validateHomeId(homeId: string, operation: string): void {
    if (!homeId) {
      throw new Error(`homeId is required to ${operation}`);
    }
  }

  protected async readFile(): Promise<EntityData<TEntity> | null> {
    return fileSystemService.readFile<EntityData<TEntity>>(
      this.config.fileName,
      '' // homeId will be provided by FileSystemService context
    );
  }

  protected async writeFile(data: EntityData<TEntity>, homeId: string): Promise<boolean> {
    return fileSystemService.writeFile(this.config.fileName, data, homeId);
  }

  protected buildPushRequests(
    pendingEntities: TEntity[],
    homeId: string,
    lastSyncTime: string | undefined,
    lastPulledVersion: number
  ): BatchSyncPushRequest[] {
    if (pendingEntities.length === 0) return [];

    syncLogger.info(
      `Pushing ${pendingEntities.length} pending ${this.config.entityName}`
    );

    return [
      {
        entityType: this.config.entityType,
        entities: pendingEntities.map((e) =>
          this.config.toSyncEntity(e, homeId)
        ),
        lastPulledAt: lastSyncTime,
        checkpoint: { lastPulledVersion },
      },
    ];
  }

  protected processPushResults(
    entities: TEntity[],
    response: BatchSyncResponse,
    pendingEntities: TEntity[]
  ): TEntity[] {
    if (!response.pushResults) return entities;

    const result = [...entities];

    for (const pushResult of response.pushResults) {
      if (pushResult.entityType !== this.config.entityType) continue;

      for (const syncResult of pushResult.results) {
        const index = result.findIndex((e) => e.id === syncResult.entityId);
        if (index === -1) continue;

        // Version check fix (for TodoService behavior)
        if (this.config.skipPendingCreateCheck) {
          const originalEntity = pendingEntities.find(
            (e) => e.id === syncResult.entityId
          );
          if (
            originalEntity &&
            result[index].version !== originalEntity.version
          ) {
            syncLogger.info(
              `${this.config.entityName} ${syncResult.entityId} was modified during sync ` +
                `(ver ${originalEntity.version} -> ${result[index].version}), keeping pending state`
            );
            continue;
          }
        }

        if (syncResult.status === 'created' || syncResult.status === 'updated') {
          result[index] = {
            ...result[index],
            pendingCreate: false,
            pendingUpdate: false,
            pendingDelete: false,
            serverUpdatedAt: syncResult.serverUpdatedAt,
            lastSyncedAt: response.serverTimestamp,
          };
          if (syncResult.status === 'created' && syncResult.serverVersion) {
            result[index].version = syncResult.serverVersion;
          }
        } else if (
          syncResult.status === 'server_version' &&
          syncResult.winner === 'server'
        ) {
          if (syncResult.serverVersionData) {
            const serverData = syncResult.serverVersionData
              .data as unknown as TServerData;
            result[index] = this.config.fromServerData(serverData, {
              entityId: syncResult.entityId,
              homeId: result[index].homeId,
              updatedAt: syncResult.serverVersionData.updatedAt,
              version: syncResult.serverVersionData.version,
              clientUpdatedAt: result[index].clientUpdatedAt,
              serverTimestamp: response.serverTimestamp,
            });
            (result[index] as TEntity).pendingCreate = false;
            (result[index] as TEntity).pendingUpdate = false;
          }
        } else if (syncResult.status === 'deleted') {
          result[index] = {
            ...result[index],
            pendingDelete: false,
            lastSyncedAt: response.serverTimestamp,
          } as TEntity;
        }
      }
    }

    return result;
  }

  protected processPullResults(
    entities: TEntity[],
    response: BatchSyncResponse
  ): TEntity[] {
    if (!response.pullResults) return entities;

    const result = [...entities];

    for (const pullResult of response.pullResults) {
      if (pullResult.entityType !== this.config.entityType) continue;

      for (const entity of pullResult.entities) {
        const index = result.findIndex((e) => e.id === entity.entityId);
        const serverData = entity.data as unknown as TServerData;

        const newEntity = this.config.fromServerData(serverData, {
          entityId: entity.entityId,
          homeId: entity.homeId,
          updatedAt: entity.updatedAt,
          version: entity.version,
          clientUpdatedAt: entity.clientUpdatedAt,
          serverTimestamp: response.serverTimestamp,
        });

        if (index >= 0) {
          // Only update if no pending changes
          if (
            !result[index].pendingUpdate &&
            !result[index].pendingCreate &&
            !result[index].pendingDelete
          ) {
            // Preserve createdAt if configured
            if (this.config.preserveCreatedAtOnPull) {
              (newEntity as TEntity).createdAt =
                result[index].createdAt || newEntity.createdAt;
            }
            result[index] = { ...result[index], ...newEntity };
          }
        } else {
          result.push(newEntity);
        }
      }

      for (const deletedId of pullResult.deletedEntityIds) {
        const index = result.findIndex((e) => e.id === deletedId);
        if (index >= 0) {
          result[index] = {
            ...result[index],
            deletedAt: response.serverTimestamp,
            pendingDelete: false,
          } as TEntity;
        }
      }
    }

    return result;
  }

  protected extractCheckpoint(
    pullResults?: BatchSyncResponse['pullResults']
  ): Checkpoint {
    const checkpoint = pullResults?.find(
      (r) => r.entityType === this.config.entityType
    )?.checkpoint;
    return checkpoint || ({} as Checkpoint);
  }
}
