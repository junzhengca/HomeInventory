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
import {
  SyncDelta,
  SyncAccumulator,
} from '../../types/sync';

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
    const data = await this.readFileScoped(homeId);
    const entities = this.getEntitiesFromData(data);
    return entities.filter((e) => !e.deletedAt);
  }

  /**
   * Get all entities for sync (including deleted)
   */
  async getAllForSync(homeId: string): Promise<TEntity[]> {
    this.validateHomeId(homeId, `get ${this.config.entityName} for sync`);
    const data = await this.readFileScoped(homeId);
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

      const data = await this.readFileScoped(homeId);
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

      const data = await this.readFileScoped(homeId);
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

      const data = await this.readFileScoped(homeId);
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
   * Sync entities with server and return delta of changes
   * @returns SyncDelta describing what actually changed
   */
  async sync(homeId: string, apiClient: ApiClient, deviceId: string): Promise<SyncDelta<TEntity>> {
    syncLogger.info(`Starting ${this.config.entityName} sync...`);
    syncLogger.verbose(`🔄 sync - homeId: ${homeId}, deviceId: ${deviceId}`);
    try {
      const data = await this.readFileScoped(homeId);
      let entities = this.getEntitiesFromData(data);
      syncLogger.verbose(`📋 Loaded ${entities.length} ${this.config.entityName} entities from storage`);
      entities.forEach(e => {
        syncLogger.verbose(`  → Entity ${e.id}: pendingCreate=${e.pendingCreate}, pendingUpdate=${e.pendingUpdate}, pendingDelete=${e.pendingDelete}`);
      });

      const lastSyncTime = data?.lastSyncTime;
      const lastPulledVersion = data?.lastPulledVersion || 0;
      syncLogger.verbose(`⏱ lastSyncTime: ${lastSyncTime}, lastPulledVersion: ${lastPulledVersion}`);

      // Initialize accumulator
      const accumulator: SyncAccumulator<TEntity> = {
        updated: new Map(),
        created: new Map(),
        deleted: new Set(),
        confirmed: new Set(),
      };

      // 1. Prepare push request
      const pendingEntities = entities.filter(
        (e) => e.pendingCreate || e.pendingUpdate || e.pendingDelete
      );
      syncLogger.verbose(`📤 Found ${pendingEntities.length} pending entities to push`);
      pendingEntities.forEach(e => {
        syncLogger.verbose(`  → Pending ${e.id}: pendingCreate=${e.pendingCreate}, pendingUpdate=${e.pendingUpdate}, pendingDelete=${e.pendingDelete}`);
      });

      const pushRequests = this.buildPushRequests(
        pendingEntities,
        homeId,
        lastSyncTime,
        lastPulledVersion
      );
      syncLogger.verbose(`📤 Push requests prepared: ${pushRequests.length > 0 ? pushRequests[0].entities.length : 0} entities`);

      // 2. Prepare pull request
      const pullRequests: BatchSyncPullRequest[] = [
        {
          entityType: this.config.entityType,
          since: lastSyncTime,
          includeDeleted: true,
          checkpoint: { lastPulledVersion },
        },
      ];
      syncLogger.verbose(`📥 Pull request prepared: since=${lastSyncTime}, includeDeleted=true`);

      // 3. Perform batch sync
      const batchRequest: BatchSyncRequest = {
        homeId,
        deviceId,
        pullRequests,
        pushRequests: pushRequests.length > 0 ? pushRequests : undefined,
      };
      syncLogger.verbose(`📡 Sending batch sync request...`);

      const response = await apiClient.batchSync(batchRequest);
      syncLogger.verbose(`📡 Batch sync response received: success=${response.success}`);

      if (!response.success) {
        syncLogger.error(`${this.config.entityName} sync failed:`, response);
        return this.emptyDelta(response.serverTimestamp);
      }

      // CRITICAL FIX: Re-read data before applying results
      const freshData = await this.readFileScoped(homeId);
      if (freshData?.entities) {
        entities = freshData.entities;
        syncLogger.verbose(`🔄 Re-read entities from storage: ${entities.length} entities`);
      }

      // 4. Process push results -> accumulate changes
      syncLogger.verbose(`📍 Step 4/6: Processing push results...`);
      entities = this.processPushResultsToAccumulator(
        entities,
        response,
        pendingEntities,
        accumulator
      );
      syncLogger.verbose(`✅ Push results processed: accumulator.updated.size=${accumulator.updated.size}, accumulator.created.size=${accumulator.created.size}, accumulator.deleted.size=${accumulator.deleted.size}, accumulator.confirmed.size=${accumulator.confirmed.size}`);

      // 5. Process pull results -> accumulate changes
      syncLogger.verbose(`📍 Step 5/6: Processing pull results...`);
      entities = this.processPullResultsToAccumulator(
        entities,
        response,
        accumulator
      );
      syncLogger.verbose(`✅ Pull results processed: accumulator.updated.size=${accumulator.updated.size}, accumulator.created.size=${accumulator.created.size}, accumulator.deleted.size=${accumulator.deleted.size}`);

      // 6. Save changes to storage
      syncLogger.verbose(`📍 Step 6/6: Saving to storage...`);
      const checkpoint = this.extractCheckpoint(response.pullResults);
      await this.writeFile({
        entities,
        lastSyncTime: response.serverTimestamp,
        lastPulledVersion: checkpoint.lastPulledVersion ?? lastPulledVersion,
      }, homeId);
      syncLogger.verbose(`✅ Saved ${entities.length} entities to storage`);

      // 7. Return delta for state update
      syncLogger.verbose(`📍 Step 7/7: Building delta...`);
      const delta = this.buildDelta(accumulator, response.serverTimestamp, checkpoint);

      syncLogger.info(
        `${this.config.entityName} sync complete: ` +
        `${delta.updated.length} updated, ${delta.created.length} created, ` +
        `${delta.deleted.length} deleted, unchanged=${delta.unchanged}`
      );
      syncLogger.verbose(`📊 Delta summary: updated=${delta.updated.length}, created=${delta.created.length}, deleted=${delta.deleted.length}, confirmed=${delta.confirmed?.length || 0}`);

      return delta;

    } catch (error) {
      syncLogger.error(`Error syncing ${this.config.entityName}:`, error);
      return this.emptyDelta(new Date().toISOString());
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
    // CRITICAL: We must pass homeId for proper file scoping
    // The readFile call below uses a closure-captured homeId from the calling method
    throw new Error('readFile() must be called with homeId parameter - use readFileScoped(homeId) instead');
  }

  /**
   * Read file scoped to a specific home
   */
  protected async readFileScoped(homeId: string): Promise<EntityData<TEntity> | null> {
    return fileSystemService.readFile<EntityData<TEntity>>(
      this.config.fileName,
      homeId
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

  // ===========================================================================
  // Delta-Aware Sync Methods (New)
  // ===========================================================================

  /**
   * Process push results and accumulate changes for delta tracking
   */
  protected processPushResultsToAccumulator(
    entities: TEntity[],
    response: BatchSyncResponse,
    pendingEntities: TEntity[],
    accumulator: SyncAccumulator<TEntity>
  ): TEntity[] {
    if (!response.pushResults) return entities;

    const result = [...entities];
    syncLogger.verbose(`📤 Processing ${response.pushResults.length} push results...`);

    for (const pushResult of response.pushResults) {
      if (pushResult.entityType !== this.config.entityType) continue;
      syncLogger.verbose(`📤 Processing ${pushResult.results.length} results for entity type ${pushResult.entityType}`);

      for (const syncResult of pushResult.results) {
        const index = result.findIndex((e) => e.id === syncResult.entityId);
        if (index === -1) continue;

        syncLogger.verbose(`  → Push result for ${syncResult.entityId}: status=${syncResult.status}`);

        // Version check (for TodoService behavior)
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
          // Add to updated accumulator
          accumulator.updated.set(result[index].id, result[index]);
          syncLogger.verbose(`    → Entity ${syncResult.entityId} added to accumulator.updated`);

          // Clear pending flags
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
          // Track as confirmed
          accumulator.confirmed.add(syncResult.entityId);
          syncLogger.verbose(`    → Entity ${syncResult.entityId} added to accumulator.confirmed`);
        } else if (
          syncResult.status === 'server_version' &&
          syncResult.winner === 'server'
        ) {
          if (syncResult.serverVersionData) {
            const serverData = syncResult.serverVersionData
              .data as unknown as TServerData;
            const mergedEntity = this.config.fromServerData(serverData, {
              entityId: syncResult.entityId,
              homeId: result[index].homeId,
              updatedAt: syncResult.serverVersionData.updatedAt,
              version: syncResult.serverVersionData.version,
              clientUpdatedAt: result[index].clientUpdatedAt,
              serverTimestamp: response.serverTimestamp,
            });

            // Add to updated accumulator
            accumulator.updated.set(syncResult.entityId, mergedEntity as TEntity);
            syncLogger.verbose(`    → Entity ${syncResult.entityId} (server version) added to accumulator.updated`);

            result[index] = {
              ...mergedEntity,
              pendingCreate: false,
              pendingUpdate: false,
            } as TEntity;
          }
        } else if (syncResult.status === 'deleted') {
          // Add to deleted accumulator
          accumulator.deleted.add(syncResult.entityId);
          syncLogger.verbose(`    → Entity ${syncResult.entityId} added to accumulator.deleted`);

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

  /**
   * Process pull results and accumulate changes for delta tracking
   */
  protected processPullResultsToAccumulator(
    entities: TEntity[],
    response: BatchSyncResponse,
    accumulator: SyncAccumulator<TEntity>
  ): TEntity[] {
    if (!response.pullResults) return entities;

    const result = [...entities];
    syncLogger.verbose(`📥 Processing ${response.pullResults.length} pull results...`);

    for (const pullResult of response.pullResults) {
      if (pullResult.entityType !== this.config.entityType) continue;
      syncLogger.verbose(`📥 Processing ${pullResult.entities.length} entities from pull, ${pullResult.deletedEntityIds?.length || 0} deleted`);

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
          // Only update if no pending changes AND actually changed
          const current = result[index];
          const shouldUpdate =
            !current.pendingUpdate &&
            !current.pendingCreate &&
            !current.pendingDelete &&
            this.isEntityDifferent(current, newEntity);

          syncLogger.verbose(`  → Pull for ${entity.entityId}: index=${index}, shouldUpdate=${shouldUpdate}, pendingCreate=${current.pendingCreate}, pendingUpdate=${current.pendingUpdate}, pendingDelete=${current.pendingDelete}`);

          if (shouldUpdate) {
            // Preserve createdAt if configured
            if (this.config.preserveCreatedAtOnPull) {
              (newEntity as TEntity).createdAt =
                current.createdAt || newEntity.createdAt;
            }
            result[index] = { ...current, ...newEntity };

            // Add to updated accumulator
            accumulator.updated.set(entity.entityId, result[index]);
            syncLogger.verbose(`    → Entity ${entity.entityId} added to accumulator.updated from pull`);
          }
        } else {
          // New entity from server
          syncLogger.verbose(`  → New entity ${entity.entityId} from server`);
          result.push(newEntity);
          accumulator.created.set(entity.entityId, newEntity);
          syncLogger.verbose(`    → Entity ${entity.entityId} added to accumulator.created`);
        }
      }

      for (const deletedId of pullResult.deletedEntityIds) {
        const index = result.findIndex((e) => e.id === deletedId);
        if (index >= 0) {
          syncLogger.verbose(`  → Deleted entity ${deletedId} from server`);
          result[index] = {
            ...result[index],
            deletedAt: response.serverTimestamp,
            pendingDelete: false,
          } as TEntity;

          // Add to deleted accumulator
          accumulator.deleted.add(deletedId);
          syncLogger.verbose(`    → Entity ${deletedId} added to accumulator.deleted`);
        }
      }
    }

    return result;
  }

  /**
   * Build SyncDelta from accumulator
   */
  protected buildDelta(
    accumulator: SyncAccumulator<TEntity>,
    serverTimestamp: string,
    checkpoint?: Checkpoint
  ): SyncDelta<TEntity> {
    return {
      updated: Array.from(accumulator.updated.values()),
      created: Array.from(accumulator.created.values()),
      deleted: Array.from(accumulator.deleted),
      confirmed: Array.from(accumulator.confirmed),
      unchanged:
        accumulator.updated.size === 0 &&
        accumulator.created.size === 0 &&
        accumulator.deleted.size === 0,
      serverTimestamp,
      checkpoint,
    };
  }

  /**
   * Return empty delta (no changes)
   */
  protected emptyDelta(serverTimestamp: string): SyncDelta<TEntity> {
    return {
      updated: [],
      created: [],
      deleted: [],
      confirmed: [],
      unchanged: true,
      serverTimestamp,
    };
  }

  /**
   * Compare two entities for meaningful differences
   * Excludes sync metadata fields
   */
  protected isEntityDifferent(a: TEntity, b: TEntity): boolean {
    // Compare only business logic fields, not sync metadata
    const metaFields = [
      'pendingCreate', 'pendingUpdate', 'pendingDelete',
      'serverUpdatedAt', 'lastSyncedAt', 'version',
      'clientUpdatedAt'
    ];

    for (const key of Object.keys(a)) {
      if (metaFields.includes(key)) continue;
      if ((a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if there are any pending changes for the given home
   * @returns true if any entity has pendingCreate, pendingUpdate, or pendingDelete
   */
  async hasPendingChanges(homeId: string): Promise<boolean> {
    try {
      const entities = await this.getAllForSync(homeId);
      return entities.some(e => e.pendingCreate || e.pendingUpdate || e.pendingDelete);
    } catch (error) {
      syncLogger.error(`Error checking pending changes for ${this.config.entityName}:`, error);
      return false;
    }
  }
}
