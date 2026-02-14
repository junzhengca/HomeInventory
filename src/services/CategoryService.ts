import { Category } from '../types/inventory';
import {
  BaseSyncableEntityService,
  SyncableEntityConfig,
  CreateEntityInput,
} from './syncable/BaseSyncableEntityService';
import { generateItemId } from '../utils/idGenerator';
import { ApiClient } from './ApiClient';
import { CategoryServerData, SyncEntityType } from '../types/api';
import { SyncDelta } from '../types/sync';
import Ionicons from '@expo/vector-icons/Ionicons';

// Base file name (FileSystemService appends _homeId for scoping)
const CATEGORIES_FILE = 'categories.json';
const ENTITY_TYPE: SyncEntityType = 'categories';

interface CreateCategoryInput {
  name: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  label?: string;
}

// Type for the create method - matches old Omit<Category, 'id' | 'version' | 'clientUpdatedAt' | 'homeId'>
export type CreateCategoryMethodInput = Omit<Category, 'id' | 'version' | 'clientUpdatedAt' | 'homeId'>;

class CategoryService extends BaseSyncableEntityService<Category, CategoryServerData> {
  constructor() {
    const config: SyncableEntityConfig<Category, CategoryServerData> = {
      entityType: ENTITY_TYPE,
      fileName: CATEGORIES_FILE,
      entityName: 'category',

      generateId: generateItemId,

      toServerData: (category) => ({
        id: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        isCustom: category.isCustom,
        label: category.label,
        homeId: category.homeId,
      }),

      fromServerData: (serverData, meta) => ({
        id: meta.entityId,
        homeId: meta.homeId,
        name: serverData.name,
        icon: serverData.icon as keyof typeof Ionicons.glyphMap | undefined,
        color: serverData.color,
        isCustom: serverData.isCustom,
        label: serverData.label,
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
          icon: category.icon,
          color: category.color,
          isCustom: category.isCustom,
          label: category.label,
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

  // Method aliases for backward compatibility with components
  async getAllCategories(homeId: string): Promise<Category[]> {
    return this.getAll(homeId);
  }

  async getCategoryById(id: string, homeId: string): Promise<Category | null> {
    return this.getById(id, homeId);
  }

  async createCategory(
    input: CreateCategoryMethodInput,
    homeId: string
  ): Promise<Category | null> {
    return this.create(input as CreateEntityInput<Category>, homeId);
  }

  async updateCategory(
    id: string,
    updates: Partial<Omit<Category, 'id' | 'version' | 'clientUpdatedAt'>>,
    homeId: string
  ): Promise<Category | null> {
    return this.update(id, updates, homeId);
  }

  async deleteCategory(id: string, homeId: string): Promise<boolean> {
    return this.delete(id, homeId);
  }

  async syncCategories(
    homeId: string,
    apiClient: ApiClient,
    deviceId: string
  ): Promise<SyncDelta<Category>> {
    return this.sync(homeId, apiClient, deviceId);
  }
}

export const categoryService = new CategoryService();
export type { CategoryService, CreateCategoryInput };
