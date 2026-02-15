/**
 * Comprehensive unit tests for LocationService
 *
 * Tests cover:
 * - CRUD operations (getAllLocations, getLocationById, createLocation, updateLocation, deleteLocation)
 * - Sync operations (syncLocations)
 * - Edge cases and error handling
 * - Custom implementation (not extending BaseSyncableEntityService)
 */

// Mock dependencies before importing LocationService
const mockFileSystemService = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  deleteHomeFiles: jest.fn(),
};

jest.mock('./FileSystemService', () => ({
  fileSystemService: mockFileSystemService,
}));

const mockGenerateItemId = jest.fn(() => 'test-location-id-123');

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

// Import LocationService after mocks are set up
import { locationService } from './LocationService';
import { Location } from '../types/inventory';
import { ApiClient } from './ApiClient';
import {
  LocationServerData,
  SyncEntityType,
  BatchSyncResponse,
  EntitySyncResult,
  Checkpoint,
} from '../types/api';
import { SyncDelta } from '../types/sync';

describe('LocationService', () => {
  let mockApiClient: {
    batchSync: jest.Mock<Promise<BatchSyncResponse>, []>;
  };
  const mockHomeId = 'test-home-123';
  const mockDeviceId = 'test-device-456';

  // Test location fixture
  const createMockLocation = (overrides?: Partial<Location>): Location => ({
    id: 'loc-1',
    homeId: mockHomeId,
    name: 'Kitchen',
    icon: 'home',
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
  // getAllLocations
  // ===========================================================================

  describe('getAllLocations', () => {
    it('should return all non-deleted locations for a home', async () => {
      const locations = [
        createMockLocation({ id: 'loc-1', name: 'Kitchen' }),
        createMockLocation({ id: 'loc-2', name: 'Bedroom' }),
        createMockLocation({ id: 'loc-3', name: 'Bathroom', deletedAt: '2024-01-02T00:00:00.000Z' }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        locations,
      });

      const result = await locationService.getAllLocations(mockHomeId);

      expect(mockFileSystemService.readFile).toHaveBeenCalledWith('locations.json', mockHomeId);
      expect(result).toHaveLength(2);
      expect(result.every((l) => !l.deletedAt)).toBe(true);
      expect(result.map((l) => l.id)).toEqual(['loc-1', 'loc-2']);
    });

    it('should return empty array when file does not exist', async () => {
      mockFileSystemService.readFile.mockResolvedValue(null);

      const result = await locationService.getAllLocations(mockHomeId);

      expect(result).toEqual([]);
    });

    it('should return empty array when file has no locations', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        locations: [],
      });

      const result = await locationService.getAllLocations(mockHomeId);

      expect(result).toEqual([]);
    });

    it('should throw error when homeId is not provided', async () => {
      await expect(locationService.getAllLocations('')).rejects.toThrow('homeId is required for locations');
    });

    it('should throw error when homeId is undefined', async () => {
      await expect(
        locationService.getAllLocations(undefined as unknown as string)
      ).rejects.toThrow('homeId is required for locations');
    });
  });

  // ===========================================================================
  // getLocationById
  // ===========================================================================

  describe('getLocationById', () => {
    it('should return location by id', async () => {
      const locations = [
        createMockLocation({ id: 'loc-1', name: 'Kitchen' }),
        createMockLocation({ id: 'loc-2', name: 'Bedroom' }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        locations,
      });

      const result = await locationService.getLocationById('loc-1', mockHomeId);

      expect(result).toEqual(locations[0]);
    });

    it('should return null when location not found', async () => {
      const locations = [createMockLocation({ id: 'loc-1', name: 'Kitchen' })];

      mockFileSystemService.readFile.mockResolvedValue({
        locations,
      });

      const result = await locationService.getLocationById('non-existent', mockHomeId);

      expect(result).toBeNull();
    });

    it('should not return deleted locations', async () => {
      const locations = [
        createMockLocation({ id: 'loc-1', deletedAt: '2024-01-02T00:00:00.000Z' }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        locations,
      });

      const result = await locationService.getLocationById('loc-1', mockHomeId);

      expect(result).toBeNull();
    });

    it('should throw error when homeId is not provided', async () => {
      await expect(locationService.getLocationById('loc-1', '')).rejects.toThrow('homeId is required to get location by ID');
    });
  });

  // ===========================================================================
  // createLocation
  // ===========================================================================

  describe('createLocation', () => {
    it('should create a new location with all fields', async () => {
      const input: Omit<Location, 'id' | 'version' | 'clientUpdatedAt' | 'homeId'> = {
        name: 'Kitchen',
        icon: 'home' as const,
      };

      mockFileSystemService.readFile.mockResolvedValue({
        locations: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await locationService.createLocation(input, mockHomeId);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Kitchen'); // LocationService does NOT trim name
      expect(result?.icon).toBe('home');
      expect(result?.pendingCreate).toBe(true);
      expect(result?.homeId).toBe(mockHomeId);
      expect(result?.version).toBe(1);
    });

    it('should create location with optional fields undefined', async () => {
      const input = {
        name: 'Living Room',
      };

      mockFileSystemService.readFile.mockResolvedValue({
        locations: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await locationService.createLocation(input, mockHomeId);

      expect(result?.name).toBe('Living Room');
      expect(result?.icon).toBeUndefined();
    });

    it('should return null when write fails', async () => {
      const input = {
        name: 'Test',
      };

      mockFileSystemService.readFile.mockResolvedValue({
        locations: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(false);

      const result = await locationService.createLocation(input, mockHomeId);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      const input = {
        name: 'Test',
      };

      mockFileSystemService.readFile.mockRejectedValue(new Error('Read error'));

      const result = await locationService.createLocation(input, mockHomeId);

      expect(result).toBeNull();
    });

    it('should throw error when homeId is not provided', async () => {
      await expect(
        locationService.createLocation({ name: 'Test' }, '')
      ).rejects.toThrow('homeId is required to create location');
    });
  });

  // ===========================================================================
  // updateLocation
  // ===========================================================================

  describe('updateLocation', () => {
    it('should update existing location', async () => {
      const locations = [createMockLocation({ id: 'loc-1', name: 'Original' })];

      mockFileSystemService.readFile.mockResolvedValue({
        locations,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await locationService.updateLocation('loc-1', { name: 'Updated' }, mockHomeId);

      expect(result?.name).toBe('Updated');
      expect(result?.pendingUpdate).toBe(true);
      expect(result?.version).toBe(2); // Incremented
    });

    it('should set pendingUpdate to false when updating pendingCreate location', async () => {
      const locations = [
        createMockLocation({ id: 'loc-1', pendingCreate: true, pendingUpdate: false }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        locations,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await locationService.updateLocation('loc-1', { name: 'Updated' }, mockHomeId);

      expect(result?.pendingUpdate).toBe(false);
      expect(result?.pendingCreate).toBe(true); // Still true
    });

    it('should return null when location not found', async () => {
      const locations = [createMockLocation({ id: 'loc-1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        locations,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await locationService.updateLocation('non-existent', { name: 'Updated' }, mockHomeId);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      const locations = [createMockLocation({ id: 'loc-1' })];

      mockFileSystemService.readFile.mockRejectedValue(new Error('Error'));

      const result = await locationService.updateLocation('loc-1', { name: 'Updated' }, mockHomeId);

      expect(result).toBeNull();
    });

    it('should throw error when homeId is not provided', async () => {
      await expect(
        locationService.updateLocation('loc-1', { name: 'Test' }, '')
      ).rejects.toThrow('homeId is required to update location');
    });
  });

  // ===========================================================================
  // deleteLocation
  // ===========================================================================

  describe('deleteLocation', () => {
    it('should soft delete existing location', async () => {
      const locations = [createMockLocation({ id: 'loc-1', pendingCreate: false })];

      mockFileSystemService.readFile.mockResolvedValue({
        locations,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await locationService.deleteLocation('loc-1', mockHomeId);

      expect(result).toBe(true);
      const writtenData = mockFileSystemService.writeFile.mock.calls[0][1] as {
        locations: Location[];
      };
      expect(writtenData.locations[0].deletedAt).toBeDefined();
    });

    it('should hard delete pendingCreate location', async () => {
      const locations = [createMockLocation({ id: 'loc-1', pendingCreate: true })];

      mockFileSystemService.readFile.mockResolvedValue({
        locations,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await locationService.deleteLocation('loc-1', mockHomeId);

      expect(result).toBe(true);
      // Check that location was removed from array
      const writtenData = mockFileSystemService.writeFile.mock.calls[0][1] as {
        locations: Location[];
      };
      expect(writtenData.locations).toHaveLength(0);
    });

    it('should return true when location is already deleted (idempotent)', async () => {
      const locations = [
        createMockLocation({
          id: 'loc-1',
          deletedAt: '2024-01-02T00:00:00.000Z',
          pendingDelete: true,
        }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        locations,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await locationService.deleteLocation('loc-1', mockHomeId);

      expect(result).toBe(true);
    });

    it('should return false when location not found', async () => {
      const locations = [createMockLocation({ id: 'loc-1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        locations,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await locationService.deleteLocation('non-existent', mockHomeId);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockFileSystemService.readFile.mockRejectedValue(new Error('Error'));

      const result = await locationService.deleteLocation('loc-1', mockHomeId);

      expect(result).toBe(false);
    });

    it('should throw error when homeId is not provided', async () => {
      await expect(
        locationService.deleteLocation('loc-1', '')
      ).rejects.toThrow('homeId is required to delete location');
    });
  });

  // ===========================================================================
  // syncLocations
  // ===========================================================================

  describe('syncLocations', () => {
    const mockServerTimestamp = '2024-01-15T12:00:00.000Z';
    const mockCheckpoint: Checkpoint = {
      homeId: mockHomeId,
      entityType: 'locations' as SyncEntityType,
      lastPulledVersion: 5,
    };

    const createMockSyncResponse = (
      overrides?: Partial<BatchSyncResponse>
    ): BatchSyncResponse => ({
      success: true,
      serverTimestamp: mockServerTimestamp,
      pullResults: [
        {
          entityType: 'locations' as SyncEntityType,
          entities: [],
          deletedEntityIds: [],
          checkpoint: mockCheckpoint,
        },
      ],
      pushResults: [
        {
          entityType: 'locations' as SyncEntityType,
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
        locations: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockApiClient.batchSync.mockResolvedValue(createMockSyncResponse());

      await locationService.syncLocations(mockHomeId, mockApiClient as unknown as ApiClient, mockDeviceId);

      expect(mockApiClient.batchSync).toHaveBeenCalledWith({
        homeId: mockHomeId,
        deviceId: mockDeviceId,
        pullRequests: [
          {
            entityType: 'locations',
            since: undefined,
            includeDeleted: true,
            checkpoint: { lastPulledVersion: 0 },
          },
        ],
        pushRequests: undefined,
      });
    });

    it('should include pending locations in push request', async () => {
      const pendingLocations = [
        createMockLocation({ id: 'loc-1', pendingCreate: true }),
        createMockLocation({ id: 'loc-2', pendingUpdate: true }),
        createMockLocation({ id: 'loc-3', pendingDelete: true }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        locations: pendingLocations,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockApiClient.batchSync.mockResolvedValue(createMockSyncResponse());

      await locationService.syncLocations(mockHomeId, mockApiClient as unknown as ApiClient, mockDeviceId);

      const callArgs = mockApiClient.batchSync.mock.calls[0] as unknown[];
      expect((callArgs[0] as { pushRequests: { entities: unknown[] }[] }).pushRequests[0].entities).toHaveLength(3);
    });

    it('should return SyncDelta with updated, created, deleted arrays', async () => {
      const locations = [
        createMockLocation({ id: 'loc-1', pendingUpdate: true }),
      ];

      mockFileSystemService.readFile
        .mockResolvedValueOnce({
          locations,
          lastSyncTime: '2024-01-10T00:00:00.000Z',
          lastPulledVersion: 0,
        })
        .mockResolvedValueOnce({
          locations,
        });

      mockFileSystemService.writeFile.mockResolvedValue(true);

      const pushResult: EntitySyncResult = {
        entityId: 'loc-1',
        status: 'updated',
        serverUpdatedAt: mockServerTimestamp,
      };

      mockApiClient.batchSync.mockResolvedValue(
        createMockSyncResponse({
          pushResults: [
            {
              entityType: 'locations',
              results: [pushResult],
              newEntitiesFromServer: [],
              deletedEntityIds: [],
              errors: [],
              checkpoint: mockCheckpoint,
            },
          ],
        })
      );

      const result = await locationService.syncLocations(
        mockHomeId,
        mockApiClient as unknown as ApiClient,
        mockDeviceId
      );

      expect(result.updated).toHaveLength(1);
      expect(result.created).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
      expect(result.unchanged).toBe(false);
      expect(result.serverTimestamp).toBe(mockServerTimestamp);
    });

    it('should return empty delta when sync fails', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        locations: [],
      });

      mockApiClient.batchSync.mockResolvedValue({
        success: false,
        serverTimestamp: mockServerTimestamp,
      });

      const result = await locationService.syncLocations(
        mockHomeId,
        mockApiClient as unknown as ApiClient,
        mockDeviceId
      );

      expect(result.updated).toHaveLength(0);
      expect(result.created).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
      expect(result.unchanged).toBe(true);
    });

    it('should handle created locations from server in pull results', async () => {
      mockFileSystemService.readFile
        .mockResolvedValueOnce({
          locations: [],
          lastSyncTime: '2024-01-10T00:00:00.000Z',
          lastPulledVersion: 0,
        })
        .mockResolvedValueOnce({
          locations: [],
        });

      mockFileSystemService.writeFile.mockResolvedValue(true);

      const serverLocation: LocationServerData = {
        id: 'server-loc-1',
        homeId: mockHomeId,
        name: 'Server Location',
        icon: 'home',
      };

      mockApiClient.batchSync.mockResolvedValue(
        createMockSyncResponse({
          pullResults: [
            {
              entityType: 'locations',
              entities: [
                {
                  entityId: 'server-loc-1',
                  entityType: 'locations',
                  homeId: mockHomeId,
                  data: serverLocation as unknown as Record<string, unknown>,
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

      const result = await locationService.syncLocations(
        mockHomeId,
        mockApiClient as unknown as ApiClient,
        mockDeviceId
      );

      expect(result.created).toHaveLength(1);
      expect(result.created[0].id).toBe('server-loc-1');
    });

    it('should handle deleted locations from server in pull results', async () => {
      const locations = [createMockLocation({ id: 'loc-1' })];

      // First read returns locations, subsequent reads return the same (since we'll write before second read)
      mockFileSystemService.readFile.mockResolvedValue({
        locations,
        lastSyncTime: '2024-01-10T00:00:00.000Z',
        lastPulledVersion: 0,
      });

      mockFileSystemService.writeFile.mockResolvedValue(true);

      mockApiClient.batchSync.mockResolvedValue(
        createMockSyncResponse({
          pullResults: [
            {
              entityType: 'locations',
              entities: [],
              deletedEntityIds: ['loc-1'],
              checkpoint: mockCheckpoint,
            },
          ],
        })
      );

      const result = await locationService.syncLocations(
        mockHomeId,
        mockApiClient as unknown as ApiClient,
        mockDeviceId
      );

      expect(result.deleted).toContain('loc-1');
    });

    it('should return empty delta on network error', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        locations: [],
      });

      mockApiClient.batchSync.mockRejectedValue(new Error('Network error'));

      const result = await locationService.syncLocations(
        mockHomeId,
        mockApiClient as unknown as ApiClient,
        mockDeviceId
      );

      expect(result.updated).toHaveLength(0);
      expect(result.created).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
      expect(result.unchanged).toBe(true);
    });

    it('should not update local entity when it has pending changes during pull', async () => {
      const locations = [
        createMockLocation({
          id: 'loc-1',
          name: 'Local version',
          pendingUpdate: true,
        }),
      ];

      mockFileSystemService.readFile
        .mockResolvedValueOnce({
          locations,
          lastSyncTime: '2024-01-10T00:00:00.000Z',
          lastPulledVersion: 0,
        })
        .mockResolvedValueOnce({
          locations,
        });

      mockFileSystemService.writeFile.mockResolvedValue(true);

      const serverLocation: LocationServerData = {
        id: 'loc-1',
        homeId: mockHomeId,
        name: 'Server version',
        icon: 'home',
      };

      mockApiClient.batchSync.mockResolvedValue(
        createMockSyncResponse({
          pullResults: [
            {
              entityType: 'locations',
              entities: [
                {
                  entityId: 'loc-1',
                  entityType: 'locations',
                  homeId: mockHomeId,
                  data: serverLocation as unknown as Record<string, unknown>,
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

      const result = await locationService.syncLocations(
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
        locations: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockApiClient.batchSync.mockResolvedValue({
        success: true,
        serverTimestamp: '2024-01-15T12:00:00.000Z',
        pullResults: [
          {
            entityType: 'locations',
            entities: [],
            deletedEntityIds: [],
            checkpoint: {
              homeId: mockHomeId,
              entityType: 'locations',
              lastPulledVersion: 0,
            },
          },
        ],
      });

      await locationService.syncLocations(mockHomeId, mockApiClient as unknown as ApiClient, mockDeviceId);

      const callArgs = mockApiClient.batchSync.mock.calls[0] as unknown[];
      expect((callArgs[0] as { pullRequests: { entityType: SyncEntityType }[] }).pullRequests[0].entityType).toBe('locations');
    });

    it('should use correct filename', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        locations: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      await locationService.getAllLocations(mockHomeId);

      expect(mockFileSystemService.readFile).toHaveBeenCalledWith('locations.json', mockHomeId);
    });
  });
});
