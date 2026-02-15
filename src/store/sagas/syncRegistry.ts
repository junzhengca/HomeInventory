import { ActionCreatorWithPayload } from '@reduxjs/toolkit';
import { inventoryService } from '../../services/InventoryService';
import { categoryService } from '../../services/CategoryService';
import { locationService } from '../../services/LocationService';
import { todoService } from '../../services/TodoService';
import { todoCategoryService } from '../../services/TodoCategoryService';
import { addItems, upsertItems, removeItems } from '../slices/inventorySlice';
import { addTodos, upsertTodos, removeTodos, addTodoCategories, upsertTodoCategories, removeTodoCategories } from '../slices/todoSlice';
import { HomeScopedEntity } from '../../types/inventory';
import { SyncDelta } from '../../types/sync';
import { ApiClient } from '../../services/ApiClient';

/**
 * A delta-dispatched entity has batch Redux actions for granular state updates.
 */
export interface DeltaDispatchedEntity<T extends HomeScopedEntity> {
  key: string;
  syncMethod: (homeId: string, apiClient: ApiClient, deviceId: string) => Promise<SyncDelta<T>>;
  addAction: ActionCreatorWithPayload<T[]>;
  upsertAction: ActionCreatorWithPayload<T[]>;
  removeAction: ActionCreatorWithPayload<string[]>;
  /** Field name on Redux state used to check for pending items (e.g. 'inventory.items') */
  pendingStateSelector?: (state: unknown) => { pendingUpdate?: boolean; pendingCreate?: boolean; id: string }[];
}

/**
 * A storage-only entity syncs to storage but has no batch Redux actions.
 * The UI refreshes via triggerCategoryRefresh.
 */
export interface StorageOnlyEntity {
  key: string;
  syncMethod: (homeId: string, apiClient: ApiClient, deviceId: string) => Promise<SyncDelta<HomeScopedEntity>>;
}

export type SyncEntityEntry<T extends HomeScopedEntity = HomeScopedEntity> =
  | ({ type: 'delta' } & DeltaDispatchedEntity<T>)
  | ({ type: 'storage' } & StorageOnlyEntity);

/**
 * Registry of all syncable entity types.
 *
 * Delta-dispatched entities have batch Redux actions for granular state updates.
 * Storage-only entities sync to disk; the UI refreshes via triggerCategoryRefresh.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const syncRegistry: SyncEntityEntry<any>[] = [
  // Delta-dispatched entities
  {
    type: 'delta',
    key: 'inventoryItems',
    syncMethod: (homeId, apiClient, deviceId) =>
      inventoryService.syncItems(homeId, apiClient, deviceId),
    addAction: addItems,
    upsertAction: upsertItems,
    removeAction: removeItems,
  },
  {
    type: 'delta',
    key: 'todoItems',
    syncMethod: (homeId, apiClient, deviceId) =>
      todoService.syncTodos(homeId, apiClient, deviceId),
    addAction: addTodos,
    upsertAction: upsertTodos,
    removeAction: removeTodos,
  },
  {
    type: 'delta',
    key: 'todoCategories',
    syncMethod: (homeId, apiClient, deviceId) =>
      todoCategoryService.syncCategories(homeId, apiClient, deviceId),
    addAction: addTodoCategories,
    upsertAction: upsertTodoCategories,
    removeAction: removeTodoCategories,
  },
  // Storage-only entities (UI refreshes via triggerCategoryRefresh)
  {
    type: 'storage',
    key: 'categories',
    syncMethod: (homeId, apiClient, deviceId) =>
      categoryService.syncCategories(homeId, apiClient, deviceId),
  },
  {
    type: 'storage',
    key: 'locations',
    syncMethod: (homeId, apiClient, deviceId) =>
      locationService.syncLocations(homeId, apiClient, deviceId),
  },
];
