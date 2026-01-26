import { call, put, select, takeLatest, fork, take, cancelled } from 'redux-saga/effects';
import { eventChannel } from 'redux-saga';
import {
  setSyncService,
  setSyncEnabled,
  setSyncLoading,
  setSyncStatus,
  setSyncLastSyncTime,
  setSyncError,
} from '../slices/syncSlice';
import {
  upsertItems,
  removeItems,
} from '../slices/inventorySlice';
import {
  upsertTodos,
  removeTodos,
} from '../slices/todoSlice';
import { silentRefreshItems } from './inventorySaga';
import { silentRefreshTodos } from './todoSaga';
import { syncCallbackRegistry } from '../../services/SyncCallbackRegistry';
import SyncService, { SyncFileType, SyncEvent } from '../../services/SyncService';
import { InventoryItem, TodoItem } from '../../types/inventory';
import { ApiClient } from '../../services/ApiClient';
import type { RootState } from '../types';

// Action types
const INITIALIZE_SYNC = 'sync/INITIALIZE_SYNC';
const RESTORE_SYNC = 'sync/RESTORE_SYNC';
const ENABLE_SYNC = 'sync/ENABLE_SYNC';
const DISABLE_SYNC = 'sync/DISABLE_SYNC';
const SYNC_ALL = 'sync/SYNC_ALL';
const SYNC_FILE = 'sync/SYNC_FILE';
const REGISTER_SYNC_CALLBACKS = 'sync/REGISTER_SYNC_CALLBACKS';

// Action creators
export const initializeSync = (deviceName?: string) => ({
  type: INITIALIZE_SYNC,
  payload: deviceName,
});
export const restoreSync = () => ({ type: RESTORE_SYNC });
export const enableSync = () => ({ type: ENABLE_SYNC });
export const disableSync = () => ({ type: DISABLE_SYNC });
export const syncAll = () => ({ type: SYNC_ALL });
export const syncFile = (fileType: SyncFileType) => ({ type: SYNC_FILE, payload: fileType });
export const registerSyncCallbacks = () => ({ type: REGISTER_SYNC_CALLBACKS });

function* initializeSyncSaga(action: { type: string; payload?: string }): Generator {
  const apiClient = (yield select((state: RootState) => state.auth.apiClient)) as ApiClient | null;

  if (!apiClient) {
    console.log('[SyncSaga] API client not yet available, skipping initialization');
    return;
  }

  try {
    const deviceName = action.payload;
    const newSyncService: SyncService = (yield call(() => new SyncService(apiClient))) as SyncService;
    yield call(newSyncService.initialize.bind(newSyncService), deviceName);

    yield put(setSyncService(newSyncService));

    // Read persisted state from SyncService and set enabled state accordingly
    const persistedEnabled: boolean = (yield call(newSyncService.isEnabled.bind(newSyncService))) as boolean;
    console.log('[SyncSaga] Setting enabled state from persisted storage:', persistedEnabled);
    yield put(setSyncEnabled(persistedEnabled));

    // Load sync status
    const status = (yield call(newSyncService.getSyncStatus.bind(newSyncService))) as Awaited<ReturnType<SyncService['getSyncStatus']>>;
    if (status) {
      yield put(setSyncStatus(status));
    }

    // Set up event listener
    yield fork(watchSyncEvents, newSyncService);

    // Start sync restoration when API client is ready
    yield put(restoreSync());
  } catch (err) {
    console.error('[SyncSaga] Error initializing sync:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to initialize sync';
    yield put(setSyncError(errorMessage));
  }
}

function* watchSyncEvents(syncService: SyncService): Generator {
  // Create an event channel for sync events
  const channel = eventChannel<SyncEvent>((emitter) => {
    const listener = (event: SyncEvent) => {
      console.log('[SyncSaga] Sync event:', event);
      emitter(event);
    };

    // Register the listener and get the unsubscribe function
    const unsubscribe = syncService.addListener(listener);

    // Return the unsubscribe function
    return unsubscribe;
  });

  try {
    // Watch for sync events from the channel
    while (true) {
      const event: SyncEvent = (yield take(channel)) as SyncEvent;

      if (event.type === 'error') {
        yield put(setSyncError(event.error || 'Sync error occurred'));
      } else {
        yield put(setSyncError(null));
      }

      if (event.timestamp) {
        yield put(setSyncLastSyncTime(event.timestamp));
      }

      // Refresh sync status after each event
      const status = (yield call(syncService.getSyncStatus.bind(syncService))) as Awaited<ReturnType<SyncService['getSyncStatus']>>;
      if (status) {
        yield put(setSyncStatus(status));
      }

      // Trigger silent inventory refresh or granular update when inventoryItems are pulled from server
      if (event.type === 'pull' && event.fileType === 'inventoryItems') {
        if (event.changes) {
          console.log('[SyncSaga] Inventory items pulled, applying granular updates:', event.changes);
          const { added, updated, removed } = event.changes as { added: InventoryItem[], updated: InventoryItem[], removed: string[] };

          // Handle added/updated items together (upsert)
          const itemsToUpsert = [...added, ...updated];
          if (itemsToUpsert.length > 0) {
            yield put(upsertItems(itemsToUpsert));
          }

          // Handle removed items
          if (removed.length > 0) {
            yield put(removeItems(removed));
          }
        } else {
          console.log('[SyncSaga] Inventory items pulled (no changes info), silently refreshing inventory state...');
          yield put(silentRefreshItems());
        }
      }

      // Trigger silent todos refresh or granular update when todoItems are pulled from server
      if (event.type === 'pull' && event.fileType === 'todoItems') {
        if (event.changes) {
          console.log('[SyncSaga] Todo items pulled, applying granular updates:', event.changes);
          const { added, updated, removed } = event.changes as { added: TodoItem[], updated: TodoItem[], removed: string[] };

          // Handle added/updated items together (upsert)
          const todosToUpsert = [...added, ...updated];
          if (todosToUpsert.length > 0) {
            yield put(upsertTodos(todosToUpsert));
          }

          // Handle removed items
          if (removed.length > 0) {
            yield put(removeTodos(removed));
          }
        } else {
          console.log('[SyncSaga] Todo items pulled (no changes info), silently refreshing todos state...');
          yield put(silentRefreshTodos());
        }
      }
    }
  } finally {
    if (yield cancelled()) {
      console.log('[SyncSaga] Sync event watch cancelled');
      channel.close();
    }
  }
}

function* restoreSyncSaga(): Generator {
  const { isAuthenticated, isLoading: isAuthLoading } = (yield select((state: RootState) => ({
    isAuthenticated: state.auth.isAuthenticated,
    isLoading: state.auth.isLoading,
  }))) as { isAuthenticated: boolean; isLoading: boolean };
  const syncService: SyncService | null = (yield select((state: RootState) => state.sync.syncService)) as SyncService | null;

  // Wait for all prerequisites to be ready
  if (isAuthLoading) {
    console.log('[SyncSaga] Auth still loading, waiting...');
    return;
  }

  if (!syncService) {
    console.log('[SyncSaga] Sync service not available yet');
    return;
  }

  if (!isAuthenticated) {
    // User is not authenticated - do not touch sync state
    // Sync will be disabled explicitly by authSaga during logout
    console.log('[SyncSaga] User not authenticated, skipping sync restoration');
    return;
  }

  // User is authenticated - check if sync should be restored
  const persistedEnabled: boolean = (yield call(syncService.isEnabled.bind(syncService))) as boolean;
  const currentEnabled = (yield select((state: RootState) => state.sync.enabled)) as boolean;

  console.log('[SyncSaga] User authenticated, checking sync restoration:', {
    persistedEnabled,
    currentEnabled,
  });

  if (persistedEnabled) {
    // Sync was previously enabled - restore it (enable() is idempotent, so safe to call even if already enabled)
    console.log('[SyncSaga] Restoring sync (was previously enabled)...');
    try {
      yield call(syncService.enable.bind(syncService));
      yield put(setSyncEnabled(true));
      // Register sync callbacks after enabling sync
      yield put(registerSyncCallbacks());
      console.log('[SyncSaga] Sync successfully restored and callbacks registered');
    } catch (error) {
      console.error('[SyncSaga] Error restoring sync:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to restore sync';
      yield put(setSyncError(errorMessage));
    }
  } else {
    // Sync was not previously enabled
    console.log('[SyncSaga] Sync was not previously enabled, skipping restoration');
  }
}

function* enableSyncSaga(): Generator {
  let syncService: SyncService | null = (yield select((state: RootState) => state.sync.syncService)) as SyncService | null;

  // If sync service is not initialized, initialize it first
  if (!syncService) {
    const apiClient = (yield select((state: RootState) => state.auth.apiClient)) as ApiClient | null;
    if (!apiClient) {
      const errorMessage = 'API client not available. Please ensure you are logged in.';
      yield put(setSyncError(errorMessage));
      throw new Error(errorMessage);
    }

    try {
      console.log('[SyncSaga] Sync service not initialized, initializing now...');
      const newSyncService: SyncService = (yield call(() => new SyncService(apiClient))) as SyncService;
      yield call(newSyncService.initialize.bind(newSyncService));
      yield put(setSyncService(newSyncService));

      // Set up event listener
      yield fork(watchSyncEvents, newSyncService);

      syncService = newSyncService;
      console.log('[SyncSaga] Sync service initialized successfully');
    } catch (err) {
      console.error('[SyncSaga] Error initializing sync service:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize sync service';
      yield put(setSyncError(errorMessage));
      throw new Error(errorMessage);
    }
  }

  // At this point, syncService is guaranteed to be non-null
  if (!syncService) {
    throw new Error('Sync service initialization failed');
  }

  try {
    yield put(setSyncLoading(true));
    yield put(setSyncError(null));
    console.log('[SyncSaga] Enabling sync...');
    yield call(syncService.enable.bind(syncService));
    yield put(setSyncEnabled(true));
    // Register sync callbacks after enabling sync
    yield put(registerSyncCallbacks());
    console.log('[SyncSaga] Sync enabled and callbacks registered');
  } catch (err) {
    console.error('[SyncSaga] Error enabling sync:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to enable sync';
    yield put(setSyncError(errorMessage));
    throw err;
  } finally {
    yield put(setSyncLoading(false));
  }
}

function* disableSyncSaga(): Generator {
  const syncService: SyncService | null = (yield select((state: RootState) => state.sync.syncService)) as SyncService | null;

  if (!syncService) {
    // If sync service is not initialized, just set enabled to false
    console.log('[SyncSaga] Sync service not initialized, setting enabled to false');
    yield put(setSyncEnabled(false));
    return;
  }

  try {
    yield put(setSyncLoading(true));
    yield put(setSyncError(null));
    console.log('[SyncSaga] Disabling sync...');
    yield call(syncService.disable.bind(syncService));
    yield put(setSyncEnabled(false));
    console.log('[SyncSaga] Sync disabled');
  } catch (err) {
    console.error('[SyncSaga] Error disabling sync:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to disable sync';
    yield put(setSyncError(errorMessage));
    throw err;
  } finally {
    yield put(setSyncLoading(false));
  }
}

function* syncAllSaga(): Generator {
  let syncService: SyncService | null = (yield select((state: RootState) => state.sync.syncService)) as SyncService | null;

  // If sync service is not initialized, initialize it first
  if (!syncService) {
    const apiClient = (yield select((state: RootState) => state.auth.apiClient)) as ApiClient | null;
    if (!apiClient) {
      const errorMessage = 'API client not available. Please ensure you are logged in.';
      yield put(setSyncError(errorMessage));
      return;
    }

    try {
      console.log('[SyncSaga] Sync service not initialized, initializing now...');
      const newSyncService: SyncService = (yield call(() => new SyncService(apiClient))) as SyncService;
      yield call(newSyncService.initialize.bind(newSyncService));
      yield put(setSyncService(newSyncService));

      // Set up event listener
      yield fork(watchSyncEvents, newSyncService);

      syncService = newSyncService;
      console.log('[SyncSaga] Sync service initialized successfully');
    } catch (err) {
      console.error('[SyncSaga] Error initializing sync service:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize sync service';
      yield put(setSyncError(errorMessage));
      return;
    }
  }

  // At this point, syncService is guaranteed to be non-null
  if (!syncService) {
    return;
  }

  try {
    yield put(setSyncLoading(true));
    yield put(setSyncError(null));
    console.log('[SyncSaga] Syncing all files...');
    yield call(syncService.syncAll.bind(syncService));
  } catch (err) {
    console.error('[SyncSaga] Error syncing all:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to sync';
    yield put(setSyncError(errorMessage));
    throw err;
  } finally {
    yield put(setSyncLoading(false));
  }
}

function* syncFileSaga(action: { type: string; payload: SyncFileType }): Generator {
  const fileType = action.payload;
  let syncService: SyncService | null = (yield select((state: RootState) => state.sync.syncService)) as SyncService | null;

  // If sync service is not initialized, initialize it first
  if (!syncService) {
    const apiClient = (yield select((state: RootState) => state.auth.apiClient)) as ApiClient | null;
    if (!apiClient) {
      const errorMessage = 'API client not available. Please ensure you are logged in.';
      yield put(setSyncError(errorMessage));
      return;
    }

    try {
      console.log('[SyncSaga] Sync service not initialized, initializing now...');
      const newSyncService: SyncService = (yield call(() => new SyncService(apiClient))) as SyncService;
      yield call(newSyncService.initialize.bind(newSyncService));
      yield put(setSyncService(newSyncService));

      // Set up event listener
      yield fork(watchSyncEvents, newSyncService);

      syncService = newSyncService;
      console.log('[SyncSaga] Sync service initialized successfully');
    } catch (err) {
      console.error('[SyncSaga] Error initializing sync service:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize sync service';
      yield put(setSyncError(errorMessage));
      return;
    }
  }

  // At this point, syncService is guaranteed to be non-null
  if (!syncService) {
    return;
  }

  try {
    yield put(setSyncLoading(true));
    yield put(setSyncError(null));
    console.log(`[SyncSaga] Syncing ${fileType}...`);
    yield call(syncService.syncFile.bind(syncService), fileType, 'full');
  } catch (err) {
    console.error(`[SyncSaga] Error syncing ${fileType}:`, err);
    const errorMessage = err instanceof Error ? err.message : `Failed to sync ${fileType}`;
    yield put(setSyncError(errorMessage));
    throw err;
  } finally {
    yield put(setSyncLoading(false));
  }
}

function* registerSyncCallbacksSaga(): Generator {
  const enabled = (yield select((state: RootState) => state.sync.enabled)) as boolean;
  const syncService: SyncService | null = (yield select((state: RootState) => state.sync.syncService)) as SyncService | null;

  if (!enabled || !syncService) {
    // Unregister callbacks when sync is disabled
    ['categories', 'locations', 'inventoryItems', 'todoItems', 'settings'].forEach((key) => {
      syncCallbackRegistry.setCallback(key as SyncFileType, null);
    });
    return;
  }

  // Register callbacks when sync is enabled
  const syncOnDataChange = (fileType: SyncFileType) => {
    console.log(`[SyncSaga] Syncing ${fileType} on data change...`);
    // Queue a high-priority push sync for the changed file type
    syncService.queueSync(fileType, 'push', 'high');
  };

  syncCallbackRegistry.setCallback('categories', () => syncOnDataChange('categories'));
  syncCallbackRegistry.setCallback('locations', () => syncOnDataChange('locations'));
  syncCallbackRegistry.setCallback('inventoryItems', () => syncOnDataChange('inventoryItems'));
  syncCallbackRegistry.setCallback('todoItems', () => syncOnDataChange('todoItems'));
  syncCallbackRegistry.setCallback('settings', () => syncOnDataChange('settings'));

  console.log('[SyncSaga] Sync callbacks registered');
}

// Watcher
export function* syncSaga() {
  yield takeLatest(INITIALIZE_SYNC, initializeSyncSaga);
  yield takeLatest(RESTORE_SYNC, restoreSyncSaga);
  yield takeLatest(ENABLE_SYNC, enableSyncSaga);
  yield takeLatest(DISABLE_SYNC, disableSyncSaga);
  yield takeLatest(SYNC_ALL, syncAllSaga);
  yield takeLatest(SYNC_FILE, syncFileSaga);
  yield takeLatest(REGISTER_SYNC_CALLBACKS, registerSyncCallbacksSaga);
}

