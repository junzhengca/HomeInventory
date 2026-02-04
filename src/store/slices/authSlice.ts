import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types/api';
import { ApiClient } from '../../services/ApiClient';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  apiBaseUrl: string;
  apiClient: ApiClient | null;
  showNicknameSetup: boolean;
  activeHomeId: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  apiBaseUrl: '',
  apiClient: null,
  showNicknameSetup: false,
  activeHomeId: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
    },
    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setApiBaseUrl: (state, action: PayloadAction<string>) => {
      state.apiBaseUrl = action.payload;
    },
    setApiClient: (state, action: PayloadAction<ApiClient | null>) => {
      state.apiClient = action.payload;
    },
    setShowNicknameSetup: (state, action: PayloadAction<boolean>) => {
      state.showNicknameSetup = action.payload;
    },
    setActiveHomeId: (state, action: PayloadAction<string | null>) => {
      state.activeHomeId = action.payload;
    },
  },
});

export const {
  setUser,
  setAuthenticated,
  setLoading,
  setError,
  setApiBaseUrl,
  setApiClient,
  setShowNicknameSetup,
  setActiveHomeId,
} = authSlice.actions;
export default authSlice.reducer;

