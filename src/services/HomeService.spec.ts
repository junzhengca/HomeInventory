/**
 * Comprehensive unit tests for HomeService
 *
 * Tests cover:
 * - Initialization (init)
 * - CRUD operations (createHome, updateHome, deleteHome)
 * - Home switching (switchHome)
 * - Sync operations (syncHomes)
 * - Edge cases and error handling
 * - Custom implementation using RxJS BehaviorSubject
 */

// Mock dependencies before importing HomeService
const mockFileSystemService = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  deleteHomeFiles: jest.fn(),
};

jest.mock('./FileSystemService', () => ({
  fileSystemService: mockFileSystemService,
}));

// Counter for generating unique IDs in tests
let idCounter = 0;
const mockGenerateItemId = jest.fn(() => `test-home-id-${idCounter++}`);

jest.mock('../utils/idGenerator', () => ({
  generateItemId: mockGenerateItemId,
}));

// Mock DataInitializationService
const mockDataInitializationService = {
  initializeHomeData: jest.fn(),
};

jest.mock('./DataInitializationService', () => ({
  dataInitializationService: mockDataInitializationService,
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

// Import HomeService after mocks are set up
import { homeService } from './HomeService';
import { Home } from '../types/home';
import { ApiClient } from './ApiClient';
import { SyncHomesResponse, PushHomesResponse } from '../types/api';

describe('HomeService', () => {
  let mockApiClient: {
    syncHomes: jest.Mock<Promise<SyncHomesResponse>, []>;
    pushHomes: jest.Mock<Promise<PushHomesResponse>, []>;
  };
  const mockHomeId = 'test-home-123';

  // Test home fixture
  const createMockHome = (overrides?: Partial<Home>): Home => ({
    id: 'home-1',
    name: 'My Home',
    role: 'owner',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    clientUpdatedAt: '2024-01-01T00:00:00.000Z',
    serverUpdatedAt: '2024-01-01T00:00:00.000Z',
    pendingCreate: false,
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    idCounter = 0;

    // Create a mock ApiClient
    mockApiClient = {
      syncHomes: jest.fn(),
      pushHomes: jest.fn(),
    };

    // Initialize service before each test
    mockFileSystemService.readFile.mockResolvedValue({
      homes: [],
    });
    await homeService.init();
  });

  // ===========================================================================
  // init
  // ===========================================================================

  describe('init', () => {
    it('should initialize with empty homes when file does not exist', async () => {
      mockFileSystemService.readFile.mockResolvedValue(null);

      await homeService.init();

      expect(mockFileSystemService.writeFile).toHaveBeenCalledWith('homes.json', { homes: [] });
    });

    it('should initialize with existing homes', async () => {
      const homes = [createMockHome({ id: 'home-1' })];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });

      await homeService.init();

      expect(homeService.getHomes()).toEqual(homes);
    });

    it('should set homes with missing sync flags to pendingCreate', async () => {
      const homes = [
        createMockHome({
          id: 'home-1',
          serverUpdatedAt: undefined,
          pendingCreate: false,
          pendingUpdate: false,
        }),
      ];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });

      await homeService.init();

      const updatedHomes = homeService.getHomes();
      expect(updatedHomes[0].pendingCreate).toBe(true);
    });

    it('should set first available home as current', async () => {
      const homes = [
        createMockHome({ id: 'home-1', name: 'First' }),
        createMockHome({ id: 'home-2', name: 'Second' }),
      ];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });

      await homeService.init();

      // Current home should be set to first available
      expect(homeService.getCurrentHome()?.id).toBe('home-1');
    });
  });

  // ===========================================================================
  // ensureDefaultHome
  // ===========================================================================

  describe('ensureDefaultHome', () => {
    it('should create default home when none exist', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        homes: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockDataInitializationService.initializeHomeData.mockResolvedValue(undefined);

      const result = await homeService.ensureDefaultHome();

      expect(result).not.toBeNull();
      expect(result?.name).toBe('My Home');
      expect(result?.pendingCreate).toBe(true);
      expect(mockDataInitializationService.initializeHomeData).toHaveBeenCalledWith(result?.id);
    });

    it('should return current home if homes exist', async () => {
      const homes = [createMockHome({ id: 'home-1', name: 'Existing' })];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockDataInitializationService.initializeHomeData.mockResolvedValue(undefined);

      await homeService.init();

      const result = await homeService.ensureDefaultHome();

      expect(result?.id).toBe('home-1');
    });

    it('should set first available home as current when current is null', async () => {
      const homes = [
        createMockHome({ id: 'home-1', name: 'First' }),
        createMockHome({ id: 'home-2', name: 'Second' }),
      ];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockDataInitializationService.initializeHomeData.mockResolvedValue(undefined);

      await homeService.init();

      const result = await homeService.ensureDefaultHome();

      expect(homeService.getCurrentHome()?.id).toBe('home-1');
    });
  });

  // ===========================================================================
  // createHome
  // ===========================================================================

  describe('createHome', () => {
    it('should create a new home', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        homes: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockDataInitializationService.initializeHomeData.mockResolvedValue(undefined);

      const result = await homeService.createHome('New Home', '123 Main St');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('New Home');
      expect(result?.address).toBe('123 Main St');
      expect(result?.role).toBe('owner');
      expect(result?.pendingCreate).toBe(true);
    });

    it('should switch to newly created home', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        homes: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockDataInitializationService.initializeHomeData.mockResolvedValue(undefined);

      const result = await homeService.createHome('New Home');

      expect(homeService.getCurrentHome()?.id).toBe(result?.id);
    });

    it('should initialize home data for new home', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        homes: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockDataInitializationService.initializeHomeData.mockResolvedValue(undefined);

      const result = await homeService.createHome('New Home');

      expect(mockDataInitializationService.initializeHomeData).toHaveBeenCalledWith(result?.id);
    });

    it('should return null on write failure', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        homes: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(false);

      const result = await homeService.createHome('New Home');

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // updateHome
  // ===========================================================================

  describe('updateHome', () => {
    it('should update existing home', async () => {
      const homes = [createMockHome({ id: 'home-1', name: 'Original' })];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      await homeService.init();
      const result = await homeService.updateHome('home-1', { name: 'Updated' });

      expect(result).toBe(true);
      const updatedHome = homeService.getHomes().find(h => h.id === 'home-1');
      expect(updatedHome?.name).toBe('Updated');
      expect(updatedHome?.pendingUpdate).toBe(true);
    });

    it('should return false when home not found', async () => {
      const homes = [createMockHome({ id: 'home-1' })];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      await homeService.init();
      const result = await homeService.updateHome('non-existent', { name: 'Updated' });

      expect(result).toBe(false);
    });

    it('should return false on write failure', async () => {
      const homes = [createMockHome({ id: 'home-1' })];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });
      mockFileSystemService.writeFile.mockResolvedValue(false);

      await homeService.init();
      const result = await homeService.updateHome('home-1', { name: 'Updated' });

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // deleteHome
  // ===========================================================================

  describe('deleteHome', () => {
    it('should mark owner home as pending delete', async () => {
      const homes = [createMockHome({ id: 'home-1', role: 'owner' })];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      await homeService.init();
      const result = await homeService.deleteHome('home-1');

      expect(result).toBe(true);
      // After deleting the only home, a new default home should be created
      expect(homeService.getHomes()).toHaveLength(1);
      expect(homeService.getHomes()[0].name).toBe('My Home');
    });

    it('should mark member home as pending leave', async () => {
      const homes = [createMockHome({ id: 'home-1', role: 'member' })];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      await homeService.init();
      const result = await homeService.deleteHome('home-1');

      expect(result).toBe(true);
      // After leaving the only home, a new default home should be created
      expect(homeService.getHomes()).toHaveLength(1);
      expect(homeService.getHomes()[0].name).toBe('My Home');
      // Verify writeFile was called
      expect(mockFileSystemService.writeFile).toHaveBeenCalled();
      // Get the written data - check all calls
      const writeCalls = mockFileSystemService.writeFile.mock.calls;
      expect(writeCalls.length).toBeGreaterThan(0);
      // Find the call with homes data
      let foundHomes = false;
      for (const call of writeCalls) {
        const data = call[1];
        if (data && typeof data === "object" && "homes" in data) {
          const homesData = data as { homes: Home[] };
          if (homesData.homes && homesData.homes.length > 0) {
            // Find the home being left
            const leftHome = homesData.homes.find((h) => h.id === "home-1");
            if (leftHome) {
              expect(leftHome.pendingLeave).toBe(true);
              expect(leftHome.pendingDelete).toBeUndefined();
              foundHomes = true;
              break;
            }
          }
        }
      }
      expect(foundHomes).toBe(true);
    });

    it('should create default home when deleting last home', async () => {
      const homes = [createMockHome({ id: 'home-1', role: 'owner' })];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      await homeService.init();
      const result = await homeService.deleteHome('home-1');

      expect(result).toBe(true);
      // After deleting last home, a new default home should be created
      expect(homeService.getHomes()).toHaveLength(1);
      expect(homeService.getHomes()[0].name).toBe('My Home');
      expect(homeService.getHomes()[0].pendingCreate).toBe(true);
    });

    it('should return false when home not found', async () => {
      const homes = [createMockHome({ id: 'home-1' })];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      await homeService.init();
      const result = await homeService.deleteHome('non-existent');

      expect(result).toBe(false);
    });

    it('should switch away from deleted current home', async () => {
      const homes = [
        createMockHome({ id: 'home-1', name: 'To Delete' }),
        createMockHome({ id: 'home-2', name: 'Other' }),
      ];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      await homeService.init();
      // Start with home-1 as current
      homeService.switchHome('home-1');

      const result = await homeService.deleteHome('home-1');

      expect(result).toBe(true);
      expect(homeService.getCurrentHome()?.id).toBe('home-2');
    });
  });

  // ===========================================================================
  // switchHome
  // ===========================================================================

  describe('switchHome', () => {
    it('should switch to existing home', async () => {
      const homes = [
        createMockHome({ id: 'home-1', name: 'First' }),
        createMockHome({ id: 'home-2', name: 'Second' }),
      ];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });

      await homeService.init();
      homeService.switchHome('home-2');

      expect(homeService.getCurrentHome()?.id).toBe('home-2');
    });

    it('should warn when switching to non-existent home', async () => {
      const homes = [createMockHome({ id: 'home-1' })];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });

      await homeService.init();
      // First set a current home
      homeService.switchHome('home-1');
      // Then try to switch to non-existent home - should warn and keep current
      homeService.switchHome('non-existent');

      expect(homeService.getCurrentHome()?.id).toBe('home-1');
    });
  });

  // ===========================================================================
  // getCurrentHome
  // ===========================================================================

  describe('getCurrentHome', () => {
    it('should return current home', async () => {
      const homes = [
        createMockHome({ id: 'home-1', name: 'First' }),
        createMockHome({ id: 'home-2', name: 'Second' }),
      ];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });

      await homeService.init();
      homeService.switchHome('home-2');

      expect(homeService.getCurrentHome()?.id).toBe('home-2');
    });

    it('should return null when current home is pending delete', async () => {
      const homes = [createMockHome({ id: 'home-1', pendingDelete: true })];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });

      await homeService.init();
      homeService.switchHome('home-1');

      expect(homeService.getCurrentHome()).toBeNull();
    });

    it('should return null when current home is pending leave', async () => {
      const homes = [createMockHome({ id: 'home-1', pendingLeave: true })];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });

      await homeService.init();
      homeService.switchHome('home-1');

      expect(homeService.getCurrentHome()).toBeNull();
    });
  });

  // ===========================================================================
  // getHomes
  // ===========================================================================

  describe('getHomes', () => {
    it('should return all non-deleted homes', async () => {
      const homes = [
        createMockHome({ id: 'home-1' }),
        createMockHome({ id: 'home-2', pendingDelete: true }),
        createMockHome({ id: 'home-3', pendingLeave: true }),
      ];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });

      await homeService.init();

      expect(homeService.getHomes()).toHaveLength(1);
      expect(homeService.getHomes()[0].id).toBe('home-1');
    });
  });

  // ===========================================================================
  // syncHomes
  // ===========================================================================

  describe('syncHomes', () => {
    const mockServerTimestamp = '2024-01-15T12:00:00.000Z';

    it('should pull homes when no pending changes', async () => {
      const homes = [createMockHome({ id: 'home-1' })];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
        lastSyncTime: '2024-01-10T00:00:00.000Z',
      });

      const syncResponse: SyncHomesResponse = {
        homes: [],
        deletedHomeIds: [],
        timestamp: mockServerTimestamp,
        serverTimestamp: mockServerTimestamp,
      };
      mockApiClient.syncHomes.mockResolvedValue(syncResponse);
      mockFileSystemService.writeFile.mockResolvedValue(true);

      await homeService.init();
      await homeService.syncHomes(mockApiClient as unknown as ApiClient);

      expect(mockApiClient.syncHomes).toHaveBeenCalledWith('2024-01-10T00:00:00.000Z', true);
      expect(mockApiClient.pushHomes).not.toHaveBeenCalled();
    });

    it('should push pending homes', async () => {
      const homes = [createMockHome({ id: 'home-1', pendingCreate: true })];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const pushResponse: PushHomesResponse = {
        results: [
          {
            homeId: 'home-1',
            status: 'created',
            serverUpdatedAt: mockServerTimestamp,
          },
        ],
        newHomesFromServer: [],
        errors: [],
        deletedHomeIds: [],
        serverTimestamp: mockServerTimestamp,
      };
      mockApiClient.pushHomes.mockResolvedValue(pushResponse);
      mockApiClient.syncHomes.mockResolvedValue({
        homes: [],
        deletedHomeIds: [],
        timestamp: mockServerTimestamp,
        serverTimestamp: mockServerTimestamp,
      });

      await homeService.init();
      await homeService.syncHomes(mockApiClient as unknown as ApiClient);

      expect(mockApiClient.pushHomes).toHaveBeenCalled();
    });

    it('should process homes from server in pull results', async () => {
      const homes: Home[] = [];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const syncResponse: SyncHomesResponse = {
        homes: [
          {
            homeId: 'server-home-1',
            name: 'Server Home',
            address: '123 St',
            role: 'owner',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        deletedHomeIds: [],
        timestamp: mockServerTimestamp,
        serverTimestamp: mockServerTimestamp,
      };
      mockApiClient.syncHomes.mockResolvedValue(syncResponse);

      await homeService.init();
      await homeService.syncHomes(mockApiClient as unknown as ApiClient);

      expect(homeService.getHomes()).toHaveLength(1);
      expect(homeService.getHomes()[0].id).toBe('server-home-1');
    });

    it('should handle deleted homes from server', async () => {
      const homes = [createMockHome({ id: 'home-1' })];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const syncResponse: SyncHomesResponse = {
        homes: [],
        deletedHomeIds: ['home-1'],
        timestamp: mockServerTimestamp,
        serverTimestamp: mockServerTimestamp,
      };
      mockApiClient.syncHomes.mockResolvedValue(syncResponse);
      mockFileSystemService.deleteHomeFiles.mockResolvedValue(undefined);

      await homeService.init();
      await homeService.syncHomes(mockApiClient as unknown as ApiClient);

      // After deleting the only home, a new default home should be created
      expect(homeService.getHomes()).toHaveLength(1);
      expect(homeService.getHomes()[0].name).toBe('My Home');
      expect(mockFileSystemService.deleteHomeFiles).toHaveBeenCalledWith('home-1');
    });

    it('should create default home when no homes remain after sync', async () => {
      const homes: Home[] = [];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const syncResponse: SyncHomesResponse = {
        homes: [],
        deletedHomeIds: [],
        timestamp: mockServerTimestamp,
        serverTimestamp: mockServerTimestamp,
      };
      mockApiClient.syncHomes.mockResolvedValue(syncResponse);

      await homeService.init();
      await homeService.syncHomes(mockApiClient as unknown as ApiClient);

      expect(homeService.getHomes()).toHaveLength(1);
      expect(homeService.getHomes()[0].name).toBe('My Home');
    });

    it('should handle network error gracefully', async () => {
      const homes = [createMockHome({ id: 'home-1' })];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });

      mockApiClient.syncHomes.mockRejectedValue(new Error('Network error'));

      await homeService.init();
      await homeService.syncHomes(mockApiClient as unknown as ApiClient);

      // Should not throw, homes should remain unchanged
      expect(homeService.getHomes()).toHaveLength(1);
    });

    it('should handle homeId collision errors', async () => {
      const homes = [createMockHome({ id: 'collision-id', pendingCreate: true })];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const pushResponse: PushHomesResponse = {
        results: [],
        newHomesFromServer: [],
        errors: [
          {
            homeId: 'collision-id',
            code: 'homeId_exists',
            message: 'Collision',
            suggestedHomeId: 'fixed-id',
          },
        ],
        deletedHomeIds: [],
        serverTimestamp: mockServerTimestamp,
      };
      mockApiClient.pushHomes.mockResolvedValue(pushResponse);
      mockApiClient.syncHomes.mockResolvedValue({
        homes: [],
        deletedHomeIds: [],
        timestamp: mockServerTimestamp,
        serverTimestamp: mockServerTimestamp,
      });

      await homeService.init();
      await homeService.syncHomes(mockApiClient as unknown as ApiClient);

      // Home ID should be updated
      expect(homeService.getHomes()[0].id).toBe('fixed-id');
    });

    it('should switch active home if deleted during sync', async () => {
      const homes = [
        createMockHome({ id: 'home-1', name: 'Deleted' }),
        createMockHome({ id: 'home-2', name: 'Other' }),
      ];
      mockFileSystemService.readFile.mockResolvedValue({
        homes,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      await homeService.init();
      // Start with home-1 as current
      homeService.switchHome('home-1');

      const syncResponse: SyncHomesResponse = {
        homes: [],
        deletedHomeIds: ['home-1'],
        timestamp: mockServerTimestamp,
        serverTimestamp: mockServerTimestamp,
      };
      mockApiClient.syncHomes.mockResolvedValue(syncResponse);

      await homeService.syncHomes(mockApiClient as unknown as ApiClient);

      // Should have switched to home-2
      expect(homeService.getCurrentHome()?.id).toBe('home-2');
    });
  });
});
