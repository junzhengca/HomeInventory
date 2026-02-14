import { call, put, select, takeLatest, delay, spawn } from 'redux-saga/effects';
import {
  setItems,
  silentSetItems,
  addItem as addItemSlice,
  updateItem as updateItemSlice,
  removeItem as removeItemSlice,
  setLoading,
} from '../slices/inventorySlice';
import { triggerCategoryRefresh } from '../slices/refreshSlice';
import {
  getAllItems,
  createItem,
  updateItem as updateItemService,
  deleteItem,
  syncItems,
} from '../../services/InventoryService';
import { syncCategories } from '../../services/CategoryService';
import { syncLocations } from '../../services/LocationService';
import { syncTodos } from '../../services/TodoService';
import { initializeHomeData } from '../../services/DataInitializationService';
import { InventoryItem } from '../../types/inventory';
import type { RootState } from '../types';
import { homeService } from '../../services/HomeService';
import { Home } from '../../types/home';
import { loadTodos } from './todoSaga';
import { ApiClient } from '../../services/ApiClient';
import { getDeviceId } from '../../utils/deviceUtils';
import { syncLogger } from '../../utils/Logger';

// Action types
const LOAD_ITEMS = 'inventory/LOAD_ITEMS';
const SILENT_REFRESH_ITEMS = 'inventory/SILENT_REFRESH_ITEMS';
const CREATE_ITEM = 'inventory/CREATE_ITEM';
const UPDATE_ITEM = 'inventory/UPDATE_ITEM';
const DELETE_ITEM = 'inventory/DELETE_ITEM';
const SYNC_ITEMS = 'inventory/SYNC_ITEMS';

// Action creators
export const loadItems = () => ({ type: LOAD_ITEMS });
export const silentRefreshItems = () => ({ type: SILENT_REFRESH_ITEMS });
export const createItemAction = (item: Omit<InventoryItem, 'id'>) => ({
  type: CREATE_ITEM,
  payload: item,
});
export const updateItemAction = (id: string, updates: Partial<Omit<InventoryItem, 'id'>>) => ({
  type: UPDATE_ITEM,
  payload: { id, updates },
});
export const deleteItemAction = (id: string) => ({ type: DELETE_ITEM, payload: id });
export const syncItemsAction = () => ({ type: SYNC_ITEMS });


function* getFileHomeId() {
  const state: RootState = yield select();
  const { activeHomeId } = state.auth;

  if (!activeHomeId) {
    // Either throw or show error and return
    syncLogger.error('No active home - cannot load items');
    yield put(setItems([])); // Clear items
    return; // Stop execution
  }

  return activeHomeId;
}

function* loadItemsSaga() {
  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      yield put(setLoading(false));
      return; // No home = no items
    }

    yield put(setLoading(true));
    const allItems: InventoryItem[] = yield call(getAllItems, homeId);
    // Sort by createdAt in descending order (newest first)
    allItems.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    yield put(setItems(allItems));
  } catch (error) {
    syncLogger.error('Error loading items', error);
  } finally {
    yield put(setLoading(false));
  }
}

function* silentRefreshItemsSaga() {
  try {
    // Silent refresh - no loading state changes
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      return; // No home = no items
    }

    const allItems: InventoryItem[] = yield call(getAllItems, homeId);
    // Sort by createdAt in descending order (newest first)
    allItems.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    // Use silentSetItems to update without touching loading state
    yield put(silentSetItems(allItems));
  } catch (error) {
    syncLogger.error('Error silently refreshing items', error);
    // Don't throw - silent refresh should fail silently
  }
}

function* syncItemsSaga() {
  try {
    const state: RootState = yield select();
    const { apiClient, isAuthenticated } = state.auth;

    if (!apiClient || !isAuthenticated) return;

    syncLogger.info('Starting comprehensive sync sequence');

    // 1. Sync Homes first
    yield call([homeService, homeService.syncHomes], apiClient);

    // 2. Get all homes to iterate through
    const homes: Home[] = yield call([homeService, homeService.getHomes]);
    const deviceId: string = yield call(getDeviceId);

    syncLogger.info(`Syncing content for ${homes.length} homes`);

    // 3. For each household, sync everything inside
    for (const home of homes) {
      try {
        syncLogger.info(`Processing home: ${home.name} (${home.id})`);

        // Ensure data files exist for this home
        yield call(initializeHomeData, home.id);

        // Sync Items
        yield call(syncItems, home.id, apiClient as ApiClient, deviceId);

        // Sync Categories
        yield call(syncCategories, home.id, apiClient as ApiClient, deviceId);

        // Sync Locations
        yield call(syncLocations, home.id, apiClient as ApiClient, deviceId);

        // Sync Todos
        yield call(syncTodos, home.id, apiClient as ApiClient, deviceId);

      } catch (homeError) {
        syncLogger.error(`Error syncing home ${home.id}`, homeError);
        // Continue to next home even if one fails
      }
    }

    // 4. Refresh UI for the currently active home
    yield call(silentRefreshItemsSaga);
    yield put(loadTodos());

    // 5. Trigger category refresh to update CategorySelector and CategoryFilter
    yield put(triggerCategoryRefresh());

  } catch (error) {
    syncLogger.error('Error in sync sequence', error);
  }
}

function* createItemSaga(action: { type: string; payload: Omit<InventoryItem, 'id'> }) {
  const item = action.payload;

  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      syncLogger.error('Cannot create item: No active home selected');
      return;
    }

    const newItem: InventoryItem | null = yield call(createItem, item, homeId);
    if (newItem) {
      // Optimistically add to state
      yield put(addItemSlice(newItem));

      // Refresh to ensure sync (but don't set loading)
      const allItems: InventoryItem[] = yield call(getAllItems, homeId);
      allItems.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      yield put(setItems(allItems));

      // Trigger sync
      yield put(syncItemsAction());
    }
  } catch (error) {
    syncLogger.error('Error creating item', error);
    // Revert on error by refreshing
    yield loadItemsSaga();
  }
}

function* updateItemSaga(action: { type: string; payload: { id: string; updates: Partial<Omit<InventoryItem, 'id'>> } }) {
  const { id, updates } = action.payload;
  syncLogger.info(`updateItemSaga called with id: ${id}`, updates);

  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      syncLogger.error('Cannot update item: No active home selected');
      return;
    }

    // Optimistically update to state
    const currentItems: InventoryItem[] = yield select((state: RootState) => state.inventory.items);
    const itemToUpdate = currentItems.find((item) => item.id === id);
    if (itemToUpdate) {
      const updatedItem = { ...itemToUpdate, ...updates, updatedAt: new Date().toISOString() };
      yield put(updateItemSlice(updatedItem));
    }

    // Then update in storage
    yield call(updateItemService, id, updates, homeId);

    // Refresh to ensure sync (but don't set loading)
    const allItems: InventoryItem[] = yield call(getAllItems, homeId);
    const updatedItemFromStorage = allItems.find((item) => item.id === id);
    syncLogger.info('Item from storage after update', updatedItemFromStorage);
    allItems.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    yield put(setItems(allItems));

    // Trigger sync
    yield put(syncItemsAction());
  } catch (error) {
    syncLogger.error('Error updating item', error);
    // Revert on error by refreshing
    yield loadItemsSaga();
  }
}

function* deleteItemSaga(action: { type: string; payload: string }) {
  const id = action.payload;

  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      syncLogger.error('Cannot delete item: No active home selected');
      return;
    }

    // Optimistically remove from state
    yield put(removeItemSlice(id));

    // Then delete from storage
    yield call(deleteItem, id, homeId);

    // Refresh to ensure sync (but don't set loading)
    const allItems: InventoryItem[] = yield call(getAllItems, homeId);
    allItems.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    yield put(setItems(allItems));

    // Trigger sync
    yield put(syncItemsAction());
  } catch (error) {
    syncLogger.error('Error deleting item', error);
    // Revert on error by refreshing
    yield loadItemsSaga();
  }
}

// Watcher
export function* inventorySaga() {
  yield takeLatest(LOAD_ITEMS, loadItemsSaga);
  yield takeLatest(SILENT_REFRESH_ITEMS, silentRefreshItemsSaga);
  yield takeLatest(CREATE_ITEM, createItemSaga);
  yield takeLatest(UPDATE_ITEM, updateItemSaga);
  yield takeLatest(DELETE_ITEM, deleteItemSaga);
  yield takeLatest(SYNC_ITEMS, syncItemsSaga);

  // Start periodic sync
  yield spawn(periodicSyncSaga);
}

function* periodicSyncSaga() {
  while (true) {
    // Wait 5 minutes
    yield delay(5 * 60 * 1000);
    const state: RootState = yield select();
    if (state.auth.isAuthenticated) {
      syncLogger.info('Triggering periodic sync');
      yield put(syncItemsAction());
    }
  }
}

