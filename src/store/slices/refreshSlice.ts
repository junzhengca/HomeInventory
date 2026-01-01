import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface RefreshState {
  categoryCallbacks: Set<string>; // Store callback IDs as strings
}

const initialState: RefreshState = {
  categoryCallbacks: new Set(),
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
    triggerCategoryRefresh: () => {
      // No state change needed - this action will trigger saga
    },
  },
});

export const {
  registerCategoryCallback,
  unregisterCategoryCallback,
  triggerCategoryRefresh,
} = refreshSlice.actions;
export default refreshSlice.reducer;

