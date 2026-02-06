
import { call, put, takeLatest, select } from 'redux-saga/effects';
import { setSettings, setLoading, setUpdateResult } from '../slices/settingsSlice';
import { getSettings, updateSettings as updateSettingsService } from '../../services/SettingsService';
import { Settings } from '../../types/settings';
import i18n from '../../i18n/i18n';
import type { RootState } from '../types';
import { sagaLogger } from '../../utils/Logger';

// Action types
const LOAD_SETTINGS = 'settings/LOAD_SETTINGS';
const UPDATE_SETTINGS = 'settings/UPDATE_SETTINGS';

// Action creators
export const loadSettings = () => ({ type: LOAD_SETTINGS });
export const updateSettings = (updates: Partial<Settings>) => ({
  type: UPDATE_SETTINGS,
  payload: updates,
});

function* getFileUserId() {
  const state: RootState = yield select();
  const { activeHomeId, user } = state.auth;
  return activeHomeId && user && activeHomeId !== user.id ? activeHomeId : undefined;
}

function* loadSettingsSaga() {
  try {
    const userId: string | undefined = yield call(getFileUserId);
    const loadedSettings: Settings = yield call(getSettings, userId);
    yield put(setSettings(loadedSettings));
    // Update i18n language when settings are loaded
    i18n.changeLanguage(loadedSettings.language);
  } catch (error) {
    sagaLogger.error('Error loading settings', error);
  } finally {
    yield put(setLoading(false));
  }
}

function* updateSettingsSaga(action: { type: string; payload: Partial<Settings> }) {
  try {
    const userId: string | undefined = yield call(getFileUserId);
    const updated: Settings | null = yield call(updateSettingsService, action.payload, userId);
    if (updated) {
      yield put(setSettings(updated));
      yield put(setUpdateResult(true));
      // Update i18n language when language setting changes
      if (action.payload.language) {
        i18n.changeLanguage(action.payload.language);
      }
    } else {
      yield put(setUpdateResult(false));
      sagaLogger.error('Failed to update settings: updateSettingsService returned null');
    }
  } catch (error) {
    sagaLogger.error('Error updating settings', error);
    yield put(setUpdateResult(false));
  }
}

// Watcher
export function* settingsSaga() {
  yield takeLatest(LOAD_SETTINGS, loadSettingsSaga);
  yield takeLatest(UPDATE_SETTINGS, updateSettingsSaga);
}

