import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface RefreshState {
  categoryCallbacks: Set<string>; // Store callback IDs as strings
  categoryRefreshTimestamp: number; // Timestamp of last category refresh
}

const initialState: RefreshState = {
  categoryCallbacks: new Set(),
  categoryRefreshTimestamp: Date.now(),
};

const refreshSlice = createSlice({
  name: 'refresh',
  initialState,
  reducers: {
    registerCategoryCallback: (_state, action: PayloadAction<string>) => {
      _state.categoryCallbacks.add(action.payload);
    },
    unregisterCategoryCallback: (_state, action: PayloadAction<string>) => {
      _state.categoryCallbacks.delete(action.payload);
    },
    triggerCategoryRefresh: (state) => {
      // Increment timestamp to trigger refresh in all observers
      state.categoryRefreshTimestamp = Date.now();
    },
  },
});

export const {
  registerCategoryCallback,
  unregisterCategoryCallback,
  triggerCategoryRefresh,
} = refreshSlice.actions;

// Selector to get the refresh timestamp
export const selectCategoryRefreshTimestamp = (state: { refresh: RefreshState }) =>
  state.refresh.categoryRefreshTimestamp;

export default refreshSlice.reducer;
