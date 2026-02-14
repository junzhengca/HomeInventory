import { TodoCategory } from '../types/inventory';
import { readFile, writeFile } from './FileSystemService';
import { generateItemId } from '../utils/idGenerator';
import { ApiClient } from './ApiClient';
import {
  BatchSyncRequest,
  BatchSyncPullRequest,
  BatchSyncPushRequest,
  TodoCategoryServerData
} from '../types/api';
import { syncLogger } from '../utils/Logger';

const TODO_CATEGORIES_FILE = 'todo_categories.json';

interface TodoCategoriesData {
  categories: TodoCategory[];
  lastSyncTime?: string;
  lastPulledVersion?: number;
}

/**
 * Get all todo categories (excluding deleted items)
 */
export const getAllCategories = async (homeId: string): Promise<TodoCategory[]> => {
  if (!homeId) {
    throw new Error('homeId is required for todo categories');
  }
  const data = await readFile<TodoCategoriesData>(TODO_CATEGORIES_FILE, homeId);
  const categories = data?.categories || [];
  return categories.filter((cat) => !cat.deletedAt);
};

/**
 * Get a single todo category by ID
 */
export const getCategoryById = async (id: string, homeId: string): Promise<TodoCategory | null> => {
  if (!homeId) {
    throw new Error('homeId is required to get todo category by ID');
  }
  const categories = await getAllCategories(homeId);
  return categories.find((cat) => cat.id === id) || null;
};

/**
 * Create a new todo category
 */
export const createCategory = async (category: Omit<TodoCategory, 'id' | 'version' | 'clientUpdatedAt' | 'homeId'>, homeId: string): Promise<TodoCategory | null> => {
  try {
    if (!homeId) {
      throw new Error('homeId is required to create todo category');
    }
    const data = await readFile<TodoCategoriesData>(TODO_CATEGORIES_FILE, homeId);
    const categories = data?.categories || [];
    const now = new Date().toISOString();

    const newCategory: TodoCategory = {
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
    const success = await writeFile<TodoCategoriesData>(TODO_CATEGORIES_FILE, { ...data, categories }, homeId);

    return success ? newCategory : null;
  } catch (error) {
    syncLogger.error('Error creating todo category:', error);
    return null;
  }
};

/**
 * Update an existing todo category
 */
export const updateCategory = async (
  id: string,
  updates: Partial<Omit<TodoCategory, 'id' | 'version' | 'clientUpdatedAt'>>,
  homeId: string
): Promise<TodoCategory | null> => {
  try {
    if (!homeId) {
      throw new Error('homeId is required to update todo category');
    }
    const data = await readFile<TodoCategoriesData>(TODO_CATEGORIES_FILE, homeId);
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

    const success = await writeFile<TodoCategoriesData>(TODO_CATEGORIES_FILE, { ...data, categories }, homeId);
    return success ? categories[index] : null;

  } catch (error) {
    syncLogger.error('Error updating todo category:', error);
    return null;
  }
};

/**
 * Delete a todo category (soft delete)
 */
export const deleteCategory = async (id: string, homeId: string): Promise<boolean> => {
  try {
    if (!homeId) {
      throw new Error('homeId is required to delete todo category');
    }
    const data = await readFile<TodoCategoriesData>(TODO_CATEGORIES_FILE, homeId);
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

    return await writeFile<TodoCategoriesData>(TODO_CATEGORIES_FILE, { ...data, categories }, homeId);

  } catch (error) {
    syncLogger.error('Error deleting todo category:', error);
    return false;
  }
};

/**
 * Initialize default todo categories for a home
 */
export const initializeDefaultCategories = async (
  defaultCategories: Omit<TodoCategory, 'homeId'>[],
  homeId: string,
  getLocalizedNames: () => Record<string, string>
): Promise<void> => {
  try {
    const data = await readFile<TodoCategoriesData>(TODO_CATEGORIES_FILE, homeId);
    const categories = data?.categories || [];

    // Check which default categories are missing
    const existingIds = new Set(categories.map(cat => cat.id));
    const missingCategories = defaultCategories.filter(cat => !existingIds.has(cat.id));

    if (missingCategories.length > 0) {
      const localizedNames = getLocalizedNames();
      const now = new Date().toISOString();

      const newCategories = missingCategories.map(cat => ({
        ...cat,
        homeId,
        name: localizedNames[cat.id] || cat.name,
        createdAt: now,
        updatedAt: now,
        pendingCreate: true,
      }));

      const updatedCategories = [...categories, ...newCategories];
      await writeFile<TodoCategoriesData>(TODO_CATEGORIES_FILE, {
        categories: updatedCategories,
        lastSyncTime: data?.lastSyncTime,
        lastPulledVersion: data?.lastPulledVersion
      }, homeId);

      syncLogger.info(`Initialized ${newCategories.length} default todo categories for home ${homeId}`);
    }
  } catch (error) {
    syncLogger.error('Error initializing default todo categories:', error);
    throw error;
  }
};

/**
 * Relocalize default todo categories when language changes
 */
export const relocalizeDefaultCategories = async (
  defaultCategoryIds: string[],
  homeId: string,
  getLocalizedNames: () => Record<string, string>
): Promise<void> => {
  try {
    const data = await readFile<TodoCategoriesData>(TODO_CATEGORIES_FILE, homeId);
    const categories = data?.categories || [];
    const localizedNames = getLocalizedNames();

    const updatedCategories = categories.map(cat => {
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

    await writeFile<TodoCategoriesData>(TODO_CATEGORIES_FILE, {
      categories: updatedCategories,
      lastSyncTime: data?.lastSyncTime,
      lastPulledVersion: data?.lastPulledVersion
    }, homeId);

    syncLogger.info(`Relocalized todo categories for home ${homeId}`);

  } catch (error) {
    syncLogger.error('Error relocalizing todo categories:', error);
    throw error;
  }
};

/**
 * Sync todo categories with server
 */
export const syncCategories = async (
  homeId: string,
  apiClient: ApiClient,
  deviceId: string
): Promise<void> => {
  syncLogger.info('Starting todo category sync...');
  try {
    const data = await readFile<TodoCategoriesData>(TODO_CATEGORIES_FILE, homeId);
    let categories = data?.categories || [];
    const lastSyncTime = data?.lastSyncTime;
    const lastPulledVersion = data?.lastPulledVersion || 0;

    // 1. Prepare Push Requests
    const pendingCategories = categories.filter(c => c.pendingCreate || c.pendingUpdate || c.pendingDelete);
    const pushRequests: BatchSyncPushRequest[] = [];

    if (pendingCategories.length > 0) {
      syncLogger.info(`Pushing ${pendingCategories.length} pending todo categories`);
      pushRequests.push({
        entityType: 'todoCategories',
        entities: pendingCategories.map(c => ({
          entityId: c.id,
          entityType: 'todoCategories',
          homeId: homeId,
          data: {
            id: c.id,
            name: c.name
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
      entityType: 'todoCategories',
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
      syncLogger.error('Todo category sync failed:', response);
      return;
    }

    // CRITICAL FIX: Re-read data before applying results to capture any local changes
    // that happened while we were waiting for the server response
    const freshData = await readFile<TodoCategoriesData>(TODO_CATEGORIES_FILE, homeId);
    if (freshData?.categories) {
      // Update our local reference to the fresh data
      categories = freshData.categories;
    }

    // 4. Process Push Results
    if (response.pushResults) {
      for (const pushResult of response.pushResults) {
        if (pushResult.entityType === 'todoCategories') {
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
                const serverData = result.serverVersionData.data as unknown as TodoCategoryServerData;
                categories[index] = {
                  ...categories[index],
                  name: serverData.name,
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
        if (pullResult.entityType === 'todoCategories') {
          for (const entity of pullResult.entities) {
            const index = categories.findIndex(c => c.id === entity.entityId);
            const serverData = entity.data as unknown as TodoCategoryServerData;

            const newCategory: TodoCategory = {
              id: entity.entityId,
              homeId: homeId,
              name: serverData.name,
              // Common fields
              createdAt: entity.updatedAt,
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
    const checkPoint = response.pullResults?.find(r => r.entityType === 'todoCategories')?.checkpoint;
    const newLastPulledVersion = checkPoint?.lastPulledVersion ?? lastPulledVersion;

    await writeFile<TodoCategoriesData>(TODO_CATEGORIES_FILE, {
      categories,
      lastSyncTime: response.serverTimestamp,
      lastPulledVersion: newLastPulledVersion
    }, homeId);

    syncLogger.info('Todo category sync complete');

  } catch (error) {
    syncLogger.error('Error syncing todo categories:', error);
  }
};
