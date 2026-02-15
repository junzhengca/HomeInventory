import { TodoItem } from '../types/inventory';
import {
  BaseSyncableEntityService,
  SyncableEntityConfig,
  CreateEntityInput,
} from './syncable/BaseSyncableEntityService';
import { generateTodoId } from '../utils/idGenerator';
import { ApiClient } from './ApiClient';
import { TodoItemServerData, SyncEntityType } from '../types/api';
import { SyncDelta } from '../types/sync';

// Base file name (FileSystemService appends _homeId for scoping)
const TODOS_FILE = 'todos.json';
const ENTITY_TYPE: SyncEntityType = 'todoItems';

interface CreateTodoInput {
  text: string;
  completed?: boolean;
  note?: string;
  categoryId?: string;
}

class TodoService extends BaseSyncableEntityService<TodoItem, TodoItemServerData> {
  constructor() {
    const config: SyncableEntityConfig<TodoItem, TodoItemServerData> = {
      entityType: ENTITY_TYPE,
      fileName: TODOS_FILE,
      entityName: 'todo',

      generateId: generateTodoId,

      toServerData: (todo) => ({
        id: todo.id,
        text: todo.text,
        completed: todo.completed,
        note: todo.note,
        categoryId: todo.categoryId,
        homeId: todo.homeId,
      }),

      fromServerData: (serverData, meta) => ({
        id: meta.entityId,
        homeId: meta.homeId,
        text: serverData.text,
        completed: serverData.completed,
        note: serverData.note,
        categoryId: serverData.categoryId,
        createdAt: meta.updatedAt,
        updatedAt: meta.updatedAt,
        version: meta.version,
        serverUpdatedAt: meta.updatedAt,
        clientUpdatedAt: meta.clientUpdatedAt,
        lastSyncedAt: meta.serverTimestamp,
      }),

      toSyncEntity: (todo, homeId) => ({
        entityId: todo.id,
        entityType: ENTITY_TYPE,
        homeId,
        data: {
          id: todo.id,
          text: todo.text,
          completed: todo.completed,
          note: todo.note,
          categoryId: todo.categoryId,
        },
        version: todo.version,
        clientUpdatedAt: todo.clientUpdatedAt,
        pendingCreate: !!todo.pendingCreate,
        pendingDelete: !!todo.pendingDelete,
      }),

      createEntity: (input, homeId, id, now) => ({
        id,
        homeId,
        text: input.text.trim(),
        completed: input.completed ?? false,
        note: input.note?.trim() || undefined,
        categoryId: input.categoryId,
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

      // Todo-specific: version check during push result processing
      skipPendingCreateCheck: true,
      // Todo-specific: preserve createdAt on pull
      preserveCreatedAtOnPull: true,
    };

    super(config);
  }

  /**
   * Toggle todo completion status
   */
  async toggleTodo(id: string, homeId: string): Promise<TodoItem | null> {
    const item = await this.getById(id, homeId);
    if (!item) return null;
    return this.update(id, { completed: !item.completed }, homeId);
  }

  // Method aliases for backward compatibility with components
  async getAllTodos(homeId: string): Promise<TodoItem[]> {
    return this.getAll(homeId);
  }

  async getAllTodosForSync(homeId: string): Promise<TodoItem[]> {
    return this.getAllForSync(homeId);
  }

  async getTodoById(id: string, homeId: string): Promise<TodoItem | null> {
    return this.getById(id, homeId);
  }

  async createTodo(
    input: CreateTodoInput,
    homeId: string
  ): Promise<TodoItem | null> {
    // Ensure completed is set for create
    const createInput = input.completed === undefined ? { ...input, completed: false } : input;
    return this.create(createInput as CreateEntityInput<TodoItem>, homeId);
  }

  async updateTodo(
    id: string,
    updates: Partial<Omit<TodoItem, 'id' | 'createdAt'>>,
    homeId: string
  ): Promise<TodoItem | null> {
    return this.update(id, updates, homeId);
  }

  async deleteTodo(id: string, homeId: string): Promise<boolean> {
    return this.delete(id, homeId);
  }

  async syncTodos(
    homeId: string,
    apiClient: ApiClient,
    deviceId: string
  ): Promise<SyncDelta<TodoItem>> {
    return this.sync(homeId, apiClient, deviceId);
  }
}

export const todoService = new TodoService();
export type { TodoService, CreateTodoInput };
