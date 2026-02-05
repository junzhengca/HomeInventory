import { call, put, select, takeLatest, delay, spawn } from 'redux-saga/effects';
import {
  setItems,
  silentSetItems,
  addItem as addItemSlice,
  updateItem as updateItemSlice,
  removeItem as removeItemSlice,
  setLoading,
} from '../slices/inventorySlice';
import {
  getAllItems,
  createItem,
  updateItem as updateItemService,
  deleteItem,
  syncItems,
} from '../../services/InventoryService';
import { InventoryItem } from '../../types/inventory';
import type { RootState } from '../types';
import { homeService } from '../../services/HomeService';
import { ApiClient } from '../../services/ApiClient';
import { getDeviceId } from '../../utils/deviceUtils';

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


function* getFileUserId() {
  const state: RootState = yield select();
  const { activeHomeId } = state.auth;
  // If we have an active home ID, use it as the "userId" for file scoping
  // This effectively scopes items to the home
  return activeHomeId || undefined;
}

function* loadItemsSaga() {
  try {
    yield put(setLoading(true));
    const userId: string | undefined = yield call(getFileUserId);
    const allItems: InventoryItem[] = yield call(getAllItems, userId);
    // Sort by createdAt in descending order (newest first)
    allItems.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    yield put(setItems(allItems));
  } catch (error) {
    console.error('[InventorySaga] Error loading items:', error);
  } finally {
    yield put(setLoading(false));
  }
}

function* silentRefreshItemsSaga() {
  try {
    // Silent refresh - no loading state changes
    const userId: string | undefined = yield call(getFileUserId);
    const allItems: InventoryItem[] = yield call(getAllItems, userId);
    // Sort by createdAt in descending order (newest first)
    allItems.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    // Use silentSetItems to update without touching loading state
    yield put(silentSetItems(allItems));
  } catch (error) {
    console.error('[InventorySaga] Error silently refreshing items:', error);
    // Don't throw - silent refresh should fail silently
  }
}

function* syncItemsSaga() {
  try {
    const state: RootState = yield select();
    const { activeHomeId, apiClient } = state.auth;

    if (!activeHomeId || !apiClient) return;

    console.log('[InventorySaga] Starting scheduled/triggered sync sequence');

    // 1. Sync Homes first
    yield call([homeService, homeService.syncHomes], apiClient);

    // 2. Sync Items
    const deviceId: string = yield call(getDeviceId);
    yield call(syncItems, activeHomeId, apiClient as ApiClient, deviceId);

    // 3. Refresh UI
    yield call(silentRefreshItemsSaga);

  } catch (error) {
    console.error('[InventorySaga] Error in sync sequence:', error);
  }
}

function* createItemSaga(action: { type: string; payload: Omit<InventoryItem, 'id'> }) {
  const item = action.payload;

  try {
    const userId: string | undefined = yield call(getFileUserId);
    const newItem: InventoryItem | null = yield call(createItem, item, userId);
    if (newItem) {
      // Optimistically add to state
      yield put(addItemSlice(newItem));

      // Refresh to ensure sync (but don't set loading)
      const allItems: InventoryItem[] = yield call(getAllItems, userId);
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
    console.error('[InventorySaga] Error creating item:', error);
    // Revert on error by refreshing
    yield loadItemsSaga();
  }
}

function* updateItemSaga(action: { type: string; payload: { id: string; updates: Partial<Omit<InventoryItem, 'id'>> } }) {
  const { id, updates } = action.payload;
  console.log('[InventorySaga] updateItemSaga called with id:', id, 'updates:', updates);

  try {
    const userId: string | undefined = yield call(getFileUserId);

    // Optimistically update to state
    const currentItems: InventoryItem[] = yield select((state: RootState) => state.inventory.items);
    const itemToUpdate = currentItems.find((item) => item.id === id);
    if (itemToUpdate) {
      const updatedItem = { ...itemToUpdate, ...updates, updatedAt: new Date().toISOString() };
      yield put(updateItemSlice(updatedItem));
    }

    // Then update in storage
    yield call(updateItemService, id, updates, userId);

    // Refresh to ensure sync (but don't set loading)
    const allItems: InventoryItem[] = yield call(getAllItems, userId);
    const updatedItemFromStorage = allItems.find((item) => item.id === id);
    console.log('[InventorySaga] Item from storage after update:', updatedItemFromStorage);
    allItems.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    yield put(setItems(allItems));

    // Trigger sync
    yield put(syncItemsAction());
  } catch (error) {
    console.error('[InventorySaga] Error updating item:', error);
    // Revert on error by refreshing
    yield loadItemsSaga();
  }
}

function* deleteItemSaga(action: { type: string; payload: string }) {
  const id = action.payload;

  try {
    const userId: string | undefined = yield call(getFileUserId);

    // Optimistically remove from state
    yield put(removeItemSlice(id));

    // Then delete from storage
    yield call(deleteItem, id, userId);

    // Refresh to ensure sync (but don't set loading)
    const allItems: InventoryItem[] = yield call(getAllItems, userId);
    allItems.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    yield put(setItems(allItems));

    // Trigger sync
    yield put(syncItemsAction());
  } catch (error) {
    console.error('[InventorySaga] Error deleting item:', error);
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
    console.log('[InventorySaga] Triggering periodic sync');
    yield put(syncItemsAction());
  }
}

