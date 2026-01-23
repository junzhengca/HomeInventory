import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Settings } from '../../types/settings';

interface SettingsState {
  settings: Settings;
  isLoading: boolean;
  lastUpdateSuccess: boolean | null;
}

const initialState: SettingsState = {
  settings: {
    theme: 'forest',
    currency: 'cny',
    language: 'en',
  },
  isLoading: true,
  lastUpdateSuccess: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettings: (state, action: PayloadAction<Settings>) => {
      state.settings = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setUpdateResult: (state, action: PayloadAction<boolean>) => {
      state.lastUpdateSuccess = action.payload;
    },
    clearUpdateResult: (state) => {
      state.lastUpdateSuccess = null;
    },
  },
});

export const { setSettings, setLoading, setUpdateResult, clearUpdateResult } = settingsSlice.actions;
export default settingsSlice.reducer;

