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
import { loadItems, syncItemsAction } from './inventorySaga';
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
import { homeService } from '../../services/HomeService';
import { User, ErrorDetails } from '../../types/api';
import type { RootState } from '../types';
import { getGlobalToast } from '../../components/organisms/ToastProvider';
import i18n from '../../i18n/i18n';
import { authLogger } from '../../utils/Logger';

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
export const authError = (endpoint?: string) => ({ type: AUTH_ERROR, payload: endpoint });
export const accessDenied = (resourceId?: string) => ({ type: ACCESS_DENIED, payload: resourceId });

type AuthChannelEvent = { type: string; payload?: string };

function createAuthChannel(apiClient: ApiClient): EventChannel<AuthChannelEvent> {
  return eventChannel((emit) => {
    const onAuthError = (endpoint: string) => {
      emit(authError(endpoint));
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
      authLogger.info('API error callback triggered, showing error bottom sheet');
      if (globalErrorHandler) {
        globalErrorHandler(errorDetails);
      } else {
        authLogger.warn('Global error handler not set, cannot show error bottom sheet');
      }
    });

    // Create event channel for auth events (401, 403)
    const authChannel: EventChannel<AuthChannelEvent> = yield call(createAuthChannel, apiClient);
    yield fork(function* () {
      while (true) {
        const action: AuthChannelEvent = (yield take(authChannel)) as AuthChannelEvent;
        yield put(action);
      }
    });

    // Set initial active home ID from state
    const activeHomeId: string | null = (yield select((state: RootState) => state.auth.activeHomeId)) as string | null;
    // We don't set activeUserId on apiClient because activeHomeId is a context, not a user impersonation.
    // Inventory and Todo sagas handle scoping explicitly.

    yield put(setApiClient(apiClient));

    // Start auth check after API client is ready
    yield put(checkAuth());
  } catch (error) {
    authLogger.error('Error initializing API client', error);
    yield put(setLoading(false));
  }
}

function* clearAuthAndLogout() {
  authLogger.info('Clearing auth data');
  yield call(clearAllAuthData);

  // Clear the apiClient's auth token to prevent stale authenticated requests
  const apiClient: ApiClient | null = yield select((state: RootState) => state.auth.apiClient);
  if (apiClient) {
    apiClient.setAuthToken('');
  }

  yield put(setUser(null));
  yield put(setAuthenticated(false));

  // Instead of setting null, try to select a default home (offline mode)
  yield call(restoreOrSelectActiveHome);
}

function* handleAuthError(action: { type: string; payload?: string }) {
  const endpoint = action.payload;

  // Only invalidate auth when /me endpoint returns 401
  // Other 401s (e.g. expired sharing tokens) should not log the user out
  if (endpoint !== '/api/auth/me') {
    authLogger.info(`401 on non-/me endpoint, ignoring: ${endpoint}`);
    return;
  }

  yield call(clearAuthAndLogout);
}

function* handleAccessDenied(action: { type: string; payload?: string }) {
  const deniedUserId = action.payload;
  authLogger.info('Access denied for user', deniedUserId);

  if (!deniedUserId) return;

  // If current active home is the denied one, switch to personal or null
  const activeHomeId: string | null = (yield select((state: RootState) => state.auth.activeHomeId)) as string | null;
  if (activeHomeId === deniedUserId) {
    authLogger.warn('Active home access denied, switching to default');
    // Try to restore a valid home (this will likely pick the default one if the current one is invalid/denied)
    yield call(restoreOrSelectActiveHome);

    // If restoreOrSelectActiveHome didn't change it (e.g. it picked the same one?), we might need to force it.
    // But restoreOrSelectActiveHome only picks from homeService.getHomes(). 
    // If access is denied, maybe we should remove it from homeService?
    // That's a separate concern (sync/cleanup). For now, just ensuring SOME home is selected.

    const toast = getGlobalToast();
    if (toast) {
      toast('Access to this home has been revoked', 'error');
    }
  }
}

// Helper to restore or select a default active home
function* restoreOrSelectActiveHome() {
  let activeHomeId: string | null = (yield call(getActiveHomeId)) as string | null;
  const allHomes = homeService.getHomes();

  // Validate the persisted ID
  if (activeHomeId && !allHomes.find(h => h.id === activeHomeId)) {
    authLogger.warn(`Persisted activeHomeId ${activeHomeId} not found in homes list.`);
    activeHomeId = null;
  }

  // Default if null
  if (!activeHomeId && allHomes.length > 0) {
    activeHomeId = allHomes[0].id;
    authLogger.info(`No valid active home persisted, defaulting to first home: ${activeHomeId}`);
  }

  if (activeHomeId) {
    authLogger.info('Setting active home ID', activeHomeId);
    yield put(setActiveHomeId(activeHomeId));
    return activeHomeId;
  }

  return null;
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
      // Ensure a home is selected even if not logged in (offline mode)
      yield call(restoreOrSelectActiveHome);
      yield put(setLoading(false));
      return;
    }

    // Set access token in API client
    apiClient.setAuthToken(tokens.accessToken);

    // Verify auth by calling /me endpoint
    try {
      const currentUser: User = (yield call(apiClient.getCurrentUser.bind(apiClient))) as User;

      authLogger.info('/me endpoint response', {
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

        // Restore active home ID or select default
        yield call(restoreOrSelectActiveHome);

        // Reload data with correct context
        yield put(loadItems());
        yield put(loadTodos());
        yield put(loadSettings());


        // Sync everything (Homes + Content)
        yield put(syncItemsAction());
      }
    } catch (error) {
      // Check if it's a 401 error
      const errorStatus = (error as any)?.status;

      if (errorStatus === 401) {
        // If /me returns 401, user is not authenticated
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        authLogger.error(`Auth verification failed (401): ${errorMessage}`, error);
        yield call(clearAuthAndLogout);
      } else {
        // For other errors (network, 500, etc.), try to use cached user
        // This effectively enables offline mode if we have a token
        authLogger.warn('Failed to verify auth with server, checking local cache', error);

        const savedUser: User | null = (yield call(getUser)) as User | null;

        if (savedUser) {
          authLogger.info('Using cached user data for offline/error mode');
          yield put(setUser(savedUser));
          yield put(setAuthenticated(true));

          // Check if nickname is missing
          if (!savedUser.nickname || savedUser.nickname.trim() === '') {
            yield put(setShowNicknameSetup(true));
          } else {
            yield put(setShowNicknameSetup(false));
          }

          // Restore active home ID or select default
          yield call(restoreOrSelectActiveHome);

          // Reload data with correct context (from local DB)
          yield put(loadItems());
          yield put(loadTodos());
          yield put(loadSettings());
        } else {
          // No cached user, but we have a token that failed with non-401?
          // This is a tricky state. We probably shouldn't logout if it's a network error.
          // But if we can't load a user, we can't really "authenticate" the app UI.
          // For now, if we have no user data, we must logout.
          authLogger.error('No cached user data available and server request failed');
          yield call(clearAuthAndLogout);
        }
      }
    }
  } catch (error) {
    authLogger.error('Error checking auth', error);
    yield call(clearAuthAndLogout);
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
      authLogger.error('Invalid login response', response);
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

    authLogger.info('User data from /me endpoint', {
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

    // Restore active home ID or select default
    yield call(restoreOrSelectActiveHome);

    // Reload data with correct context
    yield put(loadItems());
    yield put(loadTodos());
    yield put(loadSettings());


    // Sync everything (Homes + Content)
    yield put(syncItemsAction());

    // Show success toast
    const toast = getGlobalToast();
    if (toast) {
      toast(i18n.t('toast.loginSuccess'), 'success');
    }

    authLogger.info('Login successful');
  } catch (error) {
    authLogger.error('Login error', error);
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
      authLogger.error('Invalid signup response', response);
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

    authLogger.info('User data from /me endpoint', {
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

    // Restore active home ID or select default
    yield call(restoreOrSelectActiveHome);

    // Reload data with correct context
    yield put(loadItems());
    yield put(loadTodos());
    yield put(loadSettings());


    // Sync everything (Homes + Content)
    yield put(syncItemsAction());

    // Show success toast
    const toast = getGlobalToast();
    if (toast) {
      toast(i18n.t('toast.signupSuccess'), 'success');
    }

    authLogger.info('Signup successful');
  } catch (error) {
    authLogger.error('Signup error', error);
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
      authLogger.error('Invalid Google login response', response);
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

    authLogger.info('User data from /me endpoint', {
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

    // Restore active home ID or select default
    yield call(restoreOrSelectActiveHome);

    // Reload data with correct context
    yield put(loadItems());
    yield put(loadTodos());
    yield put(loadSettings());


    // Sync everything (Homes + Content)
    yield put(syncItemsAction());

    // Show success toast
    const toast = getGlobalToast();
    if (toast) {
      toast(i18n.t('toast.loginSuccess'), 'success');
    }

    authLogger.info('Google login successful');
  } catch (error) {
    authLogger.error('Google login error', error);
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
  authLogger.info('logout() called - clearing auth');

  try {
    yield call(clearAuthAndLogout);

    // Show success toast
    const toast = getGlobalToast();
    if (toast) {
      toast(i18n.t('toast.logoutSuccess'), 'success');
    }

    authLogger.info('Logout successful');
  } catch (error) {
    authLogger.error('Error during logout', error);
    yield call(clearAuthAndLogout);
  }
}

function* updateUserSaga(action: { type: string; payload: User }) {
  try {
    yield call(saveUser, action.payload);
    yield put(setUser(action.payload));
  } catch (error) {
    authLogger.error('Error updating user', error);
    throw error;
  }
}

// Handle active home ID change
function* handleActiveHomeIdChange(action: { type: string; payload: string | null }) {
  const apiClient: ApiClient = (yield select((state: RootState) => state.auth.apiClient)) as ApiClient;

  authLogger.info('Active home ID changed, persisting', action.payload);

  if (action.payload) {
    yield call(saveActiveHomeId, action.payload);

    // Sync HomeService state
    // We call this to ensure HomeService's internal state matches Redux
    // But we don't want it to trigger another dispatch loop, so useHome must be fixed next
    homeService.switchHome(action.payload);

    // Reload data for the new home
    authLogger.info('Reloading data for new home', action.payload);
    yield put(loadItems());
    yield put(loadTodos());
    yield put(loadSettings());
  } else {
    yield call(removeActiveHomeId);
    // If no home is active, we might want to clear data or ensure HomeService knows
    // homeService.switchHome(null); // HomeService might not support null completely yet
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
