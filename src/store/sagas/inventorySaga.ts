import { call, put, select, takeLatest } from 'redux-saga/effects';
import {
  setItems,
  silentSetItems,
  addItem as addItemSlice,
  updateItem as updateItemSlice,
  removeItem as removeItemSlice,
  setLoading,
} from '../slices/inventorySlice';
import { inventoryService } from '../../services/InventoryService';
import { InventoryItem } from '../../types/inventory';
import type { RootState } from '../types';
import { syncLogger } from '../../utils/Logger';
import { getActiveHomeId } from './helpers/getActiveHomeId';
import { requestSync } from './syncSaga';

// Action types
const LOAD_ITEMS = 'inventory/LOAD_ITEMS';
const SILENT_REFRESH_ITEMS = 'inventory/SILENT_REFRESH_ITEMS';
const CREATE_ITEM = 'inventory/CREATE_ITEM';
const UPDATE_ITEM = 'inventory/UPDATE_ITEM';
const DELETE_ITEM = 'inventory/DELETE_ITEM';

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

function* getFileHomeId() {
  const homeId: string | undefined = yield call(getActiveHomeId);

  if (!homeId) {
    syncLogger.error('No active home - cannot load items');
    yield put(setItems([]));
    return;
  }

  return homeId;
}

function* loadItemsSaga() {
  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      yield put(setLoading(false));
      return;
    }

    yield put(setLoading(true));
    const allItems: InventoryItem[] = yield call([inventoryService, 'getAllItems'], homeId);

    // CRITICAL: Preserve pending edits from current Redux state
    const currentState: RootState = yield select();
    const currentItems = currentState.inventory.items;
    const pendingItems = currentItems.filter(i => i.pendingUpdate || i.pendingCreate);
    const pendingItemIds = new Set(pendingItems.map(i => i.id));

    // Merge: storage items (synced) + pending items (local edits)
    const mergedItems: InventoryItem[] = [
      ...pendingItems,
      ...allItems.filter(i => !pendingItemIds.has(i.id))
    ];

    // Sort by createdAt in descending order (newest first)
    mergedItems.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    yield put(setItems(mergedItems));
  } catch (error) {
    syncLogger.error('Error loading items', error);
  } finally {
    yield put(setLoading(false));
  }
}

function* silentRefreshItemsSaga() {
  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      return;
    }

    const allItems: InventoryItem[] = yield call([inventoryService, 'getAllItems'], homeId);

    // CRITICAL: Preserve pending edits from current Redux state
    const currentState: RootState = yield select();
    const currentItems = currentState.inventory.items;
    const pendingItems = currentItems.filter(i => i.pendingUpdate || i.pendingCreate);
    const pendingItemIds = new Set(pendingItems.map(i => i.id));

    // Merge: storage items (synced) + pending items (local edits)
    const mergedItems: InventoryItem[] = [
      ...pendingItems,
      ...allItems.filter(i => !pendingItemIds.has(i.id))
    ];

    // Sort by createdAt descending
    mergedItems.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    yield put(silentSetItems(mergedItems));
  } catch (error) {
    syncLogger.error('Error silently refreshing items', error);
  }
}

function* createItemSaga(action: { type: string; payload: Omit<InventoryItem, 'id'> }): Generator {
  const item = action.payload;

  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      syncLogger.error('Cannot create item: No active home selected');
      return;
    }

    const newItem: InventoryItem | null = yield call([inventoryService, 'createItem'], item, homeId);
    if (newItem) {
      yield put(addItemSlice(newItem));
      yield put(requestSync());
    }
  } catch (error) {
    syncLogger.error('Error creating item', error);
    yield loadItemsSaga();
  }
}

function* updateItemSaga(action: { type: string; payload: { id: string; updates: Partial<Omit<InventoryItem, 'id'>> } }): Generator {
  const { id, updates } = action.payload;
  syncLogger.info(`updateItemSaga called with id: ${id}`, updates);

  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      syncLogger.error('Cannot update item: No active home selected');
      return;
    }

    const currentItems: InventoryItem[] = yield select((state: RootState) => state.inventory.items);
    const itemToUpdate = currentItems.find((item) => item.id === id);
    if (itemToUpdate) {
      const updatedItem = { ...itemToUpdate, ...updates, updatedAt: new Date().toISOString() };
      yield put(updateItemSlice(updatedItem));
    }

    yield call([inventoryService, 'updateItem'], id, updates, homeId);
    yield put(requestSync());
  } catch (error) {
    syncLogger.error('Error updating item', error);
    yield loadItemsSaga();
  }
}

function* deleteItemSaga(action: { type: string; payload: string }): Generator {
  const id = action.payload;

  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      syncLogger.error('Cannot delete item: No active home selected');
      return;
    }

    yield put(removeItemSlice(id));
    yield call([inventoryService, 'deleteItem'], id, homeId);
    yield put(requestSync());
  } catch (error) {
    syncLogger.error('Error deleting item', error);
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
}
