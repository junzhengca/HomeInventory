import { InventoryItem, ItemBatch } from '../types/inventory';
import {
  BaseSyncableEntityService,
  SyncableEntityConfig,
  CreateEntityInput,
} from './syncable/BaseSyncableEntityService';
import { generateItemId } from '../utils/idGenerator';
import { isExpiringSoon } from '../utils/dateUtils';
import { getEarliestExpiry } from '../utils/batchUtils';
import { ApiClient } from './ApiClient';
import { InventoryItemServerData, SyncEntityType } from '../types/api';
import { SyncDelta } from '../types/sync';
import Ionicons from '@expo/vector-icons/Ionicons';

// Base file name (FileSystemService appends _homeId for scoping)
const ITEMS_FILE = 'items.json';
const ENTITY_TYPE: SyncEntityType = 'inventoryItems';

// Type for the create method - matches old Omit<InventoryItem, 'id'>
export type CreateInventoryItemMethodInput = Omit<InventoryItem, 'id'>;

class InventoryService extends BaseSyncableEntityService<
  InventoryItem,
  InventoryItemServerData
> {
  constructor() {
    const config: SyncableEntityConfig<InventoryItem, InventoryItemServerData> = {
      entityType: ENTITY_TYPE,
      fileName: ITEMS_FILE,
      entityName: 'item',

      generateId: generateItemId,

      toServerData: (item) => ({
        id: item.id,
        name: item.name,
        location: item.location,
        detailedLocation: item.detailedLocation,
        status: item.status,
        icon: item.icon,
        iconColor: item.iconColor,
        warningThreshold: item.warningThreshold,
        batches: item.batches,
        categoryId: item.categoryId,
        homeId: item.homeId,
      }),

      fromServerData: (serverData, meta) => ({
        id: meta.entityId,
        homeId: meta.homeId,
        name: serverData.name,
        location: serverData.location,
        detailedLocation: serverData.detailedLocation,
        status: serverData.status,
        icon: serverData.icon as keyof typeof Ionicons.glyphMap,
        iconColor: serverData.iconColor,
        warningThreshold: serverData.warningThreshold,
        batches: serverData.batches || [],
        categoryId: serverData.categoryId,
        createdAt: meta.updatedAt,
        updatedAt: meta.updatedAt,
        version: meta.version,
        serverUpdatedAt: meta.updatedAt,
        clientUpdatedAt: meta.clientUpdatedAt,
        lastSyncedAt: meta.serverTimestamp,
      }),

      toSyncEntity: (item, homeId) => ({
        entityId: item.id,
        entityType: ENTITY_TYPE,
        homeId,
        data: {
          id: item.id,
          name: item.name,
          location: item.location,
          detailedLocation: item.detailedLocation,
          status: item.status,
          icon: item.icon,
          iconColor: item.iconColor,
          warningThreshold: item.warningThreshold,
          batches: item.batches,
          categoryId: item.categoryId,
        },
        version: item.version,
        clientUpdatedAt: item.clientUpdatedAt,
        pendingCreate: !!item.pendingCreate,
        pendingDelete: !!item.pendingDelete,
      }),

      createEntity: (input, homeId, id, now) => ({
        ...input,
        homeId,
        id,
        status: input.status || 'using',
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
   * Search and filter items
   */
  async searchItems(
    homeId: string,
    query?: string,
    filters?: {
      expiringSoon?: boolean; // Items expiring within 7 days
    }
  ): Promise<InventoryItem[]> {
    let items = await this.getAll(homeId); // Already filters out deleted items

    if (filters?.expiringSoon) {
      items = items.filter((item) => {
        const earliestExpiry = getEarliestExpiry(item.batches || []);
        return earliestExpiry ? isExpiringSoon(earliestExpiry) : false;
      });
    }

    if (query?.trim()) {
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

  // Method aliases for backward compatibility with components
  async getAllItems(homeId: string): Promise<InventoryItem[]> {
    return this.getAll(homeId);
  }

  async getAllItemsForSync(homeId: string): Promise<InventoryItem[]> {
    return this.getAllForSync(homeId);
  }

  async getItemById(id: string, homeId: string): Promise<InventoryItem | null> {
    return this.getById(id, homeId);
  }

  async createItem(
    input: CreateInventoryItemMethodInput,
    homeId: string
  ): Promise<InventoryItem | null> {
    return this.create(input as CreateEntityInput<InventoryItem>, homeId);
  }

  async updateItem(
    id: string,
    updates: Partial<Omit<InventoryItem, 'id'>>,
    homeId: string
  ): Promise<InventoryItem | null> {
    return this.update(id, updates, homeId);
  }

  async deleteItem(id: string, homeId: string): Promise<boolean> {
    return this.delete(id, homeId);
  }

  async syncItems(
    homeId: string,
    apiClient: ApiClient,
    deviceId: string
  ): Promise<SyncDelta<InventoryItem>> {
    return this.sync(homeId, apiClient, deviceId);
  }
}

export const inventoryService = new InventoryService();
