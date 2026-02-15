import { select } from 'redux-saga/effects';
import type { RootState } from '../../types';

/**
 * Shared helper to get the active home ID from Redux state.
 * Returns undefined if no home is active.
 */
export function* getActiveHomeId(): Generator<unknown, string | undefined, unknown> {
  const state = (yield select()) as RootState;
  const { activeHomeId } = state.auth;

  if (!activeHomeId) {
    return undefined;
  }

  return activeHomeId;
}
