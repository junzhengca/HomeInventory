import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import SyncService, { SyncMetadata } from '../../services/SyncService';

interface SyncState {
  syncService: SyncService | null;
  enabled: boolean;
  loading: boolean;
  syncStatus: SyncMetadata | null;
  lastSyncTime: string;
  error: string | null;
}

const initialState: SyncState = {
  syncService: null,
  enabled: false,
  loading: false,
  syncStatus: null,
  lastSyncTime: '',
  error: null,
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setSyncService: (state, action: PayloadAction<SyncService | null>) => {
      state.syncService = action.payload;
    },
    setSyncEnabled: (state, action: PayloadAction<boolean>) => {
      state.enabled = action.payload;
    },
    setSyncLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setSyncStatus: (state, action: PayloadAction<SyncMetadata | null>) => {
      state.syncStatus = action.payload;
    },
    setSyncLastSyncTime: (state, action: PayloadAction<string>) => {
      state.lastSyncTime = action.payload;
    },
    setSyncError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setSyncService, setSyncEnabled, setSyncLoading, setSyncStatus, setSyncLastSyncTime, setSyncError } =
  syncSlice.actions;
export default syncSlice.reducer;

