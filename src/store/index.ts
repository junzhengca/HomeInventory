import { configureStore } from '@reduxjs/toolkit';
import { enableMapSet } from 'immer';
import createSagaMiddleware from 'redux-saga';
import { rootReducer } from './reducers';
import rootSaga from './sagas';

// Enable Immer support for Map and Set
enableMapSet();

// Create saga middleware
const sagaMiddleware = createSagaMiddleware();

// Configure store
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      thunk: false, // Disable thunk since we're using saga
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'auth/setApiClient',
          'refresh/registerCategoryCallback',
          'refresh/unregisterCategoryCallback',
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload'],
        // Ignore these paths in the state (non-serializable values like class instances and Sets)
        ignoredPaths: [
          'auth.apiClient',
          'refresh.categoryCallbacks',
          'inventory.updatingItemIds',
        ],
      },
    }).concat(sagaMiddleware),
});

// Run saga
sagaMiddleware.run(rootSaga);

// Export RootState from types (re-export for convenience)
export type { RootState } from './types';

// Infer the `AppDispatch` type from the store itself
export type AppDispatch = typeof store.dispatch;

