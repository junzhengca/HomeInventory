import { Category } from '../types/inventory';
import { readFile, writeFile } from './FileSystemService';
import { generateItemId } from '../utils/idGenerator';
import { ApiClient } from './ApiClient';
import {
  BatchSyncRequest,
  BatchSyncPullRequest,
  BatchSyncPushRequest,
  CategoryServerData
} from '../types/api';
import { syncLogger } from '../utils/Logger';
import Ionicons from '@expo/vector-icons/Ionicons';

const CATEGORIES_FILE = 'categories.json';

interface CategoriesData {
  categories: Category[];
  lastSyncTime?: string;
  lastPulledVersion?: number;
}

/**
 * Get all categories (excluding deleted items)
 */
export const getAllCategories = async (homeId: string): Promise<Category[]> => {
  if (!homeId) {
    throw new Error('homeId is required for categories');
  }
  const data = await readFile<CategoriesData>(CATEGORIES_FILE, homeId);
  const categories = data?.categories || [];
  return categories.filter((cat) => !cat.deletedAt);
};

/**
 * Get a single category by ID
 */
export const getCategoryById = async (id: string, homeId: string): Promise<Category | null> => {
  if (!homeId) {
    throw new Error('homeId is required to get category by ID');
  }
  const categories = await getAllCategories(homeId);
  return categories.find((cat) => cat.id === id) || null;
};

/**
 * Create a new category
 */
export const createCategory = async (category: Omit<Category, 'id' | 'version' | 'clientUpdatedAt' | 'homeId'>, homeId: string): Promise<Category | null> => {
  try {
    if (!homeId) {
      throw new Error('homeId is required to create category');
    }
    const data = await readFile<CategoriesData>(CATEGORIES_FILE, homeId);
    const categories = data?.categories || [];
    const now = new Date().toISOString();

    const newCategory: Category = {
      ...category,
      homeId,
      id: generateItemId(),
      createdAt: now,
      updatedAt: now,

      // Sync metadata
      version: 1,
      clientUpdatedAt: now,
      pendingCreate: true,
      pendingUpdate: false,
      pendingDelete: false
    };

    categories.push(newCategory);
    const success = await writeFile<CategoriesData>(CATEGORIES_FILE, { ...data, categories }, homeId);

    return success ? newCategory : null;
  } catch (error) {
    syncLogger.error('Error creating category:', error);
    return null;
  }
};

/**
 * Update an existing category
 */
export const updateCategory = async (
  id: string,
  updates: Partial<Omit<Category, 'id' | 'version' | 'clientUpdatedAt'>>,
  homeId: string
): Promise<Category | null> => {
  try {
    if (!homeId) {
      throw new Error('homeId is required to update category');
    }
    const data = await readFile<CategoriesData>(CATEGORIES_FILE, homeId);
    const categories = data?.categories || [];
    const index = categories.findIndex((cat) => cat.id === id);

    if (index === -1) {
      return null;
    }

    const now = new Date().toISOString();
    const isPendingCreate = categories[index].pendingCreate;

    categories[index] = {
      ...categories[index],
      ...updates,
      updatedAt: now,
      // Sync metadata
      version: categories[index].version + 1,
      clientUpdatedAt: now,
      pendingUpdate: !isPendingCreate, // If it's pending create, it stays pending create
    };

    const success = await writeFile<CategoriesData>(CATEGORIES_FILE, { ...data, categories }, homeId);
    return success ? categories[index] : null;

  } catch (error) {
    syncLogger.error('Error updating category:', error);
    return null;
  }
};

/**
 * Delete a category (soft delete)
 */
export const deleteCategory = async (id: string, homeId: string): Promise<boolean> => {
  try {
    if (!homeId) {
      throw new Error('homeId is required to delete category');
    }
    const data = await readFile<CategoriesData>(CATEGORIES_FILE, homeId);
    const categories = data?.categories || [];
    const index = categories.findIndex((cat) => cat.id === id);

    if (index === -1) {
      return false;
    }

    if (categories[index].deletedAt) {
      return true;
    }

    const now = new Date().toISOString();
    const isPendingCreate = categories[index].pendingCreate;

    if (isPendingCreate) {
      categories.splice(index, 1);
    } else {
      categories[index] = {
        ...categories[index],
        deletedAt: now,
        updatedAt: now,
        version: categories[index].version + 1,
        clientUpdatedAt: now,
        pendingDelete: true,
        pendingUpdate: false,
      };
    }

    return await writeFile<CategoriesData>(CATEGORIES_FILE, { ...data, categories }, homeId);

  } catch (error) {
    syncLogger.error('Error deleting category:', error);
    return false;
  }
};

/**
 * Sync categories with server
 */
export const syncCategories = async (
  homeId: string,
  apiClient: ApiClient,
  deviceId: string
): Promise<void> => {
  syncLogger.info('Starting category sync...');
  try {
    const data = await readFile<CategoriesData>(CATEGORIES_FILE, homeId);
    const categories = data?.categories || [];
    const lastSyncTime = data?.lastSyncTime;
    const lastPulledVersion = data?.lastPulledVersion || 0;

    // 1. Prepare Push Requests
    const pendingCategories = categories.filter(c => c.pendingCreate || c.pendingUpdate || c.pendingDelete);
    const pushRequests: BatchSyncPushRequest[] = [];

    if (pendingCategories.length > 0) {
      syncLogger.info(`Pushing ${pendingCategories.length} pending categories`);
      pushRequests.push({
        entityType: 'categories',
        entities: pendingCategories.map(c => ({
          entityId: c.id,
          entityType: 'categories',
          homeId: homeId,
          data: {
            id: c.id,
            name: c.name,
            icon: c.icon,
            color: c.color,
            isCustom: c.isCustom,
            label: c.label
          },
          version: c.version,
          clientUpdatedAt: c.clientUpdatedAt,
          pendingCreate: c.pendingCreate,
          pendingDelete: c.pendingDelete,
        })),
        lastPulledAt: lastSyncTime,
        checkpoint: { lastPulledVersion }
      });
    }

    // 2. Prepare Pull Request
    const pullRequests: BatchSyncPullRequest[] = [{
      entityType: 'categories',
      since: lastSyncTime,
      includeDeleted: true,
      checkpoint: { lastPulledVersion }
    }];

    // 3. Perform Batch Sync
    const batchRequest: BatchSyncRequest = {
      homeId,
      deviceId,
      pullRequests,
      pushRequests: pushRequests.length > 0 ? pushRequests : undefined
    };

    const response = await apiClient.batchSync(batchRequest);

    if (!response.success) {
      syncLogger.error('Sync failed:', response);
      return;
    }

    // 4. Process Push Results
    if (response.pushResults) {
      for (const pushResult of response.pushResults) {
        if (pushResult.entityType === 'categories') {
          for (const result of pushResult.results) {
            const index = categories.findIndex(c => c.id === result.entityId);
            if (index === -1) continue;

            if (result.status === 'created' || result.status === 'updated') {
              categories[index] = {
                ...categories[index],
                pendingCreate: false,
                pendingUpdate: false,
                pendingDelete: false,
                serverUpdatedAt: result.serverUpdatedAt,
                lastSyncedAt: response.serverTimestamp,
              };
              if (result.status === 'created' && result.serverVersion) {
                categories[index].version = result.serverVersion;
              }
            } else if (result.status === 'server_version' && result.winner === 'server') {
              if (result.serverVersionData) {
                const serverData = result.serverVersionData.data as unknown as CategoryServerData;
                categories[index] = {
                  ...categories[index],
                  name: serverData.name,
                  icon: serverData.icon as keyof typeof Ionicons.glyphMap | undefined,
                  color: serverData.color,
                  isCustom: serverData.isCustom,
                  label: serverData.label,
                  version: result.serverVersionData.version,
                  serverUpdatedAt: result.serverVersionData.updatedAt,
                  lastSyncedAt: response.serverTimestamp,
                  pendingCreate: false,
                  pendingUpdate: false,
                };
              }
            } else if (result.status === 'deleted') {
              categories[index] = {
                ...categories[index],
                pendingDelete: false,
                lastSyncedAt: response.serverTimestamp
              };
            }
          }
        }
      }
    }

    // 5. Process Pull Results
    if (response.pullResults) {
      for (const pullResult of response.pullResults) {
        if (pullResult.entityType === 'categories') {
          for (const entity of pullResult.entities) {
            const index = categories.findIndex(c => c.id === entity.entityId);
            const serverData = entity.data as unknown as CategoryServerData;

            const newCategory: Category = {
              id: entity.entityId,
              homeId: homeId,
              name: serverData.name,
              icon: serverData.icon as keyof typeof Ionicons.glyphMap | undefined,
              color: serverData.color,
              isCustom: serverData.isCustom,
              label: serverData.label,
              // Common fields
              createdAt: entity.updatedAt, // Approximate
              updatedAt: entity.updatedAt,
              version: entity.version,
              serverUpdatedAt: entity.updatedAt,
              clientUpdatedAt: entity.clientUpdatedAt,
              lastSyncedAt: response.serverTimestamp,
            };

            if (index >= 0) {
              if (!categories[index].pendingUpdate && !categories[index].pendingCreate && !categories[index].pendingDelete) {
                categories[index] = { ...categories[index], ...newCategory };
              }
            } else {
              categories.push(newCategory);
            }
          }

          for (const deletedId of pullResult.deletedEntityIds) {
            const index = categories.findIndex(c => c.id === deletedId);
            if (index >= 0) {
              categories[index] = {
                ...categories[index],
                deletedAt: response.serverTimestamp,
                pendingDelete: false
              };
            }
          }
        }
      }
    }

    // 6. Save changes
    const checkPoint = response.pullResults?.find(r => r.entityType === 'categories')?.checkpoint;
    const newLastPulledVersion = checkPoint?.lastPulledVersion ?? lastPulledVersion;

    await writeFile<CategoriesData>(CATEGORIES_FILE, {
      categories,
      lastSyncTime: response.serverTimestamp,
      lastPulledVersion: newLastPulledVersion
    }, homeId);

    syncLogger.info('Category sync complete');

  } catch (error) {
    syncLogger.error('Error syncing categories:', error);
  }
};
