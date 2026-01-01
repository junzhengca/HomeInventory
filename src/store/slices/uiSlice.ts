import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  homeCategory: string;
  inventoryCategory: string;
}

const initialState: UIState = {
  homeCategory: 'all',
  inventoryCategory: 'all',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setHomeCategory: (state, action: PayloadAction<string>) => {
      state.homeCategory = action.payload;
    },
    setInventoryCategory: (state, action: PayloadAction<string>) => {
      state.inventoryCategory = action.payload;
    },
  },
});

export const { setHomeCategory, setInventoryCategory } = uiSlice.actions;
export default uiSlice.reducer;

