/**
 * Comprehensive unit tests for TodoService
 *
 * Tests cover:
 * - CRUD operations (getAll, getById, create, update, delete)
 * - Todo-specific operations (toggleTodo)
 * - Backward compatibility methods (getAllTodos, createTodo, etc.)
 * - Sync operations (syncTodos)
 * - Edge cases and error handling
 * - Interaction with BaseSyncableEntityService
 */

// Mock dependencies before importing TodoService
const mockFileSystemService = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
};

jest.mock('./FileSystemService', () => ({
  fileSystemService: mockFileSystemService,
}));

const mockGenerateTodoId = jest.fn(() => 'test-todo-id-123');

jest.mock('../utils/idGenerator', () => ({
  generateTodoId: mockGenerateTodoId,
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

// Import TodoService after mocks are set up
import { todoService, CreateTodoInput } from './TodoService';
import { TodoItem } from '../types/inventory';
import { ApiClient } from './ApiClient';
import {
  TodoItemServerData,
  SyncEntityType,
  BatchSyncResponse,
  EntitySyncResult,
} from '../types/api';
import { SyncDelta } from '../types/sync';

describe('TodoService', () => {
  let mockApiClient: {
    batchSync: jest.Mock<Promise<BatchSyncResponse>, []>;
  };
  const mockHomeId = 'test-home-123';
  const mockDeviceId = 'test-device-456';

  // Test todo item fixture
  const createMockTodo = (overrides?: Partial<TodoItem>): TodoItem => ({
    id: 'todo-1',
    homeId: mockHomeId,
    text: 'Buy groceries',
    completed: false,
    note: 'Milk, eggs, bread',
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
    it('should return all non-deleted todos for a home', async () => {
      const todos = [
        createMockTodo({ id: 'todo-1', text: 'Task 1' }),
        createMockTodo({ id: 'todo-2', text: 'Task 2' }),
        createMockTodo({ id: 'todo-3', text: 'Task 3', deletedAt: '2024-01-02T00:00:00.000Z' }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });

      const result = await todoService.getAll(mockHomeId);

      expect(mockFileSystemService.readFile).toHaveBeenCalledWith('todos.json', mockHomeId);
      expect(result).toHaveLength(2);
      expect(result.every((t) => !t.deletedAt)).toBe(true);
      expect(result.map((t) => t.id)).toEqual(['todo-1', 'todo-2']);
    });

    it('should return empty array when file does not exist', async () => {
      mockFileSystemService.readFile.mockResolvedValue(null);

      const result = await todoService.getAll(mockHomeId);

      expect(result).toEqual([]);
    });

    it('should return empty array when file has no todos', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        todos: [],
      });

      const result = await todoService.getAll(mockHomeId);

      expect(result).toEqual([]);
    });

    it('should throw error when homeId is not provided', async () => {
      await expect(todoService.getAll('')).rejects.toThrow('homeId is required to get todo');
    });

    it('should throw error when homeId is undefined', async () => {
      await expect(
        todoService.getAll(undefined as unknown as string)
      ).rejects.toThrow('homeId is required to get todo');
    });
  });

  // ===========================================================================
  // getAllForSync
  // ===========================================================================

  describe('getAllForSync', () => {
    it('should return all todos including deleted for sync', async () => {
      const todos = [
        createMockTodo({ id: 'todo-1', deletedAt: '2024-01-02T00:00:00.000Z' }),
        createMockTodo({ id: 'todo-2', deletedAt: undefined }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });

      const result = await todoService.getAllForSync(mockHomeId);

      expect(result).toHaveLength(2);
    });
  });

  // ===========================================================================
  // getById
  // ===========================================================================

  describe('getById', () => {
    it('should return todo by id', async () => {
      const todos = [
        createMockTodo({ id: 'todo-1', text: 'Task 1' }),
        createMockTodo({ id: 'todo-2', text: 'Task 2' }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });

      const result = await todoService.getById('todo-1', mockHomeId);

      expect(result).toEqual(todos[0]);
    });

    it('should return null when todo not found', async () => {
      const todos = [createMockTodo({ id: 'todo-1', text: 'Task 1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });

      const result = await todoService.getById('non-existent', mockHomeId);

      expect(result).toBeNull();
    });

    it('should not return deleted todos', async () => {
      const todos = [
        createMockTodo({ id: 'todo-1', deletedAt: '2024-01-02T00:00:00.000Z' }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });

      const result = await todoService.getById('todo-1', mockHomeId);

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // create
  // ===========================================================================

  describe('create', () => {
    it('should create a new todo with all fields', async () => {
      const input = {
        text: '  New todo  ',
        completed: true,
        note: 'Test note',
        categoryId: 'cat-1',
      };

      mockFileSystemService.readFile.mockResolvedValue({
        todos: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await todoService.create(input, mockHomeId);

      expect(result).not.toBeNull();
      expect(result?.text).toBe('New todo'); // Trimmed
      expect(result?.completed).toBe(true);
      expect(result?.note).toBe('Test note');
      expect(result?.categoryId).toBe('cat-1');
      expect(result?.pendingCreate).toBe(true);
      expect(result?.homeId).toBe(mockHomeId);
      expect(result?.version).toBe(1);
    });

    it('should trim text input when creating todo', async () => {
      const input = {
        text: '  Spaces around  ',
        completed: false,
      };

      mockFileSystemService.readFile.mockResolvedValue({
        todos: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await todoService.create(input, mockHomeId);

      expect(result?.text).toBe('Spaces around');
    });

    it('should create todo with undefined note when note is empty string', async () => {
      const input = {
        text: 'Test',
        completed: false,
        note: '  ', // Whitespace only
      };

      mockFileSystemService.readFile.mockResolvedValue({
        todos: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await todoService.create(input, mockHomeId);

      expect(result?.note).toBeUndefined();
    });

    it('should return null when write fails', async () => {
      const input = {
        text: 'Test',
        completed: false,
      };

      mockFileSystemService.readFile.mockResolvedValue({
        todos: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(false);

      const result = await todoService.create(input, mockHomeId);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      const input = {
        text: 'Test',
        completed: false,
      };

      mockFileSystemService.readFile.mockRejectedValue(new Error('Read error'));

      const result = await todoService.create(input, mockHomeId);

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // update
  // ===========================================================================

  describe('update', () => {
    it('should update existing todo', async () => {
      const todos = [createMockTodo({ id: 'todo-1', text: 'Original', completed: false })];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await todoService.update('todo-1', { text: 'Updated' }, mockHomeId);

      expect(result?.text).toBe('Updated');
      expect(result?.completed).toBe(false); // Unchanged
      expect(result?.pendingUpdate).toBe(true);
      expect(result?.version).toBe(2); // Incremented
    });

    it('should set pendingUpdate to false when updating pendingCreate todo', async () => {
      const todos = [
        createMockTodo({ id: 'todo-1', pendingCreate: true, pendingUpdate: false }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await todoService.update('todo-1', { text: 'Updated' }, mockHomeId);

      expect(result?.pendingUpdate).toBe(false);
      expect(result?.pendingCreate).toBe(true); // Still true
    });

    it('should return null when todo not found', async () => {
      const todos = [createMockTodo({ id: 'todo-1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await todoService.update('non-existent', { text: 'Updated' }, mockHomeId);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      const todos = [createMockTodo({ id: 'todo-1' })];

      mockFileSystemService.readFile.mockRejectedValue(new Error('Error'));

      const result = await todoService.update('todo-1', { text: 'Updated' }, mockHomeId);

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // delete
  // ===========================================================================

  describe('delete', () => {
    it('should soft delete existing todo', async () => {
      const todos = [createMockTodo({ id: 'todo-1', pendingCreate: false })];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await todoService.delete('todo-1', mockHomeId);

      expect(result).toBe(true);
      const writtenData = mockFileSystemService.writeFile.mock.calls[0][1] as {
        todos: TodoItem[];
      };
      expect(writtenData.todos[0].deletedAt).toBeDefined();
    });

    it('should hard delete pendingCreate todo', async () => {
      const todos = [createMockTodo({ id: 'todo-1', pendingCreate: true })];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await todoService.delete('todo-1', mockHomeId);

      expect(result).toBe(true);
      // Check that todo was removed from array
      const writtenData = mockFileSystemService.writeFile.mock.calls[0][1] as {
        todos: TodoItem[];
      };
      expect(writtenData.todos).toHaveLength(0);
    });

    it('should return true when todo is already deleted (idempotent)', async () => {
      const todos = [
        createMockTodo({
          id: 'todo-1',
          deletedAt: '2024-01-02T00:00:00.000Z',
          pendingDelete: true,
        }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await todoService.delete('todo-1', mockHomeId);

      expect(result).toBe(true);
    });

    it('should return false when todo not found', async () => {
      const todos = [createMockTodo({ id: 'todo-1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await todoService.delete('non-existent', mockHomeId);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockFileSystemService.readFile.mockRejectedValue(new Error('Error'));

      const result = await todoService.delete('todo-1', mockHomeId);

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // toggleTodo
  // ===========================================================================

  describe('toggleTodo', () => {
    it('should toggle completed from false to true', async () => {
      const todos = [createMockTodo({ id: 'todo-1', completed: false })];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await todoService.toggleTodo('todo-1', mockHomeId);

      expect(result?.completed).toBe(true);
    });

    it('should toggle completed from true to false', async () => {
      const todos = [createMockTodo({ id: 'todo-1', completed: true })];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await todoService.toggleTodo('todo-1', mockHomeId);

      expect(result?.completed).toBe(false);
    });

    it('should return null when todo not found', async () => {
      const todos = [createMockTodo({ id: 'todo-1', completed: false })];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await todoService.toggleTodo('non-existent', mockHomeId);

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // Backward Compatibility Methods (aliases)
  // ===========================================================================

  describe('getAllTodos', () => {
    it('should be an alias for getAll', async () => {
      const todos = [createMockTodo({ id: 'todo-1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });

      const result = await todoService.getAllTodos(mockHomeId);

      expect(result).toEqual(todos.filter((t) => !t.deletedAt));
    });
  });

  describe('getAllTodosForSync', () => {
    it('should be an alias for getAllForSync', async () => {
      const todos = [
        createMockTodo({ id: 'todo-1', deletedAt: '2024-01-02T00:00:00.000Z' }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });

      const result = await todoService.getAllTodosForSync(mockHomeId);

      expect(result).toEqual(todos);
    });
  });

  describe('getTodoById', () => {
    it('should be an alias for getById', async () => {
      const todos = [createMockTodo({ id: 'todo-1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });

      const result = await todoService.getTodoById('todo-1', mockHomeId);

      expect(result).toEqual(todos[0]);
    });
  });

  describe('createTodo', () => {
    it('should set completed to false when not provided', async () => {
      const input: CreateTodoInput = {
        text: 'Test todo',
      };

      mockFileSystemService.readFile.mockResolvedValue({
        todos: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      await todoService.createTodo(input, mockHomeId);

      const writtenData = mockFileSystemService.writeFile.mock.calls[0][1] as {
        todos: TodoItem[];
      };
      expect(writtenData.todos[0].completed).toBe(false);
    });

    it('should preserve completed status when provided', async () => {
      const input: CreateTodoInput = {
        text: 'Test todo',
        completed: true,
      };

      mockFileSystemService.readFile.mockResolvedValue({
        todos: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      await todoService.createTodo(input, mockHomeId);

      const writtenData = mockFileSystemService.writeFile.mock.calls[0][1] as {
        todos: TodoItem[];
      };
      expect(writtenData.todos[0].completed).toBe(true);
    });
  });

  describe('updateTodo', () => {
    it('should be an alias for update', async () => {
      const todos = [createMockTodo({ id: 'todo-1', text: 'Original' })];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await todoService.updateTodo('todo-1', { text: 'Updated' }, mockHomeId);

      expect(result?.text).toBe('Updated');
    });
  });

  describe('deleteTodo', () => {
    it('should be an alias for delete', async () => {
      const todos = [createMockTodo({ id: 'todo-1' })];

      mockFileSystemService.readFile.mockResolvedValue({
        todos,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await todoService.deleteTodo('todo-1', mockHomeId);

      expect(result).toBe(true);
    });
  });

  // ===========================================================================
  // syncTodos
  // ===========================================================================

  describe('syncTodos', () => {
    const mockServerTimestamp = '2024-01-15T12:00:00.000Z';
    const mockCheckpoint = {
      homeId: mockHomeId,
      entityType: 'todoItems' as SyncEntityType,
      lastPulledVersion: 5,
    };

    const createMockSyncResponse = (
      overrides?: Partial<BatchSyncResponse>
    ): BatchSyncResponse => ({
      success: true,
      serverTimestamp: mockServerTimestamp,
      pullResults: [
        {
          entityType: 'todoItems' as SyncEntityType,
          entities: [],
          deletedEntityIds: [],
          checkpoint: mockCheckpoint,
        },
      ],
      pushResults: [
        {
          entityType: 'todoItems' as SyncEntityType,
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
        todos: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockApiClient.batchSync.mockResolvedValue(createMockSyncResponse());

      await todoService.syncTodos(mockHomeId, mockApiClient as unknown as ApiClient, mockDeviceId);

      expect(mockApiClient.batchSync).toHaveBeenCalledWith({
        homeId: mockHomeId,
        deviceId: mockDeviceId,
        pullRequests: [
          {
            entityType: 'todoItems',
            since: undefined,
            includeDeleted: true,
            checkpoint: { lastPulledVersion: 0 },
          },
        ],
        pushRequests: undefined,
      });
    });

    it('should include pending todos in push request', async () => {
      const pendingTodos = [
        createMockTodo({ id: 'todo-1', pendingCreate: true }),
        createMockTodo({ id: 'todo-2', pendingUpdate: true }),
        createMockTodo({ id: 'todo-3', pendingDelete: true }),
      ];

      mockFileSystemService.readFile.mockResolvedValue({
        todos: pendingTodos,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockApiClient.batchSync.mockResolvedValue(createMockSyncResponse());

      await todoService.syncTodos(mockHomeId, mockApiClient as unknown as ApiClient, mockDeviceId);

      const callArgs = mockApiClient.batchSync.mock.calls[0] as unknown[];
      expect((callArgs[0] as { pushRequests: { entities: unknown[] }[] }).pushRequests[0].entities).toHaveLength(3);
    });

    it('should use since and checkpoint from file for sync', async () => {
      const lastSyncTime = '2024-01-10T00:00:00.000Z';
      const lastPulledVersion = 10;

      mockFileSystemService.readFile.mockResolvedValue({
        todos: [],
        lastSyncTime,
        lastPulledVersion,
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockApiClient.batchSync.mockResolvedValue(createMockSyncResponse());

      await todoService.syncTodos(mockHomeId, mockApiClient as unknown as ApiClient, mockDeviceId);

      const callArgs = mockApiClient.batchSync.mock.calls[0] as unknown[];
      const pullRequest = (callArgs[0] as { pullRequests: { since: string; checkpoint: { lastPulledVersion: number } }[] }).pullRequests[0];
      expect(pullRequest.since).toBe(lastSyncTime);
      expect(pullRequest.checkpoint.lastPulledVersion).toBe(lastPulledVersion);
    });

    it('should return SyncDelta with updated, created, deleted, confirmed arrays', async () => {
      const todos = [
        createMockTodo({ id: 'todo-1', pendingUpdate: true }),
      ];

      mockFileSystemService.readFile
        .mockResolvedValueOnce({
          todos,
          lastSyncTime: '2024-01-10T00:00:00.000Z',
          lastPulledVersion: 0,
        })
        .mockResolvedValueOnce({
          todos,
        });

      mockFileSystemService.writeFile.mockResolvedValue(true);

      const pushResult: EntitySyncResult = {
        entityId: 'todo-1',
        status: 'updated',
        serverUpdatedAt: mockServerTimestamp,
      };

      mockApiClient.batchSync.mockResolvedValue(
        createMockSyncResponse({
          pushResults: [
            {
              entityType: 'todoItems',
              results: [pushResult],
              newEntitiesFromServer: [],
              deletedEntityIds: [],
              errors: [],
              checkpoint: mockCheckpoint,
            },
          ],
        })
      );

      const result = await todoService.syncTodos(
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
        todos: [],
      });

      mockApiClient.batchSync.mockResolvedValue({
        success: false,
        serverTimestamp: mockServerTimestamp,
      });

      const result = await todoService.syncTodos(
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

    it('should handle created todos from server in pull results', async () => {
      mockFileSystemService.readFile
        .mockResolvedValueOnce({
          todos: [],
          lastSyncTime: '2024-01-10T00:00:00.000Z',
          lastPulledVersion: 0,
        })
        .mockResolvedValueOnce({
          todos: [],
        });

      mockFileSystemService.writeFile.mockResolvedValue(true);

      const serverTodo: TodoItemServerData = {
        id: 'server-todo-1',
        homeId: mockHomeId,
        text: 'Server todo',
        completed: false,
      };

      mockApiClient.batchSync.mockResolvedValue(
        createMockSyncResponse({
          pullResults: [
            {
              entityType: 'todoItems',
              entities: [
                {
                  entityId: 'server-todo-1',
                  entityType: 'todoItems',
                  homeId: mockHomeId,
                  data: serverTodo as unknown as Record<string, unknown>,
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

      const result = await todoService.syncTodos(
        mockHomeId,
        mockApiClient as unknown as ApiClient,
        mockDeviceId
      );

      expect(result.created).toHaveLength(1);
      expect(result.created[0].id).toBe('server-todo-1');
    });

    it('should handle deleted todos from server in pull results', async () => {
      const todos = [createMockTodo({ id: 'todo-1' })];

      mockFileSystemService.readFile
        .mockResolvedValueOnce({
          todos,
          lastSyncTime: '2024-01-10T00:00:00.000Z',
          lastPulledVersion: 0,
        })
        .mockResolvedValueOnce({
          todos: [],
        });

      mockFileSystemService.writeFile.mockResolvedValue(true);

      mockApiClient.batchSync.mockResolvedValue(
        createMockSyncResponse({
          pullResults: [
            {
              entityType: 'todoItems',
              entities: [],
              deletedEntityIds: ['todo-1'],
              checkpoint: mockCheckpoint,
            },
          ],
        })
      );

      const result = await todoService.syncTodos(
        mockHomeId,
        mockApiClient as unknown as ApiClient,
        mockDeviceId
      );

      expect(result.deleted).toContain('todo-1');
    });

    it('should return empty delta on network error', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        todos: [],
      });

      mockApiClient.batchSync.mockRejectedValue(new Error('Network error'));

      const result = await todoService.syncTodos(
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
      const todos = [
        createMockTodo({
          id: 'todo-1',
          text: 'Local version',
          pendingUpdate: true,
        }),
      ];

      mockFileSystemService.readFile
        .mockResolvedValueOnce({
          todos,
          lastSyncTime: '2024-01-10T00:00:00.000Z',
          lastPulledVersion: 0,
        })
        .mockResolvedValueOnce({
          todos,
        });

      mockFileSystemService.writeFile.mockResolvedValue(true);

      const serverTodo: TodoItemServerData = {
        id: 'todo-1',
        homeId: mockHomeId,
        text: 'Server version',
        completed: false,
      };

      mockApiClient.batchSync.mockResolvedValue(
        createMockSyncResponse({
          pullResults: [
            {
              entityType: 'todoItems',
              entities: [
                {
                  entityId: 'todo-1',
                  entityType: 'todoItems',
                  homeId: mockHomeId,
                  data: serverTodo as unknown as Record<string, unknown>,
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

      const result = await todoService.syncTodos(
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
        todos: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);
      mockApiClient.batchSync.mockResolvedValue({
        success: true,
        serverTimestamp: '2024-01-15T12:00:00.000Z',
        pullResults: [
          {
            entityType: 'todoItems',
            entities: [],
            deletedEntityIds: [],
            checkpoint: {
              homeId: mockHomeId,
              entityType: 'todoItems',
              lastPulledVersion: 0,
            },
          },
        ],
      });

      await todoService.syncTodos(mockHomeId, mockApiClient as unknown as ApiClient, mockDeviceId);

      const callArgs = mockApiClient.batchSync.mock.calls[0] as unknown[];
      expect((callArgs[0] as { pullRequests: { entityType: SyncEntityType }[] }).pullRequests[0].entityType).toBe('todoItems');
    });

    it('should use correct filename', async () => {
      mockFileSystemService.readFile.mockResolvedValue({
        todos: [],
      });
      mockFileSystemService.writeFile.mockResolvedValue(true);

      await todoService.getAll(mockHomeId);

      expect(mockFileSystemService.readFile).toHaveBeenCalledWith('todos.json', mockHomeId);
    });
  });
});
