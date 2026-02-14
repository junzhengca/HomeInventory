import { TodoCategory } from '../types/inventory';
import {
  BaseSyncableEntityService,
  SyncableEntityConfig,
  CreateEntityInput,
} from './syncable/BaseSyncableEntityService';
import { generateItemId } from '../utils/idGenerator';
import { ApiClient } from './ApiClient';
import { TodoCategoryServerData, SyncEntityType } from '../types/api';
import { SyncDelta } from '../types/sync';
import { syncLogger } from '../utils/Logger';

// Base file name (FileSystemService appends _homeId for scoping)
const TODO_CATEGORIES_FILE = 'todo_categories.json';
const ENTITY_TYPE: SyncEntityType = 'todoCategories';

interface CreateTodoCategoryInput {
  name: string;
}

class TodoCategoryService extends BaseSyncableEntityService<
  TodoCategory,
  TodoCategoryServerData
> {
  constructor() {
    const config: SyncableEntityConfig<TodoCategory, TodoCategoryServerData> = {
      entityType: ENTITY_TYPE,
      fileName: TODO_CATEGORIES_FILE,
      entityName: 'todo category',

      generateId: generateItemId,

      toServerData: (category) => ({
        id: category.id,
        name: category.name,
        homeId: category.homeId,
      }),

      fromServerData: (serverData, meta) => ({
        id: meta.entityId,
        homeId: meta.homeId,
        name: serverData.name,
        createdAt: meta.updatedAt,
        updatedAt: meta.updatedAt,
        version: meta.version,
        serverUpdatedAt: meta.updatedAt,
        clientUpdatedAt: meta.clientUpdatedAt,
        lastSyncedAt: meta.serverTimestamp,
      }),

      toSyncEntity: (category, homeId) => ({
        entityId: category.id,
        entityType: ENTITY_TYPE,
        homeId,
        data: {
          id: category.id,
          name: category.name,
        },
        version: category.version,
        clientUpdatedAt: category.clientUpdatedAt,
        pendingCreate: !!category.pendingCreate,
        pendingDelete: !!category.pendingDelete,
      }),

      createEntity: (input, homeId, id, now) => ({
        ...input,
        homeId,
        id,
        createdAt: now,
        updatedAt: now,
        version: 1,
        clientUpdatedAt: now,
        pendingCreate: true,
        pendingUpdate: false,
        pendingDelete: false,
      }),

      applyUpdate: (entity, updates, now) => ({
        ...entity,
        ...updates,
        updatedAt: now,
        version: entity.version + 1,
        clientUpdatedAt: now,
      }),
    };

    super(config);
  }

  /**
   * Initialize default todo categories for a home
   */
  async initializeDefaultCategories(
    defaultCategories: Omit<TodoCategory, 'homeId'>[],
    homeId: string,
    getLocalizedNames: () => Record<string, string>
  ): Promise<void> {
    try {
      const data = await this.readFile();
      const categories = data?.categories || [];

      // Check which default categories are missing
      const existingIds = new Set(categories.map((cat) => cat.id));
      const missingCategories = defaultCategories.filter(
        (cat) => !existingIds.has(cat.id)
      );

      if (missingCategories.length > 0) {
        const localizedNames = getLocalizedNames();
        const now = new Date().toISOString();

        const newCategories = missingCategories.map((cat) => ({
          ...cat,
          homeId,
          name: localizedNames[cat.id] || cat.name,
          createdAt: now,
          updatedAt: now,
          pendingCreate: true,
        }));

        const updatedCategories = [...categories, ...newCategories];
        await this.writeFile(
          {
            categories: updatedCategories,
            lastSyncTime: data?.lastSyncTime,
            lastPulledVersion: data?.lastPulledVersion,
          },
          homeId
        );

        syncLogger.info(
          `Initialized ${newCategories.length} default todo categories for home ${homeId}`
        );
      }
    } catch (error) {
      syncLogger.error('Error initializing default todo categories:', error);
      throw error;
    }
  }

  /**
   * Relocalize default todo categories when language changes
   */
  async relocalizeDefaultCategories(
    defaultCategoryIds: string[],
    homeId: string,
    getLocalizedNames: () => Record<string, string>
  ): Promise<void> {
    try {
      const data = await this.readFile();
      const categories = data?.categories || [];
      const localizedNames = getLocalizedNames();

      const updatedCategories = categories.map((cat) => {
        const isDefault = defaultCategoryIds.includes(cat.id);
        if (isDefault) {
          const localizedName = localizedNames[cat.id];
          if (localizedName && cat.name !== localizedName) {
            const now = new Date().toISOString();
            return {
              ...cat,
              name: localizedName,
              updatedAt: now,
              version: cat.version + 1,
              clientUpdatedAt: now,
              pendingUpdate: !cat.pendingCreate,
            };
          }
        }
        return cat;
      });

      await this.writeFile(
        {
          categories: updatedCategories,
          lastSyncTime: data?.lastSyncTime,
          lastPulledVersion: data?.lastPulledVersion,
        },
        homeId
      );

      syncLogger.info(`Relocalized todo categories for home ${homeId}`);
    } catch (error) {
      syncLogger.error('Error relocalizing todo categories:', error);
      throw error;
    }
  }

  // Method aliases for backward compatibility with components
  async getAllCategories(homeId: string): Promise<TodoCategory[]> {
    return this.getAll(homeId);
  }

  async getCategoryById(id: string, homeId: string): Promise<TodoCategory | null> {
    return this.getById(id, homeId);
  }

  async createCategory(
    input: CreateTodoCategoryInput,
    homeId: string
  ): Promise<TodoCategory | null> {
    return this.create(input, homeId);
  }

  async updateCategory(
    id: string,
    updates: Partial<Omit<TodoCategory, 'id' | 'version' | 'clientUpdatedAt'>>,
    homeId: string
  ): Promise<TodoCategory | null> {
    return this.update(id, updates, homeId);
  }

  async deleteCategory(id: string, homeId: string): Promise<boolean> {
    return this.delete(id, homeId);
  }

  async syncCategories(
    homeId: string,
    apiClient: ApiClient,
    deviceId: string
  ): Promise<SyncDelta<TodoCategory>> {
    return this.sync(homeId, apiClient, deviceId);
  }
}

export const todoCategoryService = new TodoCategoryService();
export type { TodoCategoryService, CreateTodoCategoryInput };
