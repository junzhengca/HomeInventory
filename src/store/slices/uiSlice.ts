import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  homeCategory: string;
}

const initialState: UIState = {
  homeCategory: 'all',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setHomeCategory: (state, action: PayloadAction<string>) => {
      state.homeCategory = action.payload;
    },
  },
});

export const { setHomeCategory } = uiSlice.actions;
export default uiSlice.reducer;

