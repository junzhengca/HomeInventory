import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import settingsReducer from './slices/settingsSlice';
import todoReducer from './slices/todoSlice';
import inventoryReducer from './slices/inventorySlice';
import uiReducer from './slices/uiSlice';
import syncReducer from './slices/syncSlice';
import refreshReducer from './slices/refreshSlice';

// Combine all reducers
export const rootReducer = combineReducers({
  auth: authReducer,
  settings: settingsReducer,
  todo: todoReducer,
  inventory: inventoryReducer,
  ui: uiReducer,
  sync: syncReducer,
  refresh: refreshReducer,
});

