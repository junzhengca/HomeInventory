import { call, put, select, delay, spawn, take, actionChannel } from 'redux-saga/effects';
import { buffers } from '@redux-saga/core';
import { triggerCategoryRefresh } from '../slices/refreshSlice';
import { dataInitializationService } from '../../services/DataInitializationService';
import { Home } from '../../types/home';
import { HomeScopedEntity } from '../../types/inventory';
import { SyncDelta } from '../../types/sync';
import { ApiClient } from '../../services/ApiClient';
import type { RootState } from '../types';
import { getDeviceId } from '../../utils/deviceUtils';
import { syncLogger } from '../../utils/Logger';
import { syncRegistry } from './syncRegistry';

// Action types
const SYNC_ALL = 'sync/SYNC_ALL';
const REQUEST_SYNC = 'sync/REQUEST_SYNC';

// Action creators
export const syncAllAction = () => ({ type: SYNC_ALL });
export const requestSync = () => ({ type: REQUEST_SYNC });

/**
 * Resolve pending IDs from Redux state for a given registry key.
 */
function getPendingIdsFromState(state: RootState, key: string): Set<string> {
  let items: { pendingUpdate?: boolean; pendingCreate?: boolean; id: string }[] = [];
  if (key === 'inventoryItems') {
    items = state.inventory.items;
  } else if (key === 'todoItems') {
    items = state.todo.todos;
  } else if (key === 'todoCategories') {
    items = state.todo.categories;
  }

  return new Set(
    items.filter(i => i.pendingUpdate || i.pendingCreate).map(i => i.id)
  );
}

/**
 * Unified sync function that syncs ALL entity types for ALL homes.
 * Replaces both syncItemsSaga and syncTodosSaga.
 * Note: Homes are now fetched during auth flow, not during periodic sync.
 */
function* syncAllSaga(): Generator {
  try {
    const state = (yield select()) as RootState;
    const { apiClient, isAuthenticated, activeHomeId } = state.auth;

    if (!apiClient || !isAuthenticated) return;

    syncLogger.info('Starting unified sync sequence');

    // 1. Get all homes from HomeService (homes should already be loaded from auth flow)
    const { homeService } = yield import('../../services/HomeService');
    const homes = (yield call([homeService, homeService.getHomes])) as Home[];
    const deviceId = (yield call(getDeviceId)) as string;

    syncLogger.info(`Syncing content for ${homes.length} homes`);

    let activeHomeChanged = false;

    // 3. For each home, sync ALL entity types unconditionally
    for (const home of homes) {
      try {
        syncLogger.info(`Processing home: ${home.name} (${home.id})`);

        // Ensure data files exist
        yield call([dataInitializationService, 'initializeHomeData'], home.id);

        const isActiveHome = home.id === activeHomeId;

        // Sync every registered entity type (unconditionally -- fixes the pull bug)
        for (const entry of syncRegistry) {
          try {
            const delta = (yield call(
              entry.syncMethod,
              home.id,
              apiClient as ApiClient,
              deviceId,
            )) as SyncDelta<HomeScopedEntity>;

            if (isActiveHome && !delta.unchanged) {
              activeHomeChanged = true;

              // Apply delta to Redux for delta-dispatched entities only
              if (entry.type === 'delta') {
                const currentState = (yield select()) as RootState;
                const pendingIds = getPendingIdsFromState(currentState, entry.key);

                // Dispatch created before updated to ensure new entities exist before updates
                if (delta.created.length > 0) {
                  const filtered = delta.created.filter(e => !pendingIds.has(e.id));
                  if (filtered.length > 0) {
                    yield put(entry.addAction(filtered));
                  }
                }
                if (delta.updated.length > 0) {
                  const filtered = delta.updated.filter(e => !pendingIds.has(e.id));
                  if (filtered.length > 0) {
                    yield put(entry.upsertAction(filtered));
                  }
                }
                if (delta.deleted.length > 0) {
                  const filtered = delta.deleted.filter(id => !pendingIds.has(id));
                  if (filtered.length > 0) {
                    yield put(entry.removeAction(filtered));
                  }
                }
              }
            }
          } catch (entityError) {
            syncLogger.error(`Error syncing ${entry.key} for home ${home.id}`, entityError);
            // Continue to next entity type
          }
        }
      } catch (homeError) {
        syncLogger.error(`Error syncing home ${home.id}`, homeError);
        // Continue to next home
      }
    }

    // 4. Refresh UI if active home had changes
    if (activeHomeChanged) {
      yield put(triggerCategoryRefresh());
    } else {
      syncLogger.info('No changes for active home - skipping UI refresh');
    }

  } catch (error) {
    syncLogger.error('Error in unified sync sequence', error);
  }
}

/**
 * Single periodic sync timer (replaces two independent timers).
 */
function* periodicSyncSaga(): Generator {
  while (true) {
    yield delay(5 * 60 * 1000);
    const state = (yield select()) as RootState;
    if (state.auth.isAuthenticated) {
      syncLogger.info('Triggering periodic sync');
      yield put(syncAllAction());
    }
  }
}

/**
 * Single debounced sync channel (replaces two independent channels).
 * Uses a sliding buffer so only the latest request is kept.
 */
function* debouncedSyncSaga(): Generator {
  const channel = yield actionChannel(REQUEST_SYNC, buffers.sliding(1));

  syncLogger.verbose('Debounced sync saga started');

  while (true) {
    yield take(channel);

    // Wait 2 seconds for more requests to accumulate
    yield delay(2000);

    syncLogger.verbose('Debounced sync: executing sync after inactivity period');
    yield call(syncAllSaga);
  }
}

// Root sync saga
export function* syncSaga() {
  // Listen for immediate sync requests
  yield spawn(function* () {
    while (true) {
      yield take(SYNC_ALL);
      yield call(syncAllSaga);
    }
  });

  // Start periodic sync
  yield spawn(periodicSyncSaga);

  // Start debounced sync
  yield spawn(debouncedSyncSaga);
}
