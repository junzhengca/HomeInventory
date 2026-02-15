/**
 * Comprehensive unit tests for CategoryService
 *
 * Tests cover:
 * - CRUD operations (getAll, getById, create, update, delete)
 * - Backward compatibility methods (getAllCategories, createCategory, etc.)
 * - Sync operations (syncCategories)
 * - Edge cases and error handling
 * - Interaction with BaseSyncableEntityService
 */

// Mock dependencies before importing CategoryService
const mockFileSystemService = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
};

jest.mock('./FileSystemService', () => ({
  fileSystemService: mockFileSystemService,
}));

const mockGenerateItemId = jest.fn(() => 'test-category-id-123');

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

// Import CategoryService after mocks are set up
import { categoryService, CreateCategoryMethodInput } from './CategoryService';
import { Category } from '../types/inventory';
import { ApiClient } from './ApiClient';
import {
  CategoryServerData,
  SyncEntityType,
  BatchSyncResponse,
  EntitySyncResult,
} from '../types/api';
import { SyncDelta } from '../types/sync';

describe('CategoryService', () => {
  let mockApiClient: {
    batchSync: jest.Mock<Promise<BatchSyncResponse>, []>;
  };
  const mockHomeId = 'test-home-123';
  const mockDeviceId = 'test-device-456';

  // Test category fixture
  const createMockCategory = (overrides?: Partial<Category>): Category => ({
    id: 'cat-1',
    homeId: mockHomeId,
    name: 'Food',
    icon: 'restaurant',
    color: '#FF5722',
    isCustom: false,
    label: 'Food',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    version: 1,
    clientUpdatedAt: '2024-01-01T00:00:00.000Z',
    pendingCreate: false,
    pendingUpdate: false,
    pendingDelete: false,
    ...overrides,
  });

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
    it('should return all non-deleted categories for a home', async () => {
      const categories = [
        createMockCategory({ id: 'cat-1', name: 'Food' }),
        createMockCategory({ id: 'cat-2', name: 'Beverage' }),
        createMockCategory({ id: 'cat-3', name: 'Snack', deletedAt: '2024-01-02T00:00:00.000Z' }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        categories,
      });

      const result = await categoryService.getAll(mockHomeId);

      expect(mockFileSystemService.readFile).toHaveBeenCalledWith('categories.json', mockHomeId);
      expect(result).toHaveLength(2);
      expect(result.every((c) => !c.deletedAt)).toBe(true);
      expect(result.map((c) => c.id)).toEqual(['cat-1', 'cat-2']);
    });

    it('should return empty array when file does not exist', async () => {
      mockFileSystemService.readFile.mockResolvedValue(null);

      const result = await categoryService.getAll(mockHomeId);

      expect(result).toEqual([]);
    });

    it('should return empty array when file has no categories', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        categories: [],
      });

      const result = await categoryService.getAll(mockHomeId);

      expect(result).toEqual([]);
    });

    it('should throw error when homeId is not provided', async () => {
      await expect(categoryService.getAll('')).rejects.toThrow('homeId is required to get category');
    });

    it('should throw error when homeId is undefined', async () => {
      await expect(
        categoryService.getAll(undefined as unknown as string)
      ).rejects.toThrow('homeId is required to get category');
    });
  });

  // ===========================================================================
  // getAllForSync
  // ===========================================================================

  describe('getAllForSync', () => {
    it('should return all categories including deleted for sync', async () => {
      const categories = [
        createMockCategory({ id: 'cat-1', deletedAt: '2024-01-02T00:00:00.000Z' }),
        createMockCategory({ id: 'cat-2', deletedAt: undefined }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        categories,
      });

      const result = await categoryService.getAllForSync(mockHomeId);

      expect(result).toHaveLength(2);
    });
  });

  // ===========================================================================
  // getById
  // ===========================================================================

  describe('getById', () => {
    it('should return category by id', async () => {
      const categories = [
        createMockCategory({ id: 'cat-1', name: 'Food' }),
        createMockCategory({ id: 'cat-2', name: 'Beverage' }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        categories,
      });

      const result = await categoryService.getById('cat-1', mockHomeId);

      expect(result).toEqual(categories[0]);
    });

    it('should return null when category not found', async () => {
      const categories = [createMockCategory({ id: 'cat-1', name: 'Food' })];

      mockFileSystemService.readFile.mockResolvedValue({
        categories,
      });

      const result = await categoryService.getById('non-existent', mockHomeId);

      expect(result).toBeNull();
    });

    it('should not return deleted categories', async () => {
      const categories = [
        createMockCategory({ id: 'cat-1', deletedAt: '2024-01-02T00:00:00.000Z' }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        categories,
      });

      const result = await categoryService.getById('cat-1', mockHomeId);

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // create
  // ===========================================================================

  describe('create', () => {
    it('should create a new category with all fields', async () => {
      const input: CreateCategoryMethodInput = {
        name: '  Custom Category  ',
        icon: 'star',
        color: '#FFC107',
        isCustom: true,
        label: 'Custom Label',
      };

      mockFileSystemService.readFile.mockResolvedValue({
        categories: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await categoryService.create(input, mockHomeId);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('  Custom Category  '); // Not trimmed for categories
      expect(result?.icon).toBe('star');
      expect(result?.color).toBe('#FFC107');
      expect(result?.isCustom).toBe(true);
      expect(result?.label).toBe('Custom Label');
      expect(result?.pendingCreate).toBe(true);
      expect(result?.homeId).toBe(mockHomeId);
      expect(result?.version).toBe(1);
    });

    it('should create category with optional fields undefined', async () => {
      const input: CreateCategoryMethodInput = {
        name: 'Minimal Category',
        isCustom: true,
      };

      mockFileSystemService.readFile.mockResolvedValue({
        categories: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await categoryService.create(input, mockHomeId);

      expect(result?.name).toBe('Minimal Category');
      expect(result?.icon).toBeUndefined();
      expect(result?.color).toBeUndefined();
      expect(result?.label).toBeUndefined();
    });

    it('should return null when write fails', async () => {
      const input: CreateCategoryMethodInput = {
        name: 'Test',
        isCustom: true,
      };

      mockFileSystemService.readFile.mockResolvedValue({
        categories: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(false);

      const result = await categoryService.create(input, mockHomeId);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      const input: CreateCategoryMethodInput = {
        name: 'Test',
        isCustom: true,
      };

      mockFileSystemService.readFile.mockRejectedValue(new Error('Read error'));

      const result = await categoryService.create(input, mockHomeId);

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // update
  // ===========================================================================

  describe('update', () => {
    it('should update existing category', async () => {
      const categories = [createMockCategory({ id: 'cat-1', name: 'Original', isCustom: false })];

      mockFileSystemService.readFile.mockResolvedValue({
        categories,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await categoryService.update('cat-1', { name: 'Updated' }, mockHomeId);

      expect(result?.name).toBe('Updated');
      expect(result?.isCustom).toBe(false); // Unchanged
      expect(result?.pendingUpdate).toBe(true);
      expect(result?.version).toBe(2); // Incremented
    });

    it('should set pendingUpdate to false when updating pendingCreate category', async () => {
      const categories = [
        createMockCategory({ id: 'cat-1', pendingCreate: true, pendingUpdate: false }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        categories,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await categoryService.update('cat-1', { name: 'Updated' }, mockHomeId);

      expect(result?.pendingUpdate).toBe(false);
      expect(result?.pendingCreate).toBe(true); // Still true
    });

    it('should return null when category not found', async () => {
      const categories = [createMockCategory({ id: 'cat-1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        categories,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await categoryService.update('non-existent', { name: 'Updated' }, mockHomeId);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      const categories = [createMockCategory({ id: 'cat-1' })];

      mockFileSystemService.readFile.mockRejectedValue(new Error('Error'));

      const result = await categoryService.update('cat-1', { name: 'Updated' }, mockHomeId);

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // delete
  // ===========================================================================

  describe('delete', () => {
    it('should soft delete existing category', async () => {
      const categories = [createMockCategory({ id: 'cat-1', pendingCreate: false })];

      mockFileSystemService.readFile.mockResolvedValue({
        categories,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await categoryService.delete('cat-1', mockHomeId);

      expect(result).toBe(true);
      const writtenData = mockFileSystemService.writeFile.mock.calls[0][1] as {
        categories: Category[];
      };
      expect(writtenData.categories[0].deletedAt).toBeDefined();
    });

    it('should hard delete pendingCreate category', async () => {
      const categories = [createMockCategory({ id: 'cat-1', pendingCreate: true })];

      mockFileSystemService.readFile.mockResolvedValue({
        categories,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await categoryService.delete('cat-1', mockHomeId);

      expect(result).toBe(true);
      // Check that category was removed from array
      const writtenData = mockFileSystemService.writeFile.mock.calls[0][1] as {
        categories: Category[];
      };
      expect(writtenData.categories).toHaveLength(0);
    });

    it('should return true when category is already deleted (idempotent)', async () => {
      const categories = [
        createMockCategory({
          id: 'cat-1',
          deletedAt: '2024-01-02T00:00:00.000Z',
          pendingDelete: true,
        }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        categories,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await categoryService.delete('cat-1', mockHomeId);

      expect(result).toBe(true);
    });

    it('should return false when category not found', async () => {
      const categories = [createMockCategory({ id: 'cat-1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        categories,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await categoryService.delete('non-existent', mockHomeId);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockFileSystemService.readFile.mockRejectedValue(new Error('Error'));

      const result = await categoryService.delete('cat-1', mockHomeId);

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // Backward Compatibility Methods (aliases)
  // ===========================================================================

  describe('getAllCategories', () => {
    it('should be an alias for getAll', async () => {
      const categories = [createMockCategory({ id: 'cat-1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        categories,
      });

      const result = await categoryService.getAllCategories(mockHomeId);

      expect(result).toEqual(categories.filter((c) => !c.deletedAt));
    });
  });

  describe('getCategoryById', () => {
    it('should be an alias for getById', async () => {
      const categories = [createMockCategory({ id: 'cat-1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        categories,
      });

      const result = await categoryService.getCategoryById('cat-1', mockHomeId);

      expect(result).toEqual(categories[0]);
    });
  });

  describe('createCategory', () => {
    it('should be an alias for create', async () => {
      const input: CreateCategoryMethodInput = {
        name: 'Test Category',
        isCustom: true,
      };

      mockFileSystemService.readFile.mockResolvedValue({
        categories: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await categoryService.createCategory(input, mockHomeId);

      expect(result?.name).toBe('Test Category');
      expect(result?.pendingCreate).toBe(true);
    });
  });

  describe('updateCategory', () => {
    it('should be an alias for update', async () => {
      const categories = [createMockCategory({ id: 'cat-1', name: 'Original' })];

      mockFileSystemService.readFile.mockResolvedValue({
        categories,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await categoryService.updateCategory('cat-1', { name: 'Updated' }, mockHomeId);

      expect(result?.name).toBe('Updated');
    });
  });

  describe('deleteCategory', () => {
    it('should be an alias for delete', async () => {
      const categories = [createMockCategory({ id: 'cat-1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        categories,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await categoryService.deleteCategory('cat-1', mockHomeId);

      expect(result).toBe(true);
    });
  });

  // ===========================================================================
  // syncCategories
  // ===========================================================================

  describe('syncCategories', () => {
    const mockServerTimestamp = '2024-01-15T12:00:00.000Z';
    const mockCheckpoint = {
      homeId: mockHomeId,
      entityType: 'categories' as SyncEntityType,
      lastPulledVersion: 5,
    };

    const createMockSyncResponse = (
      overrides?: Partial<BatchSyncResponse>
    ): BatchSyncResponse => ({
      success: true,
      serverTimestamp: mockServerTimestamp,
      pullResults: [
        {
          entityType: 'categories' as SyncEntityType,
          entities: [],
          deletedEntityIds: [],
          checkpoint: mockCheckpoint,
        },
      ],
      pushResults: [
        {
          entityType: 'categories' as SyncEntityType,
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
        categories: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockApiClient.batchSync.mockResolvedValue(createMockSyncResponse());

      await categoryService.syncCategories(mockHomeId, mockApiClient as unknown as ApiClient, mockDeviceId);

      expect(mockApiClient.batchSync).toHaveBeenCalledWith({
        homeId: mockHomeId,
        deviceId: mockDeviceId,
        pullRequests: [
          {
            entityType: 'categories',
            since: undefined,
            includeDeleted: true,
            checkpoint: { lastPulledVersion: 0 },
          },
        ],
        pushRequests: undefined,
      });
    });

    it('should include pending categories in push request', async () => {
      const pendingCategories = [
        createMockCategory({ id: 'cat-1', pendingCreate: true }),
        createMockCategory({ id: 'cat-2', pendingUpdate: true }),
        createMockCategory({ id: 'cat-3', pendingDelete: true }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        categories: pendingCategories,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockApiClient.batchSync.mockResolvedValue(createMockSyncResponse());

      await categoryService.syncCategories(mockHomeId, mockApiClient as unknown as ApiClient, mockDeviceId);

      const callArgs = mockApiClient.batchSync.mock.calls[0] as unknown[];
      expect((callArgs[0] as { pushRequests: { entities: unknown[] }[] }).pushRequests[0].entities).toHaveLength(3);
    });

    it('should return SyncDelta with updated, created, deleted, confirmed arrays', async () => {
      const categories = [
        createMockCategory({ id: 'cat-1', pendingUpdate: true }),
      ];

      mockFileSystemService.readFile
        .mockResolvedValueOnce({
          categories,
          lastSyncTime: '2024-01-10T00:00:00.000Z',
          lastPulledVersion: 0,
        })
        .mockResolvedValueOnce({
          categories,
        });

      mockFileSystemService.writeFile.mockResolvedValue(true);

      const pushResult: EntitySyncResult = {
        entityId: 'cat-1',
        status: 'updated',
        serverUpdatedAt: mockServerTimestamp,
      };

      mockApiClient.batchSync.mockResolvedValue(
        createMockSyncResponse({
          pushResults: [
            {
              entityType: 'categories',
              results: [pushResult],
              newEntitiesFromServer: [],
              deletedEntityIds: [],
              errors: [],
              checkpoint: mockCheckpoint,
            },
          ],
        })
      );

      const result = await categoryService.syncCategories(
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
        categories: [],
      });

      mockApiClient.batchSync.mockResolvedValue({
        success: false,
        serverTimestamp: mockServerTimestamp,
      });

      const result = await categoryService.syncCategories(
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

    it('should handle created categories from server in pull results', async () => {
      mockFileSystemService.readFile
        .mockResolvedValueOnce({
          categories: [],
          lastSyncTime: '2024-01-10T00:00:00.000Z',
          lastPulledVersion: 0,
        })
        .mockResolvedValueOnce({
          categories: [],
        });

      mockFileSystemService.writeFile.mockResolvedValue(true);

      const serverCategory: CategoryServerData = {
        id: 'server-cat-1',
        homeId: mockHomeId,
        name: 'Server Category',
        icon: 'star',
        color: '#FFC107',
        isCustom: true,
        label: 'Server Label',
      };

      mockApiClient.batchSync.mockResolvedValue(
        createMockSyncResponse({
          pullResults: [
            {
              entityType: 'categories',
              entities: [
                {
                  entityId: 'server-cat-1',
                  entityType: 'categories',
                  homeId: mockHomeId,
                  data: serverCategory as unknown as Record<string, unknown>,
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

      const result = await categoryService.syncCategories(
        mockHomeId,
        mockApiClient as unknown as ApiClient,
        mockDeviceId
      );

      expect(result.created).toHaveLength(1);
      expect(result.created[0].id).toBe('server-cat-1');
    });

    it('should return empty delta on network error', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        categories: [],
      });

      mockApiClient.batchSync.mockRejectedValue(new Error('Network error'));

      const result = await categoryService.syncCategories(
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
      const categories = [
        createMockCategory({
          id: 'cat-1',
          name: 'Local version',
          pendingUpdate: true,
        }),
      ];

      mockFileSystemService.readFile
        .mockResolvedValueOnce({
          categories,
          lastSyncTime: '2024-01-10T00:00:00.000Z',
          lastPulledVersion: 0,
        })
        .mockResolvedValueOnce({
          categories,
        });

      mockFileSystemService.writeFile.mockResolvedValue(true);

      const serverCategory: CategoryServerData = {
        id: 'cat-1',
        homeId: mockHomeId,
        name: 'Server version',
        icon: 'star',
        color: '#FFC107',
        isCustom: true,
        label: 'Server Label',
      };

      mockApiClient.batchSync.mockResolvedValue(
        createMockSyncResponse({
          pullResults: [
            {
              entityType: 'categories',
              entities: [
                {
                  entityId: 'cat-1',
                  entityType: 'categories',
                  homeId: mockHomeId,
                  data: serverCategory as unknown as Record<string, unknown>,
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

      const result = await categoryService.syncCategories(
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
        categories: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockApiClient.batchSync.mockResolvedValue({
        success: true,
        serverTimestamp: '2024-01-15T12:00:00.000Z',
        pullResults: [
          {
            entityType: 'categories',
            entities: [],
            deletedEntityIds: [],
            checkpoint: {
              homeId: mockHomeId,
              entityType: 'categories',
              lastPulledVersion: 0,
            },
          },
        ],
      });

      await categoryService.syncCategories(mockHomeId, mockApiClient as unknown as ApiClient, mockDeviceId);

      const callArgs = mockApiClient.batchSync.mock.calls[0] as unknown[];
      expect((callArgs[0] as { pullRequests: { entityType: SyncEntityType }[] }).pullRequests[0].entityType).toBe('categories');
    });

    it('should use correct filename', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        categories: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      await categoryService.getAll(mockHomeId);

      expect(mockFileSystemService.readFile).toHaveBeenCalledWith('categories.json', mockHomeId);
    });
  });
});
