import { call, put, select, takeLatest } from 'redux-saga/effects';
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
} from '../../services/InventoryService';
import { InventoryItem } from '../../types/inventory';
import type { RootState } from '../types';

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

function* loadItemsSaga() {
  try {
    yield put(setLoading(true));
    const allItems: InventoryItem[] = yield call(getAllItems);
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
    const allItems: InventoryItem[] = yield call(getAllItems);
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

function* createItemSaga(action: { type: string; payload: Omit<InventoryItem, 'id'> }) {
  const item = action.payload;

  try {
    const newItem: InventoryItem | null = yield call(createItem, item);
    if (newItem) {
      // Optimistically add to state
      yield put(addItemSlice(newItem));

      // Refresh to ensure sync (but don't set loading)
      const allItems: InventoryItem[] = yield call(getAllItems);
      allItems.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      yield put(setItems(allItems));
    }
  } catch (error) {
    console.error('[InventorySaga] Error creating item:', error);
    // Revert on error by refreshing
    yield loadItemsSaga();
  }
}

function* updateItemSaga(action: { type: string; payload: { id: string; updates: Partial<Omit<InventoryItem, 'id'>> } }) {
  const { id, updates } = action.payload;

  try {
    // Optimistically update to state
    const currentItems: InventoryItem[] = yield select((state: RootState) => state.inventory.items);
    const itemToUpdate = currentItems.find((item) => item.id === id);
    if (itemToUpdate) {
      const updatedItem = { ...itemToUpdate, ...updates, updatedAt: new Date().toISOString() };
      yield put(updateItemSlice(updatedItem));
    }

    // Then update in storage
    yield call(updateItemService, id, updates);

    // Refresh to ensure sync (but don't set loading)
    const allItems: InventoryItem[] = yield call(getAllItems);
    allItems.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    yield put(setItems(allItems));
  } catch (error) {
    console.error('[InventorySaga] Error updating item:', error);
    // Revert on error by refreshing
    yield loadItemsSaga();
  }
}

function* deleteItemSaga(action: { type: string; payload: string }) {
  const id = action.payload;

  try {
    // Optimistically remove from state
    yield put(removeItemSlice(id));

    // Then delete from storage
    yield call(deleteItem, id);

    // Refresh to ensure sync (but don't set loading)
    const allItems: InventoryItem[] = yield call(getAllItems);
    allItems.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    yield put(setItems(allItems));
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
}

