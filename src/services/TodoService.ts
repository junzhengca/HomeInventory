import { TodoItem } from '../types/inventory';
import { readFile, writeFile } from './FileSystemService';
import { generateTodoId } from '../utils/idGenerator';
import { ApiClient } from './ApiClient';
import {
  BatchSyncRequest,
  BatchSyncResponse,
  SyncEntity,
  BatchSyncPullRequest,
  BatchSyncPushRequest,
  TodoItemServerData
} from '../types/api';
import { syncLogger } from '../utils/Logger';

const TODOS_FILE = 'todos.json';

interface TodosData {
  todos: TodoItem[];
  lastSyncTime?: string;
  lastPulledVersion?: number;
}

/**
 * Get all todos (excluding deleted todos)
 */
export const getAllTodos = async (homeId?: string): Promise<TodoItem[]> => {
  const data = await readFile<TodosData>(TODOS_FILE, homeId);
  const todos = data?.todos || [];
  return todos.filter((todo) => !todo.deletedAt);
};

/**
 * Get all todos for sync (including deleted todos)
 */
export const getAllTodosForSync = async (homeId?: string): Promise<TodoItem[]> => {
  const data = await readFile<TodosData>(TODOS_FILE, homeId);
  return data?.todos || [];
};

/**
 * Get a single todo by ID (excluding deleted todos)
 */
export const getTodoById = async (id: string, homeId?: string): Promise<TodoItem | null> => {
  const todos = await getAllTodos(homeId);
  return todos.find((todo) => todo.id === id && !todo.deletedAt) || null;
};

/**
 * Create a new todo
 */
export const createTodo = async (text: string, homeId: string, note?: string): Promise<TodoItem | null> => {
  try {
    if (!homeId) {
      syncLogger.error('Error creating todo: homeId is required');
      return null;
    }

    const todos = await getAllTodosForSync(homeId);
    const now = new Date().toISOString();

    const newTodo: TodoItem = {
      id: generateTodoId(),
      homeId: homeId,
      text: text.trim(),
      completed: false,
      note: note?.trim() || undefined,
      createdAt: now,
      updatedAt: now,

      // Sync metadata
      version: 1,
      clientUpdatedAt: now,
      pendingCreate: true,
    };

    todos.push(newTodo);
    const success = await writeFile<TodosData>(TODOS_FILE, { todos }, homeId);

    return success ? newTodo : null;
  } catch (error) {
    syncLogger.error('Error creating todo:', error);
    return null;
  }
};

/**
 * Update an existing todo
 */
export const updateTodo = async (
  id: string,
  updates: Partial<Omit<TodoItem, 'id' | 'createdAt'>>,
  homeId?: string
): Promise<TodoItem | null> => {
  try {
    const data = await readFile<TodosData>(TODOS_FILE, homeId);
    const todos = data?.todos || [];
    const index = todos.findIndex((todo) => todo.id === id);

    if (index === -1) {
      return null;
    }

    const now = new Date().toISOString();

    // Preserve existing pending state if needed, or set to update
    const isPendingCreate = todos[index].pendingCreate;

    todos[index] = {
      ...todos[index],
      ...updates,
      updatedAt: now,
      // Sync metadata
      version: todos[index].version + 1,
      clientUpdatedAt: now,
      pendingUpdate: !isPendingCreate, // If it's pending create, it stays pending create
    };

    const success = await writeFile<TodosData>(TODOS_FILE, { ...data, todos }, homeId);

    return success ? todos[index] : null;
  } catch (error) {
    syncLogger.error('Error updating todo:', error);
    return null;
  }
};

/**
 * Delete a todo (soft delete - sets deletedAt timestamp)
 */
export const deleteTodo = async (id: string, homeId?: string): Promise<boolean> => {
  try {
    const data = await readFile<TodosData>(TODOS_FILE, homeId);
    const todos = data?.todos || [];
    const index = todos.findIndex((todo) => todo.id === id);

    if (index === -1) {
      return false; // Todo not found
    }

    // If already deleted, return true (idempotent)
    if (todos[index].deletedAt && !todos[index].pendingDelete) {
      return true;
    }

    // Soft delete: set deletedAt and update updatedAt
    const now = new Date().toISOString();
    const isPendingCreate = todos[index].pendingCreate;

    if (isPendingCreate) {
      // If it was never synced, just hard delete it
      todos.splice(index, 1);
    } else {
      todos[index] = {
        ...todos[index],
        deletedAt: now,
        updatedAt: now,
        version: todos[index].version + 1,
        clientUpdatedAt: now,
        pendingDelete: true,
        pendingUpdate: false, // delete overrides update
      };
    }

    const success = await writeFile<TodosData>(TODOS_FILE, { ...data, todos }, homeId);

    return success;
  } catch (error) {
    syncLogger.error('Error deleting todo:', error);
    return false;
  }
};

/**
 * Toggle todo completion status
 */
export const toggleTodo = async (id: string, homeId?: string): Promise<TodoItem | null> => {
  try {
    const data = await readFile<TodosData>(TODOS_FILE, homeId);
    const todos = data?.todos || [];
    const index = todos.findIndex((todo) => todo.id === id);

    if (index === -1) {
      return null;
    }

    const now = new Date().toISOString();
    const isPendingCreate = todos[index].pendingCreate;

    todos[index] = {
      ...todos[index],
      completed: !todos[index].completed,
      updatedAt: now,

      // Sync metadata
      version: todos[index].version + 1,
      clientUpdatedAt: now,
      pendingUpdate: !isPendingCreate,
    };

    const success = await writeFile<TodosData>(TODOS_FILE, { ...data, todos }, homeId);

    return success ? todos[index] : null;
  } catch (error) {
    syncLogger.error('Error toggling todo:', error);
    return null;
  }
};

/**
 * Sync todos with server
 */
export const syncTodos = async (
  homeId: string,
  apiClient: ApiClient,
  deviceId: string
): Promise<void> => {
  syncLogger.info('Starting todo sync...');
  try {
    const data = await readFile<TodosData>(TODOS_FILE, homeId);
    const todos = data?.todos || [];
    const lastSyncTime = data?.lastSyncTime;
    const lastPulledVersion = data?.lastPulledVersion || 0;

    // 1. Prepare Push Requests
    const pendingTodos = todos.filter(t => t.pendingCreate || t.pendingUpdate || t.pendingDelete);
    const pushRequests: BatchSyncPushRequest[] = [];

    if (pendingTodos.length > 0) {
      syncLogger.info(`Pushing ${pendingTodos.length} pending todos`);
      pushRequests.push({
        entityType: 'todoItems',
        entities: pendingTodos.map(t => ({
          entityId: t.id,
          entityType: 'todoItems',
          homeId: homeId,
          data: {
            id: t.id,
            text: t.text,
            completed: t.completed,
            note: t.note,
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
      entityType: 'todoItems',
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
        if (pushResult.entityType === 'todoItems') {
          for (const result of pushResult.results) {
            const index = todos.findIndex(t => t.id === result.entityId);
            if (index === -1) continue;

            if (result.status === 'created' || result.status === 'updated') {
              todos[index] = {
                ...todos[index],
                pendingCreate: false,
                pendingUpdate: false,
                pendingDelete: false,
                serverUpdatedAt: result.serverUpdatedAt,
                lastSyncedAt: response.serverTimestamp,
              };
              if (result.status === 'created' && result.serverVersion) {
                todos[index].version = result.serverVersion;
              }
            } else if (result.status === 'server_version' && result.winner === 'server') {
              // Server won, update local with server data
              if (result.serverVersionData) {
                const serverData = result.serverVersionData.data as unknown as TodoItemServerData;
                todos[index] = {
                  ...todos[index],
                  text: serverData.text,
                  completed: serverData.completed,
                  note: serverData.note,
                  version: result.serverVersionData.version,
                  serverUpdatedAt: result.serverVersionData.updatedAt,
                  lastSyncedAt: response.serverTimestamp,
                  pendingCreate: false,
                  pendingUpdate: false,
                };
              }
            } else if (result.status === 'deleted') {
              // Confirmed deletion
              // We keep it as soft deleted in local storage if we want to sync deletion to other devices
              // But since server confirmed it, we can just ensure it's marked deleted and not pending
              todos[index] = {
                ...todos[index],
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
        if (pullResult.entityType === 'todoItems') {
          // Update checkpoint
          if (pullResult.checkpoint.lastPulledVersion) {
            // We will update the file-level checkpoint at the end
          }

          // Handle new/updated entities
          for (const entity of pullResult.entities) {
            const index = todos.findIndex(t => t.id === entity.entityId);
            const serverData = entity.data as unknown as TodoItemServerData;

            const newTodo: TodoItem = {
              id: entity.entityId,
              homeId: entity.homeId,
              text: serverData.text,
              completed: serverData.completed,
              note: serverData.note,
              createdAt: entity.updatedAt, // Approximate if new
              updatedAt: entity.updatedAt,
              version: entity.version,
              serverUpdatedAt: entity.updatedAt,
              clientUpdatedAt: entity.clientUpdatedAt,
              lastSyncedAt: response.serverTimestamp,
            };

            if (index >= 0) {
              // If we have pending changes, server update might conflict. 
              // But usually push response handles conflicts for OUR changes.
              // Pull includes changes from OTHERS.
              // If we have pending changes that were NOT pushed (e.g. created after sync started? unlikely as we await),
              // Or if we decided not to push.
              // Here we blindly overwrite if not pending.
              if (!todos[index].pendingUpdate && !todos[index].pendingCreate && !todos[index].pendingDelete) {
                todos[index] = { ...todos[index], ...newTodo };
              }
            } else {
              todos.push(newTodo);
            }
          }

          // Handle deleted entities
          for (const deletedId of pullResult.deletedEntityIds) {
            const index = todos.findIndex(t => t.id === deletedId);
            if (index >= 0) {
              todos[index] = {
                ...todos[index],
                deletedAt: response.serverTimestamp, // Mark deleted
                pendingDelete: false // Server told us it's deleted
              };
            }
          }
        }
      }
    }

    // 6. Save changes
    const checkPoint = response.pullResults?.find(r => r.entityType === 'todoItems')?.checkpoint;
    const newLastPulledVersion = checkPoint?.lastPulledVersion ?? lastPulledVersion;

    await writeFile<TodosData>(TODOS_FILE, {
      todos,
      lastSyncTime: response.serverTimestamp,
      lastPulledVersion: newLastPulledVersion
    }, homeId);

    syncLogger.info('Todo sync complete');

  } catch (error) {
    syncLogger.error('Error syncing todos:', error);
  }
};

