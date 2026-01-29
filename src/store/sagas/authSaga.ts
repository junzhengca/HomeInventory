import { call, put, takeLatest, select } from 'redux-saga/effects';
import {
  setUser,
  setAuthenticated,
  setLoading,
  setError,
  setApiClient,
  setShowNicknameSetup,
  setAccessibleAccounts,
  setActiveHomeId,
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
import { User, ErrorDetails, ListAccessibleAccountsResponse } from '../../types/api';
import * as SecureStore from 'expo-secure-store';
import type { RootState } from '../types';
import { getGlobalToast } from '../../components/organisms/ToastProvider';
import i18n from '../../i18n/i18n';

// Global error handler - will be set by App.tsx
let globalErrorHandler: ((errorDetails: ErrorDetails) => void) | null = null;

// Function to set global error handler (called from App.tsx)
export const setGlobalErrorHandler = (handler: (errorDetails: ErrorDetails) => void) => {
  globalErrorHandler = handler;
};

// Action types
const CHECK_AUTH = 'auth/CHECK_AUTH';
const LOGIN = 'auth/LOGIN';
const SIGNUP = 'auth/SIGNUP';
const GOOGLE_LOGIN = 'auth/GOOGLE_LOGIN';
const LOGOUT = 'auth/LOGOUT';
const UPDATE_USER = 'auth/UPDATE_USER';
const LOAD_ACCESSIBLE_ACCOUNTS = 'auth/LOAD_ACCESSIBLE_ACCOUNTS';
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
export const googleLogin = (idToken: string, platform: string) => ({
  type: GOOGLE_LOGIN,
  payload: { idToken, platform },
});
export const logout = () => ({ type: LOGOUT });
export const updateUser = (userData: User) => ({ type: UPDATE_USER, payload: userData });
export const loadAccessibleAccounts = () => ({ type: LOAD_ACCESSIBLE_ACCOUNTS });
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

    // Set up error callback for API errors (when all retries are exhausted)
    apiClient.setOnError((errorDetails: ErrorDetails) => {
      console.log('[AuthSaga] API error callback triggered, showing error bottom sheet');
      if (globalErrorHandler) {
        globalErrorHandler(errorDetails);
      } else {
        console.warn('[AuthSaga] Global error handler not set, cannot show error bottom sheet');
      }
    });

    // Set initial active home ID from state
    const activeHomeId: string | null = (yield select((state: RootState) => state.auth.activeHomeId)) as string | null;
    if (activeHomeId) {
      apiClient.setActiveUserId(activeHomeId);
    }

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

function* checkAuthSaga(): Generator {
  const apiClient: ApiClient = (yield select((state: RootState) => state.auth.apiClient)) as ApiClient;
  if (!apiClient) {
    yield put(setLoading(false));
    return;
  }

  try {
    const tokens: { accessToken: string } | null = (yield call(getAuthTokens)) as { accessToken: string } | null;

    if (!tokens || !tokens.accessToken) {
      yield put(setLoading(false));
      return;
    }

    // Set access token in API client
    apiClient.setAuthToken(tokens.accessToken);

    // Verify auth by calling /me endpoint
    try {
      const currentUser: User = (yield call(apiClient.getCurrentUser.bind(apiClient))) as User;
      const savedUser: User | null = (yield call(getUser)) as User | null;

      console.log('[AuthSaga] /me endpoint response:', {
        hasAvatar: !!currentUser?.avatarUrl,
        avatarUrl: currentUser?.avatarUrl,
      });

      // Update user if we got new data
      if (currentUser) {
        yield call(saveUser, currentUser);
        yield put(setUser(currentUser));
        yield put(setAuthenticated(true));

        // Check if nickname is missing
        if (!currentUser.nickname || currentUser.nickname.trim() === '') {
          yield put(setShowNicknameSetup(true));
        } else {
          yield put(setShowNicknameSetup(false));
        }

        // Initialize sync service after successful authentication
        yield put(initializeSync());

        // Load accessible accounts
        yield put(loadAccessibleAccounts());
      } else if (savedUser) {
        yield put(setUser(savedUser));
        yield put(setAuthenticated(true));

        // Check if nickname is missing
        if (!savedUser.nickname || savedUser.nickname.trim() === '') {
          yield put(setShowNicknameSetup(true));
        } else {
          yield put(setShowNicknameSetup(false));
        }

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

function* loginSaga(action: { type: string; payload: { email: string; password: string } }): Generator {
  const { email, password } = action.payload;
  const apiClient: ApiClient = (yield select((state: RootState) => state.auth.apiClient)) as ApiClient;

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
    const response = (yield call(apiClient.login.bind(apiClient), email, password)) as { accessToken: string } | null;

    // Validate token before saving
    if (!response?.accessToken) {
      console.error('[AuthSaga] Invalid login response:', response);
      const errorMessage = 'Invalid login response: missing accessToken';
      yield put(setError(errorMessage));
      yield put(setLoading(false));
      return;
    }

    // Save token
    const saved = (yield call(saveAuthTokens, response.accessToken)) as boolean;
    if (!saved) {
      const errorMessage = 'Failed to save authentication token';
      yield put(setError(errorMessage));
      yield put(setLoading(false));
      return;
    }

    // Verify token was saved
    const savedTokens = (yield call(getAuthTokens)) as { accessToken: string } | null;
    if (!savedTokens || !savedTokens.accessToken) {
      const errorMessage = 'Failed to save authentication token';
      yield put(setError(errorMessage));
      yield put(setLoading(false));
      return;
    }

    // Set token in API client
    apiClient.setAuthToken(response.accessToken);

    // Always get full user info from /me endpoint to ensure we have complete data including avatar
    const userData: User = (yield call(apiClient.getCurrentUser.bind(apiClient))) as User;

    console.log('[AuthSaga] User data from /me endpoint:', {
      hasAvatar: !!userData?.avatarUrl,
      avatarUrl: userData?.avatarUrl,
      email: userData?.email,
    });

    // Save user
    if (userData) {
      yield call(saveUser, userData);
      yield put(setUser(userData));

      // Check if nickname is missing
      if (!userData.nickname || userData.nickname.trim() === '') {
        yield put(setShowNicknameSetup(true));
      } else {
        yield put(setShowNicknameSetup(false));
      }
    }

    yield put(setAuthenticated(true));
    yield put(setError(null)); // Clear error on success
    yield put(setLoading(false));

    // Initialize sync service after successful login
    yield put(initializeSync());

    // Load accessible accounts
    yield put(loadAccessibleAccounts());

    // Show success toast
    const toast = getGlobalToast();
    if (toast) {
      toast(i18n.t('toast.loginSuccess'), 'success');
    }

    console.log('[AuthSaga] Login successful');
  } catch (error) {
    console.error('[AuthSaga] Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Login failed. Please try again.';
    yield put(setError(errorMessage));
    yield put(setLoading(false));
  }
}

function* signupSaga(action: { type: string; payload: { email: string; password: string } }): Generator {
  const { email, password } = action.payload;
  const apiClient: ApiClient = (yield select((state: RootState) => state.auth.apiClient)) as ApiClient;

  if (!apiClient) {
    throw new Error('API client not initialized');
  }

  try {
    const response = (yield call(apiClient.signup.bind(apiClient), email, password)) as { accessToken: string } | null;

    // Validate token before saving
    if (!response?.accessToken) {
      console.error('[AuthSaga] Invalid signup response:', response);
      throw new Error('Invalid signup response: missing accessToken');
    }

    // Save token
    const saved = (yield call(saveAuthTokens, response.accessToken)) as boolean;
    if (!saved) {
      throw new Error('Failed to save authentication token');
    }

    // Verify token was saved
    const savedTokens = (yield call(getAuthTokens)) as { accessToken: string } | null;
    if (!savedTokens || !savedTokens.accessToken) {
      throw new Error('Failed to save authentication token');
    }

    // Set token in API client
    apiClient.setAuthToken(response.accessToken);

    // Always get full user info from /me endpoint to ensure we have complete data including avatar
    const userData: User = (yield call(apiClient.getCurrentUser.bind(apiClient))) as User;

    console.log('[AuthSaga] User data from /me endpoint:', {
      hasAvatar: !!userData?.avatarUrl,
      avatarUrl: userData?.avatarUrl,
      email: userData?.email,
    });

    // Save user
    if (userData) {
      yield call(saveUser, userData);
      yield put(setUser(userData));

      // Check if nickname is missing
      if (!userData.nickname || userData.nickname.trim() === '') {
        yield put(setShowNicknameSetup(true));
      } else {
        yield put(setShowNicknameSetup(false));
      }
    }

    yield put(setAuthenticated(true));

    // Initialize sync service after successful signup
    yield put(initializeSync());

    // Load accessible accounts
    yield put(loadAccessibleAccounts());

    // Show success toast
    const toast = getGlobalToast();
    if (toast) {
      toast(i18n.t('toast.signupSuccess'), 'success');
    }

    console.log('[AuthSaga] Signup successful');
  } catch (error) {
    console.error('[AuthSaga] Signup error:', error);
    throw error;
  }
}

function* googleLoginSaga(action: { type: string; payload: { idToken: string; platform: string } }): Generator {
  const { idToken, platform } = action.payload;
  const apiClient: ApiClient = (yield select((state: RootState) => state.auth.apiClient)) as ApiClient;

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
    const response = (yield call(apiClient.googleAuth.bind(apiClient), idToken, platform as 'ios' | 'android')) as { accessToken: string } | null;

    // Validate token before saving
    if (!response?.accessToken) {
      console.error('[AuthSaga] Invalid Google login response:', response);
      const errorMessage = 'Invalid Google login response: missing accessToken';
      yield put(setError(errorMessage));
      yield put(setLoading(false));
      return;
    }

    // Save token
    const saved = (yield call(saveAuthTokens, response.accessToken)) as boolean;
    if (!saved) {
      const errorMessage = 'Failed to save authentication token';
      yield put(setError(errorMessage));
      yield put(setLoading(false));
      return;
    }

    // Verify token was saved
    const savedTokens = (yield call(getAuthTokens)) as { accessToken: string } | null;
    if (!savedTokens || !savedTokens.accessToken) {
      const errorMessage = 'Failed to save authentication token';
      yield put(setError(errorMessage));
      yield put(setLoading(false));
      return;
    }

    // Set token in API client
    apiClient.setAuthToken(response.accessToken);

    // Always get full user info from /me endpoint to ensure we have complete data including avatar
    const userData: User = (yield call(apiClient.getCurrentUser.bind(apiClient))) as User;

    console.log('[AuthSaga] User data from /me endpoint:', {
      hasAvatar: !!userData?.avatarUrl,
      avatarUrl: userData?.avatarUrl,
      email: userData?.email,
    });

    // Save user
    if (userData) {
      yield call(saveUser, userData);
      yield put(setUser(userData));

      // Check if nickname is missing
      if (!userData.nickname || userData.nickname.trim() === '') {
        yield put(setShowNicknameSetup(true));
      } else {
        yield put(setShowNicknameSetup(false));
      }
    }

    yield put(setAuthenticated(true));
    yield put(setError(null)); // Clear error on success
    yield put(setLoading(false));

    // Initialize sync service after successful Google login
    yield put(initializeSync());

    // Load accessible accounts
    yield put(loadAccessibleAccounts());

    // Show success toast
    const toast = getGlobalToast();
    if (toast) {
      toast(i18n.t('toast.loginSuccess'), 'success');
    }

    console.log('[AuthSaga] Google login successful');
  } catch (error) {
    console.error('[AuthSaga] Google login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Google login failed. Please try again.';

    // Handle specific error cases
    const errorWithStatus = error as Error & { status?: number; responseBody?: unknown };
    if (errorWithStatus.status === 409) {
      // Email already registered with email/password
      yield put(setError('Email already registered with email/password. Please login with email and password.'));
    } else if (errorWithStatus.status === 401) {
      // Invalid Google ID token
      yield put(setError('Invalid Google account. Please try again.'));
    } else {
      yield put(setError(errorMessage));
    }

    yield put(setLoading(false));
  }
}

function* logoutSaga() {
  console.log('[AuthSaga] logout() called - attempting to disable sync and clear auth');

  try {
    // Disable sync on explicit logout (persist state)
    try {
      yield call(SecureStore.setItemAsync, 'sync_enabled', 'false');
      yield put(setSyncEnabled(false));
      console.log('[AuthSaga] *** SYNC DISABLED ON LOGOUT *** - Set sync_enabled to "false"');
    } catch (error) {
      console.error('[AuthSaga] Error disabling sync on logout:', error);
    }
    yield put(setAccessibleAccounts([])); // Clear accounts on logout
    yield call(handleAuthError);

    // Show success toast
    const toast = getGlobalToast();
    if (toast) {
      toast(i18n.t('toast.logoutSuccess'), 'success');
    }

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

function* loadAccessibleAccountsSaga(): Generator {
  const apiClient: ApiClient = (yield select((state: RootState) => state.auth.apiClient)) as ApiClient;
  if (!apiClient) return;

  try {
    const response = (yield call(apiClient.listAccessibleAccounts.bind(apiClient))) as ListAccessibleAccountsResponse;
    yield put(setAccessibleAccounts(response.accounts));
    console.log('[AuthSaga] Loaded accessible accounts:', response.accounts.length);
  } catch (error) {
    console.error('[AuthSaga] Error loading accessible accounts:', error);
  }
}

// Handle active home ID change
function* handleActiveHomeIdChange(action: { type: string; payload: string | null }) {
  const apiClient: ApiClient = (yield select((state: RootState) => state.auth.apiClient)) as ApiClient;
  if (apiClient) {
    apiClient.setActiveUserId(action.payload);
    console.log('[AuthSaga] Updated ApiClient activeUserId:', action.payload);
  }
}

// Watchers
export function* authSaga() {
  yield takeLatest(INITIALIZE_API_CLIENT, initializeApiClientSaga);
  yield takeLatest(CHECK_AUTH, checkAuthSaga);
  yield takeLatest(LOGIN, loginSaga);
  yield takeLatest(SIGNUP, signupSaga);
  yield takeLatest(GOOGLE_LOGIN, googleLoginSaga);
  yield takeLatest(LOGOUT, logoutSaga);
  yield takeLatest(UPDATE_USER, updateUserSaga);
  yield takeLatest(LOAD_ACCESSIBLE_ACCOUNTS, loadAccessibleAccountsSaga);
  yield takeLatest(setActiveHomeId.type, handleActiveHomeIdChange);
}

