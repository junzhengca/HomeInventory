import { InventoryItem } from '../types/inventory';
import { fileSystemService } from './FileSystemService';
import { generateItemId } from '../utils/idGenerator';
import { isExpiringSoon } from '../utils/dateUtils';
import { getEarliestExpiry } from '../utils/batchUtils';
import { ApiClient } from './ApiClient';
import {
  BatchSyncRequest,
  BatchSyncPullRequest,
  BatchSyncPushRequest,
  InventoryItemServerData
} from '../types/api';
import { syncLogger } from '../utils/Logger';
import Ionicons from '@expo/vector-icons/Ionicons';

const ITEMS_FILE = 'items.json';

interface ItemsData {
  items: InventoryItem[];
  lastSyncTime?: string;
  lastPulledVersion?: number;
}

class InventoryService {
  public constructor() {}

  /**
   * Get all inventory items (excluding deleted items)
   */
  async getAllItems(homeId: string): Promise<InventoryItem[]> {
    if (!homeId) {
      throw new Error('homeId is required for items');
    }
    const data = await fileSystemService.readFile<ItemsData>(ITEMS_FILE, homeId);
    const items = data?.items || [];
    return items.filter((item) => !item.deletedAt);
  }

  /**
   * Get all inventory items for sync (including deleted items)
   */
  async getAllItemsForSync(homeId: string): Promise<InventoryItem[]> {
    if (!homeId) {
      throw new Error('homeId is required for items sync');
    }
    const data = await fileSystemService.readFile<ItemsData>(ITEMS_FILE, homeId);
    return data?.items || [];
  }

  /**
   * Get a single item by ID (excluding deleted items)
   */
  async getItemById(id: string, homeId: string): Promise<InventoryItem | null> {
    if (!homeId) {
      throw new Error('homeId is required to get item by ID');
    }
    const items = await this.getAllItems(homeId);
    return items.find((item) => item.id === id && !item.deletedAt) || null;
  }

  /**
   * Create a new item
   */
  async createItem(item: Omit<InventoryItem, 'id'>, homeId: string): Promise<InventoryItem | null> {
    try {
      if (!homeId) {
        throw new Error('homeId is required to create item');
      }
      const data = await fileSystemService.readFile<ItemsData>(ITEMS_FILE, homeId);
      const items = data?.items || [];
      const now = new Date().toISOString();
      const newItem: InventoryItem = {
        ...item,
        status: item.status || 'using', // Default to 'using' if not provided
        id: generateItemId(),
        createdAt: now,
        updatedAt: now,

        // Sync metadata
        version: 1,
        clientUpdatedAt: now,
        pendingCreate: true,
      };

      items.push(newItem);
      const success = await fileSystemService.writeFile<ItemsData>(ITEMS_FILE, { ...data, items }, homeId);

      return success ? newItem : null;
    } catch (error) {
      syncLogger.error('Error creating item:', error);
      return null;
    }
  }

  /**
   * Update an existing item
   */
  async updateItem(
    id: string,
    updates: Partial<Omit<InventoryItem, 'id'>>,
    homeId: string
  ): Promise<InventoryItem | null> {
    try {
      if (!homeId) {
        throw new Error('homeId is required to update item');
      }
      syncLogger.info(`updateItem called with id: ${id}`, updates);
      const data = await fileSystemService.readFile<ItemsData>(ITEMS_FILE, homeId);
      const items = data?.items || [];
      const index = items.findIndex((item) => item.id === id);

      if (index === -1) {
        return null;
      }

      const now = new Date().toISOString();
      const isPendingCreate = items[index].pendingCreate;

      items[index] = {
        ...items[index],
        ...updates,
        updatedAt: now,
        // Sync metadata
        version: items[index].version + 1,
        clientUpdatedAt: now,
        pendingUpdate: !isPendingCreate, // If it's pending create, it stays pending create
      };
      syncLogger.info('Updated item to be written:', items[index]);
      const success = await fileSystemService.writeFile<ItemsData>(ITEMS_FILE, { ...data, items }, homeId);

      return success ? items[index] : null;
    } catch (error) {
      syncLogger.error('Error updating item:', error);
      return null;
    }
  }

  /**
   * Delete an item (soft delete - sets deletedAt timestamp)
   */
  async deleteItem(id: string, homeId: string): Promise<boolean> {
    try {
      if (!homeId) {
        throw new Error('homeId is required to delete item');
      }
      const data = await fileSystemService.readFile<ItemsData>(ITEMS_FILE, homeId);
      const items = data?.items || [];
      const index = items.findIndex((item) => item.id === id);

      if (index === -1) {
        return false; // Item not found
      }

      // If already deleted, return true (idempotent)
      if (items[index].deletedAt) {
        return true;
      }

      // Soft delete: set deletedAt and update updatedAt
      const now = new Date().toISOString();
      const isPendingCreate = items[index].pendingCreate;

      if (isPendingCreate) {
        // If it was never synced, just hard delete it
        items.splice(index, 1);
      } else {
        items[index] = {
          ...items[index],
          deletedAt: now,
          updatedAt: now,
          version: items[index].version + 1,
          clientUpdatedAt: now,
          pendingDelete: true,
          pendingUpdate: false, // delete overrides update
        };
      }

      const success = await fileSystemService.writeFile<ItemsData>(ITEMS_FILE, { ...data, items }, homeId);

      return success;
    } catch (error) {
      syncLogger.error('Error deleting item:', error);
      return false;
    }
  }

  /**
   * Search and filter items
   */
  async searchItems(
    homeId: string,
    query?: string,
    filters?: {
      expiringSoon?: boolean; // Items expiring within 7 days
    }
  ): Promise<InventoryItem[]> {
    let items = await this.getAllItems(homeId); // Already filters out deleted items

    // Filter by expiring soon
    if (filters?.expiringSoon) {
      items = items.filter((item) => {
        const earliestExpiry = getEarliestExpiry(item.batches || []);
        return earliestExpiry ? isExpiringSoon(earliestExpiry) : false;
      });
    }

    // Search by query
    if (query && query.trim()) {
      const lowerQuery = query.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(lowerQuery) ||
          item.location.toLowerCase().includes(lowerQuery) ||
          item.detailedLocation.toLowerCase().includes(lowerQuery)
      );
    }

    return items;
  }

  /**
   * Sync items with server
   */
  async syncItems(
    homeId: string,
    apiClient: ApiClient,
    deviceId: string
  ): Promise<void> {
    syncLogger.info('Starting item sync...');
    try {
      const data = await fileSystemService.readFile<ItemsData>(ITEMS_FILE, homeId);
      let items = data?.items || [];
      const lastSyncTime = data?.lastSyncTime;
      const lastPulledVersion = data?.lastPulledVersion || 0;

      // 1. Prepare Push Requests
      const pendingItems = items.filter(t => t.pendingCreate || t.pendingUpdate || t.pendingDelete);
      const pushRequests: BatchSyncPushRequest[] = [];

      if (pendingItems.length > 0) {
        syncLogger.info(`Pushing ${pendingItems.length} pending items`);
        pushRequests.push({
          entityType: 'inventoryItems',
          entities: pendingItems.map(t => ({
            entityId: t.id,
            entityType: 'inventoryItems',
            homeId: homeId,
            data: {
              id: t.id,
              name: t.name,
              location: t.location,
              detailedLocation: t.detailedLocation,
              status: t.status,
              icon: t.icon,
              iconColor: t.iconColor,
              warningThreshold: t.warningThreshold,
              batches: t.batches,
              categoryId: t.categoryId,
            },
            version: t.version,
            clientUpdatedAt: t.clientUpdatedAt,
            pendingCreate: t.pendingCreate,
            pendingDelete: t.pendingDelete,
          })),
          lastPulledAt: lastSyncTime,
          checkpoint: { lastPulledVersion }
        });
      }

      // 2. Prepare Pull Request
      const pullRequests: BatchSyncPullRequest[] = [{
        entityType: 'inventoryItems',
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

      // CRITICAL FIX: Re-read data before applying results to capture any local changes
      // that happened while we were waiting for the server response
      const freshData = await fileSystemService.readFile<ItemsData>(ITEMS_FILE, homeId);
      if (freshData?.items) {
        // Update our local reference to the fresh data
        items = freshData.items;
      }

      // 4. Process Push Results
      if (response.pushResults) {
        for (const pushResult of response.pushResults) {
          if (pushResult.entityType === 'inventoryItems') {
            for (const result of pushResult.results) {
              const index = items.findIndex(t => t.id === result.entityId);
              if (index === -1) continue;

              if (result.status === 'created' || result.status === 'updated') {
                items[index] = {
                  ...items[index],
                  pendingCreate: false,
                  pendingUpdate: false,
                  pendingDelete: false,
                  serverUpdatedAt: result.serverUpdatedAt,
                  lastSyncedAt: response.serverTimestamp,
                };
                if (result.status === 'created' && result.serverVersion) {
                  items[index].version = result.serverVersion;
                }
              } else if (result.status === 'server_version' && result.winner === 'server') {
                // Server won, update local with server data
                if (result.serverVersionData) {
                  const serverData = result.serverVersionData.data as unknown as InventoryItemServerData;
                  items[index] = {
                    ...items[index],
                    name: serverData.name,
                    location: serverData.location,
                    detailedLocation: serverData.detailedLocation,
                    status: serverData.status,
                    icon: serverData.icon as keyof typeof Ionicons.glyphMap,
                    iconColor: serverData.iconColor,
                    warningThreshold: serverData.warningThreshold,
                    batches: serverData.batches || [],
                    categoryId: serverData.categoryId,
                    version: result.serverVersionData.version,
                    serverUpdatedAt: result.serverVersionData.updatedAt,
                    lastSyncedAt: response.serverTimestamp,
                    pendingCreate: false,
                    pendingUpdate: false,
                  };
                }
              } else if (result.status === 'deleted') {
                // Confirmed deletion
                items[index] = {
                  ...items[index],
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
          if (pullResult.entityType === 'inventoryItems') {
            // Handle new/updated entities
            for (const entity of pullResult.entities) {
              const index = items.findIndex(t => t.id === entity.entityId);
              const serverData = entity.data as unknown as InventoryItemServerData;

              const newItem: InventoryItem = {
                id: entity.entityId,
                name: serverData.name,
                homeId: entity.homeId,
                location: serverData.location,
                detailedLocation: serverData.detailedLocation,
                status: serverData.status,
                icon: serverData.icon as keyof typeof Ionicons.glyphMap,
                iconColor: serverData.iconColor,
                warningThreshold: serverData.warningThreshold,
                batches: serverData.batches || [],
                categoryId: serverData.categoryId,
                createdAt: entity.updatedAt, // Approximate if new
                updatedAt: entity.updatedAt,
                version: entity.version,
                serverUpdatedAt: entity.updatedAt,
                clientUpdatedAt: entity.clientUpdatedAt,
                lastSyncedAt: response.serverTimestamp,
              };

              if (index >= 0) {
                if (!items[index].pendingUpdate && !items[index].pendingCreate && !items[index].pendingDelete) {
                  items[index] = { ...items[index], ...newItem };
                }
              } else {
                items.push(newItem);
              }
            }

            // Handle deleted entities
            for (const deletedId of pullResult.deletedEntityIds) {
              const index = items.findIndex(t => t.id === deletedId);
              if (index >= 0) {
                items[index] = {
                  ...items[index],
                  deletedAt: response.serverTimestamp, // Mark deleted
                  pendingDelete: false // Server told us it's deleted
                };
              }
            }
          }
        }
      }

      // 6. Save changes
      const checkPoint = response.pullResults?.find(r => r.entityType === 'inventoryItems')?.checkpoint;
      const newLastPulledVersion = checkPoint?.lastPulledVersion ?? lastPulledVersion;

      await fileSystemService.writeFile<ItemsData>(ITEMS_FILE, {
        items,
        lastSyncTime: response.serverTimestamp,
        lastPulledVersion: newLastPulledVersion
      }, homeId);

      syncLogger.info('Item sync complete');

    } catch (error) {
      syncLogger.error('Error syncing items:', error);
    }
  }
}

export const inventoryService = new InventoryService();
export type { InventoryService };
