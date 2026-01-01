import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Settings } from '../../types/settings';

interface SettingsState {
  settings: Settings;
  isLoading: boolean;
}

const initialState: SettingsState = {
  settings: {
    theme: 'forest',
    currency: 'cny',
    language: 'zh-cn',
  },
  isLoading: true,
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
  },
});

export const { setSettings, setLoading } = settingsSlice.actions;
export default settingsSlice.reducer;

