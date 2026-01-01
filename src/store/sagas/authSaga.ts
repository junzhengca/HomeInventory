import { call, put, takeLatest, select } from 'redux-saga/effects';
import {
  setUser,
  setAuthenticated,
  setLoading,
  setError,
  setApiClient,
} from '../slices/authSlice';
import {
  setSyncEnabled,
} from '../slices/syncSlice';
import { initializeSync } from './syncSaga';
import {
  ApiClient,
} from '../../services/ApiClient';
import {
  getAuthTokens,
  saveAuthTokens,
  clearAllAuthData,
  getUser,
  saveUser,
} from '../../services/AuthService';
import { User } from '../../types/api';
import * as SecureStore from 'expo-secure-store';
import type { RootState } from '../types';

// Action types
const CHECK_AUTH = 'auth/CHECK_AUTH';
const LOGIN = 'auth/LOGIN';
const SIGNUP = 'auth/SIGNUP';
const LOGOUT = 'auth/LOGOUT';
const UPDATE_USER = 'auth/UPDATE_USER';
const INITIALIZE_API_CLIENT = 'auth/INITIALIZE_API_CLIENT';

// Action creators
export const checkAuth = () => ({ type: CHECK_AUTH });
export const login = (email: string, password: string) => ({
  type: LOGIN,
  payload: { email, password },
});
export const signup = (email: string, password: string) => ({
  type: SIGNUP,
  payload: { email, password },
});
export const logout = () => ({ type: LOGOUT });
export const updateUser = (userData: User) => ({ type: UPDATE_USER, payload: userData });
export const initializeApiClient = (apiBaseUrl: string) => ({
  type: INITIALIZE_API_CLIENT,
  payload: apiBaseUrl,
});

function* initializeApiClientSaga(action: { type: string; payload: string }) {
  try {
    const apiBaseUrl = action.payload;
    const apiClient = new ApiClient(apiBaseUrl);

    // Set up auth error callback
    apiClient.setOnAuthError(() => {
      console.log('[AuthSaga] Auth error callback triggered');
      handleAuthError();
    });

    yield put(setApiClient(apiClient));

    // Start auth check after API client is ready
    yield put(checkAuth());
  } catch (error) {
    console.error('[AuthSaga] Error initializing API client:', error);
    yield put(setLoading(false));
  }
}

function* handleAuthError() {
  console.log('[AuthSaga] Clearing auth data due to error');
  yield call(clearAllAuthData);
  yield put(setUser(null));
  yield put(setAuthenticated(false));
  yield put(setSyncEnabled(false));
}

function* checkAuthSaga() {
  const apiClient: ApiClient = yield select((state: RootState) => state.auth.apiClient);
  if (!apiClient) {
    yield put(setLoading(false));
    return;
  }

  try {
    const tokens: { accessToken: string } | null = yield call(getAuthTokens);

    if (!tokens || !tokens.accessToken) {
      yield put(setLoading(false));
      return;
    }

    // Set access token in API client
    apiClient.setAuthToken(tokens.accessToken);

    // Verify auth by calling /me endpoint
    try {
      const currentUser: User = yield call(apiClient.getCurrentUser.bind(apiClient));
      const savedUser: User | null = yield call(getUser);

      console.log('[AuthSaga] /me endpoint response:', {
        hasAvatar: !!currentUser?.avatarUrl,
        avatarUrl: currentUser?.avatarUrl,
      });

      // Update user if we got new data
      if (currentUser) {
        yield call(saveUser, currentUser);
        yield put(setUser(currentUser));
        yield put(setAuthenticated(true));
        
        // Initialize sync service after successful authentication
        yield put(initializeSync());
      } else if (savedUser) {
        yield put(setUser(savedUser));
        yield put(setAuthenticated(true));
        
        // Initialize sync service after successful authentication
        yield put(initializeSync());
      } else {
        throw new Error('No user data available from API or storage');
      }
    } catch (error) {
      // If /me returns 401, user is not authenticated
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AuthSaga] Auth verification failed:', errorMessage, error);
      yield call(handleAuthError);
    }
  } catch (error) {
    console.error('[AuthSaga] Error checking auth:', error);
    yield call(handleAuthError);
  } finally {
    yield put(setLoading(false));
  }
}

function* loginSaga(action: { type: string; payload: { email: string; password: string } }) {
  const { email, password } = action.payload;
  const apiClient: ApiClient = yield select((state: RootState) => state.auth.apiClient);

  // Clear any previous errors and set loading
  yield put(setError(null));
  yield put(setLoading(true));

  if (!apiClient) {
    const errorMessage = 'API client not initialized';
    yield put(setError(errorMessage));
    yield put(setLoading(false));
    return;
  }

  try {
    const response = yield call(apiClient.login.bind(apiClient), email, password);

    // Validate token before saving
    if (!response?.accessToken) {
      console.error('[AuthSaga] Invalid login response:', response);
      const errorMessage = 'Invalid login response: missing accessToken';
      yield put(setError(errorMessage));
      yield put(setLoading(false));
      return;
    }

    // Save token
    const saved = yield call(saveAuthTokens, response.accessToken);
    if (!saved) {
      const errorMessage = 'Failed to save authentication token';
      yield put(setError(errorMessage));
      yield put(setLoading(false));
      return;
    }

    // Verify token was saved
    const savedTokens = yield call(getAuthTokens);
    if (!savedTokens || !savedTokens.accessToken) {
      const errorMessage = 'Failed to save authentication token';
      yield put(setError(errorMessage));
      yield put(setLoading(false));
      return;
    }

    // Set token in API client
    apiClient.setAuthToken(response.accessToken);

    // Always get full user info from /me endpoint to ensure we have complete data including avatar
    const userData: User = yield call(apiClient.getCurrentUser.bind(apiClient));

    console.log('[AuthSaga] User data from /me endpoint:', {
      hasAvatar: !!userData?.avatarUrl,
      avatarUrl: userData?.avatarUrl,
      email: userData?.email,
    });

    // Save user
    if (userData) {
      yield call(saveUser, userData);
      yield put(setUser(userData));
    }

    yield put(setAuthenticated(true));
    yield put(setError(null)); // Clear error on success
    yield put(setLoading(false));
    
    // Initialize sync service after successful login
    yield put(initializeSync());
    
    console.log('[AuthSaga] Login successful');
  } catch (error) {
    console.error('[AuthSaga] Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Login failed. Please try again.';
    yield put(setError(errorMessage));
    yield put(setLoading(false));
  }
}

function* signupSaga(action: { type: string; payload: { email: string; password: string } }) {
  const { email, password } = action.payload;
  const apiClient: ApiClient = yield select((state: RootState) => state.auth.apiClient);

  if (!apiClient) {
    throw new Error('API client not initialized');
  }

  try {
    const response = yield call(apiClient.signup.bind(apiClient), email, password);

    // Validate token before saving
    if (!response?.accessToken) {
      console.error('[AuthSaga] Invalid signup response:', response);
      throw new Error('Invalid signup response: missing accessToken');
    }

    // Save token
    const saved = yield call(saveAuthTokens, response.accessToken);
    if (!saved) {
      throw new Error('Failed to save authentication token');
    }

    // Verify token was saved
    const savedTokens = yield call(getAuthTokens);
    if (!savedTokens || !savedTokens.accessToken) {
      throw new Error('Failed to save authentication token');
    }

    // Set token in API client
    apiClient.setAuthToken(response.accessToken);

    // Always get full user info from /me endpoint to ensure we have complete data including avatar
    const userData: User = yield call(apiClient.getCurrentUser.bind(apiClient));

    console.log('[AuthSaga] User data from /me endpoint:', {
      hasAvatar: !!userData?.avatarUrl,
      avatarUrl: userData?.avatarUrl,
      email: userData?.email,
    });

    // Save user
    if (userData) {
      yield call(saveUser, userData);
      yield put(setUser(userData));
    }

    yield put(setAuthenticated(true));
    
    // Initialize sync service after successful signup
    yield put(initializeSync());
    
    console.log('[AuthSaga] Signup successful');
  } catch (error) {
    console.error('[AuthSaga] Signup error:', error);
    throw error;
  }
}

function* logoutSaga() {
  console.log('[AuthSaga] logout() called - attempting to disable sync and clear auth');
  
  try {
    // Disable sync on explicit logout (persist state)
    try {
      yield call(SecureStore.setItemAsync, 'sync_enabled', 'false');
      console.log('[AuthSaga] *** SYNC DISABLED ON LOGOUT *** - Set sync_enabled to "false"');
    } catch (error) {
      console.error('[AuthSaga] Error disabling sync on logout:', error);
    }
    yield call(handleAuthError);
    console.log('[AuthSaga] Logout successful');
  } catch (error) {
    console.error('[AuthSaga] Error during logout:', error);
    yield call(handleAuthError);
  }
}

function* updateUserSaga(action: { type: string; payload: User }) {
  try {
    yield call(saveUser, action.payload);
    yield put(setUser(action.payload));
  } catch (error) {
    console.error('[AuthSaga] Error updating user:', error);
    throw error;
  }
}

// Watchers
export function* authSaga() {
  yield takeLatest(INITIALIZE_API_CLIENT, initializeApiClientSaga);
  yield takeLatest(CHECK_AUTH, checkAuthSaga);
  yield takeLatest(LOGIN, loginSaga);
  yield takeLatest(SIGNUP, signupSaga);
  yield takeLatest(LOGOUT, logoutSaga);
  yield takeLatest(UPDATE_USER, updateUserSaga);
}

