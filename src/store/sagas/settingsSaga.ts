import { call, put, takeLatest } from 'redux-saga/effects';
import { setSettings, setLoading } from '../slices/settingsSlice';
import { getSettings, updateSettings as updateSettingsService } from '../../services/SettingsService';
import { Settings } from '../../types/settings';
import i18n from '../../i18n/i18n';

// Action types
const LOAD_SETTINGS = 'settings/LOAD_SETTINGS';
const UPDATE_SETTINGS = 'settings/UPDATE_SETTINGS';

// Action creators
export const loadSettings = () => ({ type: LOAD_SETTINGS });
export const updateSettings = (updates: Partial<Settings>) => ({
  type: UPDATE_SETTINGS,
  payload: updates,
});

function* loadSettingsSaga() {
  try {
    const loadedSettings: Settings = yield call(getSettings);
    yield put(setSettings(loadedSettings));
    // Update i18n language when settings are loaded
    i18n.changeLanguage(loadedSettings.language);
  } catch (error) {
    console.error('[SettingsSaga] Error loading settings:', error);
  } finally {
    yield put(setLoading(false));
  }
}

function* updateSettingsSaga(action: { type: string; payload: Partial<Settings> }) {
  try {
    const updated: Settings | false = yield call(updateSettingsService, action.payload);
    if (updated) {
      yield put(setSettings(updated));
      // Update i18n language when language setting changes
      if (action.payload.language) {
        i18n.changeLanguage(action.payload.language);
      }
    }
  } catch (error) {
    console.error('[SettingsSaga] Error updating settings:', error);
  }
}

// Watcher
export function* settingsSaga() {
  yield takeLatest(LOAD_SETTINGS, loadSettingsSaga);
  yield takeLatest(UPDATE_SETTINGS, updateSettingsSaga);
}

