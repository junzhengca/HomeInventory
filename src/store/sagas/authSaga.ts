import { call, put, takeLatest, select } from 'redux-saga/effects';
import {
  setUser,
  setAuthenticated,
  setLoading,
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
import { isTokenExpired } from '../../utils/jwtUtils';
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

    // Set up token refresh callback
    apiClient.setOnTokenRefresh((tokens) => {
      console.log('[AuthSaga] Token refreshed via callback');
      saveAuthTokens(tokens.accessToken, tokens.refreshToken);
    });

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
    const tokens: { accessToken: string; refreshToken: string } | null = yield call(getAuthTokens);

    if (!tokens || !tokens.refreshToken) {
      yield put(setLoading(false));
      return;
    }

    // Check if refresh token is expired
    if (isTokenExpired(tokens.refreshToken, true)) {
      // Refresh token is expired, clear all auth data
      console.log('[AuthSaga] Refresh token expired, clearing auth data');
      yield call(handleAuthError);
      yield put(setLoading(false));
      return;
    }

    // Refresh token is valid, check if access token needs refresh
    if (!tokens.accessToken || isTokenExpired(tokens.accessToken, false)) {
      // Access token is expired or missing, refresh it
      try {
        console.log('[AuthSaga] Refreshing access token...');
        const refreshResponse = yield call(
          apiClient.refreshAccessToken.bind(apiClient),
          tokens.refreshToken
        );

        // Validate token before saving
        // Note: Refresh token endpoint only returns accessToken, not a new refreshToken
        if (!refreshResponse?.accessToken) {
          console.error('[AuthSaga] Invalid token response:', refreshResponse);
          throw new Error('Invalid token response: missing accessToken');
        }

        // Save new access token, but keep existing refresh token
        // The refresh token is long-lived and doesn't change on each refresh
        const newAccessToken = refreshResponse.accessToken;
        const existingRefreshToken = tokens.refreshToken; // Keep the existing refresh token
        
        const saved = yield call(saveAuthTokens, newAccessToken, existingRefreshToken);
        if (!saved) {
          throw new Error('Failed to save authentication tokens');
        }

        // Set tokens in API client
        apiClient.setAuthToken(newAccessToken);
        apiClient.setRefreshToken(existingRefreshToken);

        // Update tokens for verification
        tokens.accessToken = newAccessToken;
        // refreshToken stays the same
      } catch (error) {
        // Refresh failed, clear auth data
        console.error('[AuthSaga] Token refresh failed:', error);
        yield call(handleAuthError);
        yield put(setLoading(false));
        return;
      }
    } else {
      // Both tokens are valid, set them in API client
      apiClient.setAuthToken(tokens.accessToken);
      apiClient.setRefreshToken(tokens.refreshToken);
    }

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

  if (!apiClient) {
    throw new Error('API client not initialized');
  }

  try {
    const response = yield call(apiClient.login.bind(apiClient), email, password);

    // Validate tokens before saving
    if (!response?.accessToken || !response?.refreshToken) {
      console.error('[AuthSaga] Invalid login response:', response);
      throw new Error('Invalid login response: missing accessToken or refreshToken');
    }

    // Save tokens
    const saved = yield call(saveAuthTokens, response.accessToken, response.refreshToken);
    if (!saved) {
      throw new Error('Failed to save authentication tokens');
    }

    // Verify tokens were saved
    const savedTokens = yield call(getAuthTokens);
    if (!savedTokens || !savedTokens.accessToken || !savedTokens.refreshToken) {
      throw new Error('Failed to save authentication tokens');
    }

    // Set tokens in API client
    apiClient.setAuthToken(response.accessToken);
    apiClient.setRefreshToken(response.refreshToken);

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
    
    // Initialize sync service after successful login
    yield put(initializeSync());
    
    console.log('[AuthSaga] Login successful');
  } catch (error) {
    console.error('[AuthSaga] Login error:', error);
    throw error;
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

    // Validate tokens before saving
    if (!response?.accessToken || !response?.refreshToken) {
      console.error('[AuthSaga] Invalid signup response:', response);
      throw new Error('Invalid signup response: missing accessToken or refreshToken');
    }

    // Save tokens
    const saved = yield call(saveAuthTokens, response.accessToken, response.refreshToken);
    if (!saved) {
      throw new Error('Failed to save authentication tokens');
    }

    // Verify tokens were saved
    const savedTokens = yield call(getAuthTokens);
    if (!savedTokens || !savedTokens.accessToken || !savedTokens.refreshToken) {
      throw new Error('Failed to save authentication tokens');
    }

    // Set tokens in API client
    apiClient.setAuthToken(response.accessToken);
    apiClient.setRefreshToken(response.refreshToken);

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
  const apiClient: ApiClient = yield select((state: RootState) => state.auth.apiClient);

  if (!apiClient) {
    yield call(handleAuthError);
    return;
  }

  try {
    const tokens = yield call(getAuthTokens);
    if (tokens?.refreshToken) {
      try {
        yield call(apiClient.logout.bind(apiClient), tokens.refreshToken);
      } catch (error) {
        console.error('[AuthSaga] Logout API call failed:', error);
        // Continue with local logout even if API call fails
      }
    }
  } catch (error) {
    console.error('[AuthSaga] Error during logout:', error);
  } finally {
    // Disable sync on explicit logout (persist state)
    try {
      yield call(SecureStore.setItemAsync, 'sync_enabled', 'false');
      console.log('[AuthSaga] *** SYNC DISABLED ON LOGOUT *** - Set sync_enabled to "false"');
    } catch (error) {
      console.error('[AuthSaga] Error disabling sync on logout:', error);
    }
    yield call(handleAuthError);
    console.log('[AuthSaga] Logout successful');
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

