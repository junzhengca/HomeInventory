import { call, put, takeLatest, select, fork, take } from 'redux-saga/effects';
import { eventChannel, EventChannel } from 'redux-saga';
import {
  setUser,
  setAuthenticated,
  setLoading,
  setError,
  setApiClient,
  setShowNicknameSetup,
  setActiveHomeId,
} from '../slices/authSlice';
import {
  setSyncEnabled,
} from '../slices/syncSlice';
import { initializeSync } from './syncSaga';
import { loadItems } from './inventorySaga';
import { loadTodos } from './todoSaga';
import { loadSettings } from './settingsSaga';
import {
  ApiClient,
} from '../../services/ApiClient';
import {
  getAuthTokens,
  saveAuthTokens,
  clearAllAuthData,
  getUser,
  saveUser,
  saveActiveHomeId,
  getActiveHomeId,
  removeActiveHomeId,
} from '../../services/AuthService';
import { User, ErrorDetails } from '../../types/api';
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
const INITIALIZE_API_CLIENT = 'auth/INITIALIZE_API_CLIENT';
const AUTH_ERROR = 'auth/AUTH_ERROR';
const ACCESS_DENIED = 'auth/ACCESS_DENIED';

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
export const initializeApiClient = (apiBaseUrl: string) => ({
  type: INITIALIZE_API_CLIENT,
  payload: apiBaseUrl,
});
export const authError = () => ({ type: AUTH_ERROR });
export const accessDenied = (resourceId?: string) => ({ type: ACCESS_DENIED, payload: resourceId });

function createAuthChannel(apiClient: ApiClient): EventChannel<any> {
  return eventChannel((emit) => {
    const onAuthError = () => {
      emit(authError());
    };
    const onAccessDenied = (resourceId?: string) => {
      emit(accessDenied(resourceId));
    };

    apiClient.setOnAuthError(onAuthError);
    apiClient.setOnAccessDenied(onAccessDenied);

    return () => {
      apiClient.setOnAuthError(() => { });
      apiClient.setOnAccessDenied(() => { });
    };
  });
}

function* initializeApiClientSaga(action: { type: string; payload: string }) {
  try {
    const apiBaseUrl = action.payload;
    const apiClient = new ApiClient(apiBaseUrl);

    // Set up error callback for API errors (when all retries are exhausted)
    apiClient.setOnError((errorDetails: ErrorDetails) => {
      console.log('[AuthSaga] API error callback triggered, showing error bottom sheet');
      if (globalErrorHandler) {
        globalErrorHandler(errorDetails);
      } else {
        console.warn('[AuthSaga] Global error handler not set, cannot show error bottom sheet');
      }
    });

    // Create event channel for auth events (401, 403)
    const authChannel: EventChannel<any> = yield call(createAuthChannel, apiClient);
    yield fork(function* () {
      while (true) {
        const action: { type: string } = (yield take(authChannel)) as { type: string };
        yield put(action);
      }
    });

    // Set initial active home ID from state - no need to set on apiClient anymore
    // const activeHomeId: string | null = (yield select((state: RootState) => state.auth.activeHomeId)) as string | null;
    // if (activeHomeId) {
    //   apiClient.setActiveUserId(activeHomeId);
    // }

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
  yield put(setActiveHomeId(null));
}

function* handleAccessDenied(action: { type: string; payload?: string }) {
  const deniedUserId = action.payload;
  console.log('[AuthSaga] Access denied for home:', deniedUserId);

  if (!deniedUserId) return;

  // If current active home is the denied one, switch to personal or null
  const activeHomeId: string | null = (yield select((state: RootState) => state.auth.activeHomeId)) as string | null;
  if (activeHomeId === deniedUserId) {
    console.warn('[AuthSaga] Active home access denied, switching to default');
    yield put(setActiveHomeId(null));
    yield call(removeActiveHomeId);

    const toast = getGlobalToast();
    if (toast) {
      toast('Access to this home has been revoked', 'error');
    }
  }
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

        // Restore active home ID
        const activeHomeId: string | null = (yield call(getActiveHomeId)) as string | null;
        if (activeHomeId) {
          console.log('[AuthSaga] Restoring active home ID:', activeHomeId);
          yield put(setActiveHomeId(activeHomeId));
        }

        // Initialize sync service after successful authentication
        yield put(initializeSync());

        // Reload data with correct context
        yield put(loadItems());
        yield put(loadTodos());
        yield put(loadSettings());
      } else if (savedUser) {
        yield put(setUser(savedUser));
        yield put(setAuthenticated(true));

        // Check if nickname is missing
        if (!savedUser.nickname || savedUser.nickname.trim() === '') {
          yield put(setShowNicknameSetup(true));
        } else {
          yield put(setShowNicknameSetup(false));
        }

        // Restore active home ID
        const activeHomeId: string | null = (yield call(getActiveHomeId)) as string | null;
        if (activeHomeId) {
          console.log('[AuthSaga] Restoring active home ID:', activeHomeId);
          yield put(setActiveHomeId(activeHomeId));
        }

        // Initialize sync service after successful authentication
        yield put(initializeSync());

        // Reload data with correct context
        yield put(loadItems());
        yield put(loadTodos());
        yield put(loadSettings());
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

    // Restore active home ID
    const activeHomeId: string | null = (yield call(getActiveHomeId)) as string | null;
    if (activeHomeId) {
      console.log('[AuthSaga] Restoring active home ID on login:', activeHomeId);
      yield put(setActiveHomeId(activeHomeId));
    }

    // Initialize sync service after successful login
    yield put(initializeSync());

    // Reload data with correct context
    yield put(loadItems());
    yield put(loadTodos());
    yield put(loadSettings());

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

    // Restore active home ID
    const activeHomeId: string | null = (yield call(getActiveHomeId)) as string | null;
    if (activeHomeId) {
      console.log('[AuthSaga] Restoring active home ID on Google login:', activeHomeId);
      yield put(setActiveHomeId(activeHomeId));
    }

    // Initialize sync service after successful Google login
    yield put(initializeSync());

    // Reload data with correct context
    yield put(loadItems());
    yield put(loadTodos());
    yield put(loadSettings());

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
  // Obsolete: we now use HomeService/homes entity
  return;
}

// Handle active home ID change
function* handleActiveHomeIdChange(action: { type: string; payload: string | null }) {
  // Persistence logic only - ApiClient no longer stores activeUserId
  console.log('[AuthSaga] Persisting activeHomeId change:', action.payload);

  if (action.payload) {
    yield call(saveActiveHomeId, action.payload);
  } else {
    yield call(removeActiveHomeId);
  }
}

// Watchers
export function* authSaga() {
  yield takeLatest(INITIALIZE_API_CLIENT, initializeApiClientSaga);
  yield takeLatest(AUTH_ERROR, handleAuthError);
  yield takeLatest(ACCESS_DENIED, handleAccessDenied);
  yield takeLatest(CHECK_AUTH, checkAuthSaga);
  yield takeLatest(LOGIN, loginSaga);
  yield takeLatest(SIGNUP, signupSaga);
  yield takeLatest(GOOGLE_LOGIN, googleLoginSaga);
  yield takeLatest(LOGOUT, logoutSaga);
  yield takeLatest(UPDATE_USER, updateUserSaga);
  yield takeLatest(setActiveHomeId.type, handleActiveHomeIdChange);
}

