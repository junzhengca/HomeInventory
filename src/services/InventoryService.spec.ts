/**
 * Comprehensive unit tests for InventoryService
 *
 * Tests cover:
 * - CRUD operations (getAll, getById, create, update, delete)
 * - Search functionality (searchItems)
 * - Backward compatibility methods (getAllItems, createItem, etc.)
 * - Sync operations (syncItems)
 * - Edge cases and error handling
 * - Interaction with BaseSyncableEntityService
 */

// Mock dependencies before importing InventoryService
const mockFileSystemService = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
};

jest.mock('./FileSystemService', () => ({
  fileSystemService: mockFileSystemService,
}));

const mockGenerateItemId = jest.fn(() => 'test-item-id-123');

jest.mock('../utils/idGenerator', () => ({
  generateItemId: mockGenerateItemId,
}));

// Mock logger to avoid console output
jest.mock('../utils/Logger', () => ({
  syncLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    verbose: jest.fn(),
  },
}));

// Mock date utils
jest.mock('../utils/dateUtils', () => ({
  isExpiringSoon: jest.fn(() => false),
}));

jest.mock('../utils/batchUtils', () => ({
  getEarliestExpiry: jest.fn(() => null),
}));

// Import InventoryService after mocks are set up
import { inventoryService } from './InventoryService';
import { InventoryItem, ItemBatch } from '../types/inventory';
import { ApiClient } from './ApiClient';
import {
  InventoryItemServerData,
  SyncEntityType,
  BatchSyncResponse,
  EntitySyncResult,
} from '../types/api';
import { SyncDelta } from '../types/sync';

// Type for test input that matches CreateInventoryItemMethodInput
type TestInventoryItemInput = Omit<InventoryItem, 'id'>;

describe('InventoryService', () => {
  let mockApiClient: {
    batchSync: jest.Mock<Promise<BatchSyncResponse>, []>;
  };
  const mockHomeId = 'test-home-123';
  const mockDeviceId = 'test-device-456';

  // Test item fixture
  const createMockItem = (overrides?: Partial<InventoryItem>): InventoryItem => ({
    id: 'item-1',
    homeId: mockHomeId,
    name: 'Test Item',
    location: 'kitchen',
    detailedLocation: 'Pantry',
    status: 'using',
    icon: 'cube',
    iconColor: '#FF5722',
    warningThreshold: 1,
    batches: [],
    categoryId: 'cat-1',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    version: 1,
    clientUpdatedAt: '2024-01-01T00:00:00.000Z',
    pendingCreate: false,
    pendingUpdate: false,
    pendingDelete: false,
    ...overrides,
  });

  // Test batch fixture
  const createMockBatch = (overrides?: Partial<ItemBatch>): ItemBatch => ({
    id: 'batch-1',
    amount: 10,
    unit: 'pcs',
    expiryDate: '2024-12-31T00:00:00.000Z',
    purchaseDate: '2024-01-01T00:00:00.000Z',
    price: 100,
    vendor: 'Store',
    note: 'Test batch',
    createdAt: '2024-01-01T00:00:00.000Z',
  });

  // Empty batches array for tests where we don't need actual batches
  const emptyBatches: ItemBatch[] = [];

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock ApiClient
    mockApiClient = {
      batchSync: jest.fn(),
    };
  });

  // ===========================================================================
  // getAll
  // ===========================================================================

  describe('getAll', () => {
    it('should return all non-deleted items for a home', async () => {
      const items = [
        createMockItem({ id: 'item-1', name: 'Item 1' }),
        createMockItem({ id: 'item-2', name: 'Item 2' }),
        createMockItem({ id: 'item-3', name: 'Item 3', deletedAt: '2024-01-02T00:00:00.000Z' }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        items,
      });

      const result = await inventoryService.getAll(mockHomeId);

      expect(mockFileSystemService.readFile).toHaveBeenCalledWith('items.json', mockHomeId);
      expect(result).toHaveLength(2);
      expect(result.every((i) => !i.deletedAt)).toBe(true);
      expect(result.map((i) => i.id)).toEqual(['item-1', 'item-2']);
    });

    it('should return empty array when file does not exist', async () => {
      mockFileSystemService.readFile.mockResolvedValue(null);

      const result = await inventoryService.getAll(mockHomeId);

      expect(result).toEqual([]);
    });

    it('should return empty array when file has no items', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        items: [],
      });

      const result = await inventoryService.getAll(mockHomeId);

      expect(result).toEqual([]);
    });

    it('should throw error when homeId is not provided', async () => {
      await expect(inventoryService.getAll('')).rejects.toThrow('homeId is required to get item');
    });

    it('should throw error when homeId is undefined', async () => {
      await expect(
        inventoryService.getAll(undefined as unknown as string)
      ).rejects.toThrow('homeId is required to get item');
    });
  });

  // ===========================================================================
  // getAllForSync
  // ===========================================================================

  describe('getAllForSync', () => {
    it('should return all items including deleted for sync', async () => {
      const items = [
        createMockItem({ id: 'item-1', deletedAt: '2024-01-02T00:00:00.000Z' }),
        createMockItem({ id: 'item-2', deletedAt: undefined }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        items,
      });

      const result = await inventoryService.getAllForSync(mockHomeId);

      expect(result).toHaveLength(2);
    });
  });

  // ===========================================================================
  // getById
  // ===========================================================================

  describe('getById', () => {
    it('should return item by id', async () => {
      const items = [
        createMockItem({ id: 'item-1', name: 'Item 1' }),
        createMockItem({ id: 'item-2', name: 'Item 2' }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        items,
      });

      const result = await inventoryService.getById('item-1', mockHomeId);

      expect(result).toEqual(items[0]);
    });

    it('should return null when item not found', async () => {
      const items = [createMockItem({ id: 'item-1', name: 'Item 1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        items,
      });

      const result = await inventoryService.getById('non-existent', mockHomeId);

      expect(result).toBeNull();
    });

    it('should not return deleted items', async () => {
      const items = [
        createMockItem({ id: 'item-1', deletedAt: '2024-01-02T00:00:00.000Z' }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        items,
      });

      const result = await inventoryService.getById('item-1', mockHomeId);

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // create
  // ===========================================================================

  describe('create', () => {
    it('should create a new item with all fields', async () => {
      const input: TestInventoryItemInput = {
        name: '  New Item  ',
        location: 'kitchen',
        detailedLocation: 'Pantry',
        status: 'new',
        icon: 'cube' as const,
        iconColor: '#FF5722',
        warningThreshold: 5,
        batches: [createMockBatch()],
        categoryId: 'cat-1',
        homeId: mockHomeId,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        version: 1,
        clientUpdatedAt: '2024-01-01T00:00:00.000Z',
        pendingCreate: false,
        pendingUpdate: false,
        pendingDelete: false,
        deletedAt: undefined,
        serverUpdatedAt: undefined,
        lastSyncedAt: undefined,
      };

      mockFileSystemService.readFile.mockResolvedValue({
        items: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await inventoryService.create(input, mockHomeId);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('  New Item  '); // Name is NOT trimmed by InventoryService
      expect(result?.location).toBe('kitchen');
      expect(result?.status).toBe('new');
      expect(result?.icon).toBe('cube');
      expect(result?.iconColor).toBe('#FF5722');
      expect(result?.warningThreshold).toBe(5);
      expect(result?.batches).toHaveLength(1);
      expect(result?.categoryId).toBe('cat-1');
      expect(result?.pendingCreate).toBe(true);
      expect(result?.homeId).toBe(mockHomeId);
      expect(result?.version).toBe(1);
    });

    it('should default status to "using" when not provided', async () => {
      const input: TestInventoryItemInput = {
        name: 'Test Item',
        location: 'kitchen',
        detailedLocation: 'Pantry',
        icon: 'cube' as const,
        iconColor: '#FF5722',
        batches: emptyBatches as ItemBatch[],
        status: 'using',
        homeId: mockHomeId,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        version: 1,
        clientUpdatedAt: '2024-01-01T00:00:00.000Z',
        pendingCreate: false,
        pendingUpdate: false,
        pendingDelete: false,
      };

      mockFileSystemService.readFile.mockResolvedValue({
        items: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await inventoryService.create(input, mockHomeId);

      expect(result?.status).toBe('using');
    });

    it('should return null when write fails', async () => {
      const input: TestInventoryItemInput = {
        name: 'Test',
        location: 'kitchen',
        detailedLocation: 'Pantry',
        icon: 'cube' as const,
        iconColor: '#FF5722',
        batches: emptyBatches as ItemBatch[],
        status: 'new',
        homeId: mockHomeId,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        version: 1,
        clientUpdatedAt: '2024-01-01T00:00:00.000Z',
        pendingCreate: false,
        pendingUpdate: false,
        pendingDelete: false,
      };

      mockFileSystemService.readFile.mockResolvedValue({
        items: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(false);

      const result = await inventoryService.create(input, mockHomeId);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      const input: TestInventoryItemInput = {
        name: 'Test',
        location: 'kitchen',
        detailedLocation: 'Pantry',
        icon: 'cube' as const,
        iconColor: '#FF5722',
        batches: emptyBatches as ItemBatch[],
        status: 'new',
        homeId: mockHomeId,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        version: 1,
        clientUpdatedAt: '2024-01-01T00:00:00.000Z',
        pendingCreate: false,
        pendingUpdate: false,
        pendingDelete: false,
      };

      mockFileSystemService.readFile.mockRejectedValue(new Error('Read error'));

      const result = await inventoryService.create(input, mockHomeId);

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // update
  // ===========================================================================

  describe('update', () => {
    it('should update existing item', async () => {
      const items = [createMockItem({ id: 'item-1', name: 'Original', status: 'new' })];

      mockFileSystemService.readFile.mockResolvedValue({
        items,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await inventoryService.update('item-1', { name: 'Updated' }, mockHomeId);

      expect(result?.name).toBe('Updated');
      expect(result?.status).toBe('new'); // Unchanged
      expect(result?.pendingUpdate).toBe(true);
      expect(result?.version).toBe(2); // Incremented
    });

    it('should set pendingUpdate to false when updating pendingCreate item', async () => {
      const items = [
        createMockItem({ id: 'item-1', pendingCreate: true, pendingUpdate: false }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        items,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await inventoryService.update('item-1', { name: 'Updated' }, mockHomeId);

      expect(result?.pendingUpdate).toBe(false);
      expect(result?.pendingCreate).toBe(true); // Still true
    });

    it('should return null when item not found', async () => {
      const items = [createMockItem({ id: 'item-1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        items,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await inventoryService.update('non-existent', { name: 'Updated' }, mockHomeId);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      const items = [createMockItem({ id: 'item-1' })];

      mockFileSystemService.readFile.mockRejectedValue(new Error('Error'));

      const result = await inventoryService.update('item-1', { name: 'Updated' }, mockHomeId);

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // delete
  // ===========================================================================

  describe('delete', () => {
    it('should soft delete existing item', async () => {
      const items = [createMockItem({ id: 'item-1', pendingCreate: false })];

      mockFileSystemService.readFile.mockResolvedValue({
        items,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await inventoryService.delete('item-1', mockHomeId);

      expect(result).toBe(true);
      const writtenData = mockFileSystemService.writeFile.mock.calls[0][1] as {
        items: InventoryItem[];
      };
      expect(writtenData.items[0].deletedAt).toBeDefined();
    });

    it('should hard delete pendingCreate item', async () => {
      const items = [createMockItem({ id: 'item-1', pendingCreate: true })];

      mockFileSystemService.readFile.mockResolvedValue({
        items,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await inventoryService.delete('item-1', mockHomeId);

      expect(result).toBe(true);
      // Check that item was removed from array
      const writtenData = mockFileSystemService.writeFile.mock.calls[0][1] as {
        items: InventoryItem[];
      };
      expect(writtenData.items).toHaveLength(0);
    });

    it('should return true when item is already deleted (idempotent)', async () => {
      const items = [
        createMockItem({
          id: 'item-1',
          deletedAt: '2024-01-02T00:00:00.000Z',
          pendingDelete: true,
        }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        items,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await inventoryService.delete('item-1', mockHomeId);

      expect(result).toBe(true);
    });

    it('should return false when item not found', async () => {
      const items = [createMockItem({ id: 'item-1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        items,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await inventoryService.delete('non-existent', mockHomeId);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockFileSystemService.readFile.mockRejectedValue(new Error('Error'));

      const result = await inventoryService.delete('item-1', mockHomeId);

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // searchItems
  // ===========================================================================

  describe('searchItems', () => {
    beforeEach(() => {
      const items = [
        createMockItem({ id: 'item-1', name: 'Milk', location: 'kitchen', detailedLocation: 'Fridge' }),
        createMockItem({ id: 'item-2', name: 'Bread', location: 'pantry', detailedLocation: 'Shelf A' }),
        createMockItem({ id: 'item-3', name: 'Eggs', location: 'kitchen', detailedLocation: 'Fridge' }),
      ];
      mockFileSystemService.readFile.mockResolvedValue({ items });
    });

    it('should return all items when no query or filters', async () => {
      const result = await inventoryService.searchItems(mockHomeId);

      expect(result).toHaveLength(3);
    });

    it('should filter items by name query', async () => {
      const result = await inventoryService.searchItems(mockHomeId, 'Milk');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Milk');
    });

    it('should filter items by location query', async () => {
      const result = await inventoryService.searchItems(mockHomeId, 'pantry');

      expect(result).toHaveLength(1);
      expect(result[0].location).toBe('pantry');
    });

    it('should filter items by detailed location query', async () => {
      const result = await inventoryService.searchItems(mockHomeId, 'Shelf');

      expect(result).toHaveLength(1);
      expect(result[0].detailedLocation).toBe('Shelf A');
    });

    it('should be case insensitive', async () => {
      const result = await inventoryService.searchItems(mockHomeId, 'milk');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Milk');
    });

    it('should handle empty query string', async () => {
      const result = await inventoryService.searchItems(mockHomeId, '   ');

      expect(result).toHaveLength(3);
    });
  });

  // ===========================================================================
  // Backward Compatibility Methods (aliases)
  // ===========================================================================

  describe('getAllItems', () => {
    it('should be an alias for getAll', async () => {
      const items = [createMockItem({ id: 'item-1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        items,
      });

      const result = await inventoryService.getAllItems(mockHomeId);

      expect(result).toEqual(items.filter((i) => !i.deletedAt));
    });
  });

  describe('getAllItemsForSync', () => {
    it('should be an alias for getAllForSync', async () => {
      const items = [
        createMockItem({ id: 'item-1', deletedAt: '2024-01-02T00:00:00.000Z' }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        items,
      });

      const result = await inventoryService.getAllItemsForSync(mockHomeId);

      expect(result).toEqual(items);
    });
  });

  describe('getItemById', () => {
    it('should be an alias for getById', async () => {
      const items = [createMockItem({ id: 'item-1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        items,
      });

      const result = await inventoryService.getItemById('item-1', mockHomeId);

      expect(result).toEqual(items[0]);
    });
  });

  describe('createItem', () => {
    it('should be an alias for create', async () => {
      const input: TestInventoryItemInput = {
        name: 'Test Item',
        location: 'kitchen',
        detailedLocation: 'Pantry',
        icon: 'cube' as const,
        iconColor: '#FF5722',
        batches: emptyBatches as ItemBatch[],
        status: 'new',
        homeId: mockHomeId,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        version: 1,
        clientUpdatedAt: '2024-01-01T00:00:00.000Z',
        pendingCreate: false,
        pendingUpdate: false,
        pendingDelete: false,
      };

      mockFileSystemService.readFile.mockResolvedValue({
        items: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await inventoryService.createItem(input, mockHomeId);

      expect(result?.name).toBe('Test Item');
      expect(result?.pendingCreate).toBe(true);
    });
  });

  describe('updateItem', () => {
    it('should be an alias for update', async () => {
      const items = [createMockItem({ id: 'item-1', name: 'Original' })];

      mockFileSystemService.readFile.mockResolvedValue({
        items,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await inventoryService.updateItem('item-1', { name: 'Updated' }, mockHomeId);

      expect(result?.name).toBe('Updated');
    });
  });

  describe('deleteItem', () => {
    it('should be an alias for delete', async () => {
      const items = [createMockItem({ id: 'item-1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        items,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await inventoryService.deleteItem('item-1', mockHomeId);

      expect(result).toBe(true);
    });
  });

  // ===========================================================================
  // syncItems
  // ===========================================================================

  describe('syncItems', () => {
    const mockServerTimestamp = '2024-01-15T12:00:00.000Z';
    const mockCheckpoint = {
      homeId: mockHomeId,
      entityType: 'inventoryItems' as SyncEntityType,
      lastPulledVersion: 5,
    };

    const createMockSyncResponse = (
      overrides?: Partial<BatchSyncResponse>
    ): BatchSyncResponse => ({
      success: true,
      serverTimestamp: mockServerTimestamp,
      pullResults: [
        {
          entityType: 'inventoryItems' as SyncEntityType,
          entities: [],
          deletedEntityIds: [],
          checkpoint: mockCheckpoint,
        },
      ],
      pushResults: [
        {
          entityType: 'inventoryItems' as SyncEntityType,
          results: [],
          newEntitiesFromServer: [],
          deletedEntityIds: [],
          errors: [],
          checkpoint: mockCheckpoint,
        },
      ],
      ...overrides,
    });

    it('should call apiClient.batchSync with correct parameters', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        items: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockApiClient.batchSync.mockResolvedValue(createMockSyncResponse());

      await inventoryService.syncItems(mockHomeId, mockApiClient as unknown as ApiClient, mockDeviceId);

      expect(mockApiClient.batchSync).toHaveBeenCalledWith({
        homeId: mockHomeId,
        deviceId: mockDeviceId,
        pullRequests: [
          {
            entityType: 'inventoryItems',
            since: undefined,
            includeDeleted: true,
            checkpoint: { lastPulledVersion: 0 },
          },
        ],
        pushRequests: undefined,
      });
    });

    it('should include pending items in push request', async () => {
      const pendingItems = [
        createMockItem({ id: 'item-1', pendingCreate: true }),
        createMockItem({ id: 'item-2', pendingUpdate: true }),
        createMockItem({ id: 'item-3', pendingDelete: true }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        items: pendingItems,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockApiClient.batchSync.mockResolvedValue(createMockSyncResponse());

      await inventoryService.syncItems(mockHomeId, mockApiClient as unknown as ApiClient, mockDeviceId);

      const callArgs = mockApiClient.batchSync.mock.calls[0] as unknown[];
      expect((callArgs[0] as { pushRequests: { entities: unknown[] }[] }).pushRequests[0].entities).toHaveLength(3);
    });

    it('should return SyncDelta with updated, created, deleted, confirmed arrays', async () => {
      const items = [
        createMockItem({ id: 'item-1', pendingUpdate: true }),
      ];

      mockFileSystemService.readFile
        .mockResolvedValueOnce({
          items,
          lastSyncTime: '2024-01-10T00:00:00.000Z',
          lastPulledVersion: 0,
        })
        .mockResolvedValueOnce({
          items,
        });

      mockFileSystemService.writeFile.mockResolvedValue(true);

      const pushResult: EntitySyncResult = {
        entityId: 'item-1',
        status: 'updated',
        serverUpdatedAt: mockServerTimestamp,
      };

      mockApiClient.batchSync.mockResolvedValue(
        createMockSyncResponse({
          pushResults: [
            {
              entityType: 'inventoryItems',
              results: [pushResult],
              newEntitiesFromServer: [],
              deletedEntityIds: [],
              errors: [],
              checkpoint: mockCheckpoint,
            },
          ],
        })
      );

      const result = await inventoryService.syncItems(
        mockHomeId,
        mockApiClient as unknown as ApiClient,
        mockDeviceId
      );

      expect(result.updated).toHaveLength(1);
      expect(result.created).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
      expect(result.confirmed).toHaveLength(1);
      expect(result.unchanged).toBe(false);
      expect(result.serverTimestamp).toBe(mockServerTimestamp);
    });

    it('should return empty delta when sync fails', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        items: [],
      });

      mockApiClient.batchSync.mockResolvedValue({
        success: false,
        serverTimestamp: mockServerTimestamp,
      });

      const result = await inventoryService.syncItems(
        mockHomeId,
        mockApiClient as unknown as ApiClient,
        mockDeviceId
      );

      expect(result.updated).toHaveLength(0);
      expect(result.created).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
      expect(result.confirmed).toHaveLength(0);
      expect(result.unchanged).toBe(true);
    });

    it('should handle created items from server in pull results', async () => {
      mockFileSystemService.readFile
        .mockResolvedValueOnce({
          items: [],
          lastSyncTime: '2024-01-10T00:00:00.000Z',
          lastPulledVersion: 0,
        })
        .mockResolvedValueOnce({
          items: [],
        });

      mockFileSystemService.writeFile.mockResolvedValue(true);

      const serverItem: InventoryItemServerData = {
        id: 'server-item-1',
        name: 'Server Item',
        location: 'kitchen',
        detailedLocation: 'Pantry',
        status: 'new',
        icon: 'cube',
        iconColor: '#FF5722',
        warningThreshold: 1,
        batches: [],
      };

      mockApiClient.batchSync.mockResolvedValue(
        createMockSyncResponse({
          pullResults: [
            {
              entityType: 'inventoryItems',
              entities: [
                {
                  entityId: 'server-item-1',
                  entityType: 'inventoryItems',
                  homeId: mockHomeId,
                  data: serverItem as unknown as Record<string, unknown>,
                  version: 1,
                  clientUpdatedAt: mockServerTimestamp,
                  updatedAt: mockServerTimestamp,
                },
              ],
              deletedEntityIds: [],
              checkpoint: mockCheckpoint,
            },
          ],
        })
      );

      const result = await inventoryService.syncItems(
        mockHomeId,
        mockApiClient as unknown as ApiClient,
        mockDeviceId
      );

      expect(result.created).toHaveLength(1);
      expect(result.created[0].id).toBe('server-item-1');
    });

    it('should return empty delta on network error', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        items: [],
      });

      mockApiClient.batchSync.mockRejectedValue(new Error('Network error'));

      const result = await inventoryService.syncItems(
        mockHomeId,
        mockApiClient as unknown as ApiClient,
        mockDeviceId
      );

      expect(result.updated).toHaveLength(0);
      expect(result.created).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
      expect(result.confirmed).toHaveLength(0);
      expect(result.unchanged).toBe(true);
    });

    it('should not update local entity when it has pending changes during pull', async () => {
      const items = [
        createMockItem({
          id: 'item-1',
          name: 'Local version',
          pendingUpdate: true,
        }),
      ];

      mockFileSystemService.readFile
        .mockResolvedValueOnce({
          items,
          lastSyncTime: '2024-01-10T00:00:00.000Z',
          lastPulledVersion: 0,
        })
        .mockResolvedValueOnce({
          items,
        });

      mockFileSystemService.writeFile.mockResolvedValue(true);

      const serverItem: InventoryItemServerData = {
        id: 'item-1',
        name: 'Server Item',
        location: 'kitchen',
        detailedLocation: 'Pantry',
        status: 'new',
        icon: 'cube',
        iconColor: '#FF5722',
        warningThreshold: 1,
        batches: [],
      };

      mockApiClient.batchSync.mockResolvedValue(
        createMockSyncResponse({
          pullResults: [
            {
              entityType: 'inventoryItems',
              entities: [
                {
                  entityId: 'item-1',
                  entityType: 'inventoryItems',
                  homeId: mockHomeId,
                  data: serverItem as unknown as Record<string, unknown>,
                  version: 2,
                  clientUpdatedAt: mockServerTimestamp,
                  updatedAt: mockServerTimestamp,
                },
              ],
              deletedEntityIds: [],
              checkpoint: mockCheckpoint,
            },
          ],
        })
      );

      const result = await inventoryService.syncItems(
        mockHomeId,
        mockApiClient as unknown as ApiClient,
        mockDeviceId
      );

      // Local entity should not be updated since it has pending changes
      expect(result.created).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Service Configuration Tests
  // ===========================================================================

  describe('Service Configuration', () => {
    it('should have correct entity type', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        items: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockApiClient.batchSync.mockResolvedValue({
        success: true,
        serverTimestamp: '2024-01-15T12:00:00.000Z',
        pullResults: [
          {
            entityType: 'inventoryItems',
            entities: [],
            deletedEntityIds: [],
            checkpoint: {
              homeId: mockHomeId,
              entityType: 'inventoryItems',
              lastPulledVersion: 0,
            },
          },
        ],
      });

      await inventoryService.syncItems(mockHomeId, mockApiClient as unknown as ApiClient, mockDeviceId);

      const callArgs = mockApiClient.batchSync.mock.calls[0] as unknown[];
      expect((callArgs[0] as { pullRequests: { entityType: SyncEntityType }[] }).pullRequests[0].entityType).toBe('inventoryItems');
    });

    it('should use correct filename', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        items: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      await inventoryService.getAll(mockHomeId);

      expect(mockFileSystemService.readFile).toHaveBeenCalledWith('items.json', mockHomeId);
    });
  });
});
