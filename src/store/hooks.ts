import { useCallback } from 'react';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';
import { selectPendingTodos, selectCompletedTodos } from './slices/todoSlice';
import { User } from '../types/api';
import { Settings } from '../types/settings';

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Domain-specific hooks that replace context hooks

// Auth hook - replaces AuthContext
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const apiClient = useAppSelector((state) => state.auth.apiClient);

  const login = useCallback(
    (email: string, password: string) => {
      dispatch({ type: 'auth/LOGIN', payload: { email, password } });
    },
    [dispatch]
  );

  const signup = useCallback(
    (email: string, password: string) => {
      dispatch({ type: 'auth/SIGNUP', payload: { email, password } });
    },
    [dispatch]
  );

  const logout = useCallback(() => {
    dispatch({ type: 'auth/LOGOUT' });
  }, [dispatch]);

  const checkAuth = useCallback(() => {
    dispatch({ type: 'auth/CHECK_AUTH' });
  }, [dispatch]);

  const updateUser = useCallback(
    (userData: User) => {
      dispatch({ type: 'auth/UPDATE_USER', payload: userData });
    },
    [dispatch]
  );

  const getApiClient = useCallback(() => {
    return apiClient;
  }, [apiClient]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    checkAuth,
    updateUser,
    getApiClient,
  };
};

// Settings hook - replaces SettingsContext
export const useSettings = () => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings.settings);
  const isLoading = useAppSelector((state) => state.settings.isLoading);

  const updateSettings = useCallback(
    (updates: Partial<Settings>) => {
      dispatch({ type: 'settings/UPDATE_SETTINGS', payload: updates });
    },
    [dispatch]
  );

  return {
    settings,
    updateSettings,
    isLoading,
  };
};

// Todos hook - replaces TodoContext
export const useTodos = () => {
  const dispatch = useAppDispatch();
  const todos = useAppSelector((state) => state.todo.todos);
  const loading = useAppSelector((state) => state.todo.loading);
  const pendingTodos = useAppSelector(selectPendingTodos);
  const completedTodos = useAppSelector(selectCompletedTodos);

  const refreshTodos = useCallback(() => {
    dispatch({ type: 'todo/LOAD_TODOS' });
  }, [dispatch]);

  const addTodo = useCallback(
    (text: string) => {
      dispatch({ type: 'todo/ADD_TODO', payload: text });
    },
    [dispatch]
  );

  const toggleTodoCompletion = useCallback(
    (id: string) => {
      dispatch({ type: 'todo/TOGGLE_TODO', payload: id });
    },
    [dispatch]
  );

  const removeTodo = useCallback(
    (id: string) => {
      dispatch({ type: 'todo/DELETE_TODO', payload: id });
    },
    [dispatch]
  );

  const updateTodo = useCallback(
    (id: string, text: string) => {
      dispatch({ type: 'todo/UPDATE_TODO', payload: { id, text } });
    },
    [dispatch]
  );

  return {
    todos,
    pendingTodos,
    completedTodos,
    loading,
    refreshTodos,
    addTodo,
    toggleTodoCompletion,
    removeTodo,
    updateTodo,
  };
};

// SelectedCategory hook - replaces SelectedCategoryContext
export const useSelectedCategory = () => {
  const dispatch = useAppDispatch();
  const homeCategory = useAppSelector((state) => state.ui.homeCategory);
  const inventoryCategory = useAppSelector((state) => state.ui.inventoryCategory);

  const setHomeCategory = useCallback(
    (category: string) => {
      dispatch({ type: 'ui/setHomeCategory', payload: category });
    },
    [dispatch]
  );

  const setInventoryCategory = useCallback(
    (category: string) => {
      dispatch({ type: 'ui/setInventoryCategory', payload: category });
    },
    [dispatch]
  );

  return {
    homeCategory,
    inventoryCategory,
    setHomeCategory,
    setInventoryCategory,
  };
};

// Sync hook - replaces SyncContext
export const useSync = () => {
  const dispatch = useAppDispatch();
  const syncService = useAppSelector((state) => state.sync.syncService);
  const enabled = useAppSelector((state) => state.sync.enabled);
  const loading = useAppSelector((state) => state.sync.loading);
  const syncStatus = useAppSelector((state) => state.sync.syncStatus);
  const lastSyncTime = useAppSelector((state) => state.sync.lastSyncTime);
  const error = useAppSelector((state) => state.sync.error);

  const enableSync = useCallback(() => {
    dispatch({ type: 'sync/ENABLE_SYNC' });
  }, [dispatch]);

  const disableSync = useCallback(() => {
    dispatch({ type: 'sync/DISABLE_SYNC' });
  }, [dispatch]);

  const syncAll = useCallback(() => {
    dispatch({ type: 'sync/SYNC_ALL' });
  }, [dispatch]);

  const syncFile = useCallback(
    (fileType: 'categories' | 'locations' | 'inventoryItems' | 'todoItems' | 'settings') => {
      dispatch({ type: 'sync/SYNC_FILE', payload: fileType });
    },
    [dispatch]
  );

  return {
    syncService,
    enabled,
    loading,
    syncStatus,
    lastSyncTime,
    error,
    enableSync,
    disableSync,
    syncAll,
    syncFile,
  };
};

// Category hook - replaces CategoryContext
export const useCategory = () => {
  const dispatch = useAppDispatch();

  const refreshCategories = useCallback(() => {
    dispatch({ type: 'refresh/triggerCategoryRefresh' });
  }, [dispatch]);

  const registerRefreshCallback = useCallback(
    (_callback: () => void) => {
      const callbackId = Math.random().toString(36).substring(7);
      dispatch({ type: 'refresh/registerCategoryCallback', payload: callbackId });

      return () => {
        dispatch({ type: 'refresh/unregisterCategoryCallback', payload: callbackId });
      };
    },
    [dispatch]
  );

  return {
    refreshCategories,
    registerRefreshCallback,
  };
};

// Inventory hook - replaces InventoryContext
export const useInventory = () => {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.inventory.items);
  const loading = useAppSelector((state) => state.inventory.loading);

  const loadItems = useCallback(() => {
    dispatch({ type: 'inventory/LOAD_ITEMS' });
  }, [dispatch]);

  const createItem = useCallback(
    (item: Omit<import('../types/inventory').InventoryItem, 'id'>) => {
      dispatch({ type: 'inventory/CREATE_ITEM', payload: item });
    },
    [dispatch]
  );

  const updateItem = useCallback(
    (id: string, updates: Partial<Omit<import('../types/inventory').InventoryItem, 'id'>>) => {
      dispatch({ type: 'inventory/UPDATE_ITEM', payload: { id, updates } });
    },
    [dispatch]
  );

  const deleteItem = useCallback(
    (id: string) => {
      dispatch({ type: 'inventory/DELETE_ITEM', payload: id });
    },
    [dispatch]
  );

  return {
    items,
    loading,
    loadItems,
    createItem,
    updateItem,
    deleteItem,
  };
};
