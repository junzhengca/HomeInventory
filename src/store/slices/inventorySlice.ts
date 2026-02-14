import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { InventoryItem } from '../../types/inventory';

interface InventoryState {
  items: InventoryItem[];
  loading: boolean;
}

const initialState: InventoryState = {
  items: [],
  loading: true,
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setItems: (state, action: PayloadAction<InventoryItem[]>) => {
      state.items = action.payload;
    },
    silentSetItems: (state, action: PayloadAction<InventoryItem[]>) => {
      // Silent update - only updates items, does not touch loading state
      state.items = action.payload;
    },
    addItem: (state, action: PayloadAction<InventoryItem>) => {
      state.items.unshift(action.payload);
    },
    updateItem: (state, action: PayloadAction<InventoryItem>) => {
      const index = state.items.findIndex((item) => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    upsertItems: (state, action: PayloadAction<InventoryItem[]>) => {
      const itemsToUpsert = action.payload;
      if (itemsToUpsert.length === 0) return;

      const itemMap = new Map(state.items.map(item => [item.id, item]));
      itemsToUpsert.forEach(item => {
        itemMap.set(item.id, item);
      });
      state.items = Array.from(itemMap.values());
    },
    removeItems: (state, action: PayloadAction<string[]>) => {
      const idsToRemove = new Set(action.payload);
      if (idsToRemove.size === 0) return;
      state.items = state.items.filter(item => !idsToRemove.has(item.id));
    },
    addItems: (state, action: PayloadAction<InventoryItem[]>) => {
      action.payload.forEach(item => {
        const index = state.items.findIndex(i => i.id === item.id);
        if (index === -1) {
          state.items.push(item); // Only add if not exists
        }
      });
    },
  },
});

export const { setItems, silentSetItems, addItem, updateItem, removeItem, setLoading, upsertItems, removeItems, addItems } =
  inventorySlice.actions;

// Selectors
const selectItems = (state: { inventory: InventoryState }) => state.inventory.items;

export const selectItemById = createSelector(
  [selectItems, (_state: { inventory: InventoryState }, itemId: string) => itemId],
  (items, itemId) => items.find((item) => item.id === itemId) || null
);

export default inventorySlice.reducer;

