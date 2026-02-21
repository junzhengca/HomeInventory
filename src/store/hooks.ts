import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';
import {
  selectPendingTodos,
  selectCompletedTodos,
  selectLoading,
  selectAddingTodo,
  selectUpdatingTodoIds,
  selectError,
} from './slices/todoSlice';
import { clearUpdateResult } from './slices/settingsSlice';
import { User } from '../types/api';
import { Settings } from '../types/settings';
import { InventoryItem } from '../types/inventory';
import { reduxLogger } from '../utils/Logger';

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
  const error = useAppSelector((state) => state.auth.error);
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

  const googleLogin = useCallback(
    (idToken: string, platform: 'ios' | 'android') => {
      dispatch({ type: 'auth/GOOGLE_LOGIN', payload: { idToken, platform } });
    },
    [dispatch]
  );

  const appleLogin = useCallback(
    (idToken: string, platform: 'ios' | 'android') => {
      dispatch({ type: 'auth/APPLE_LOGIN', payload: { idToken, platform } });
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
    error,
    login,
    signup,
    googleLogin,
    appleLogin,
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
  const lastUpdateSuccess = useAppSelector(
    (state) => state.settings.lastUpdateSuccess
  );
  const pendingResolversRef = useRef<((value: boolean) => void)[]>([]);

  // Resolve pending promises when update result changes
  useEffect(() => {
    if (lastUpdateSuccess !== null && pendingResolversRef.current.length > 0) {
      const resolvers = [...pendingResolversRef.current];
      pendingResolversRef.current = [];
      resolvers.forEach((resolve) => resolve(lastUpdateSuccess));
      // Clear the result after resolving
      dispatch(clearUpdateResult());
    }
  }, [lastUpdateSuccess, dispatch]);

  const updateSettings = useCallback(
    (updates: Partial<Settings>): Promise<boolean> => {
      return new Promise((resolve) => {
        // Clear previous result
        dispatch(clearUpdateResult());

        // Add resolver to pending list
        pendingResolversRef.current.push(resolve);

        // Dispatch update action
        dispatch({ type: 'settings/UPDATE_SETTINGS', payload: updates });

        // Timeout after 2 seconds if no result
        setTimeout(() => {
          const index = pendingResolversRef.current.indexOf(resolve);
          if (index !== -1) {
            pendingResolversRef.current.splice(index, 1);
            resolve(false);
          }
        }, 2000);
      });
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
  const categories = useAppSelector((state) => state.todo.categories);
  const loading = useAppSelector(selectLoading);
  const addingTodo = useAppSelector(selectAddingTodo);
  const updatingTodoIds = useAppSelector(selectUpdatingTodoIds);
  const error = useAppSelector(selectError);
  const pendingTodos = useAppSelector(selectPendingTodos);
  const completedTodos = useAppSelector(selectCompletedTodos);

  const refreshTodos = useCallback(() => {
    dispatch({ type: 'todo/LOAD_TODOS' });
  }, [dispatch]);

  const addTodo = useCallback(
    (text: string, note?: string, categoryId?: string) => {
      dispatch({ type: 'todo/ADD_TODO', payload: { text, note, categoryId } });
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
    (id: string, text: string, note?: string) => {
      dispatch({ type: 'todo/UPDATE_TODO', payload: { id, text, note } });
    },
    [dispatch]
  );

  return {
    todos,
    categories,
    pendingTodos,
    completedTodos,
    loading,
    addingTodo,
    updatingTodoIds,
    error,
    refreshTodos,
    addTodo,
    toggleTodoCompletion,
    removeTodo,
    updateTodo,
  };
};

// Todo Categories hook
export const useTodoCategories = () => {
  const dispatch = useAppDispatch();
  const activeHomeId = useAppSelector((state) => state.auth.activeHomeId);
  const allCategories = useAppSelector((state) => state.todo.categories);

  const categories = useMemo(() => {
    return allCategories.filter((c) => c.homeId === activeHomeId);
  }, [allCategories, activeHomeId]);

  const createCategory = useCallback(
    (name: string, homeId: string) => {
      dispatch({ type: 'todo/ADD_TODO_CATEGORY', payload: { name, homeId } });
    },
    [dispatch]
  );

  const updateCategory = useCallback(
    (id: string, name: string) => {
      dispatch({ type: 'todo/UPDATE_TODO_CATEGORY', payload: { id, name } });
    },
    [dispatch]
  );

  const deleteCategory = useCallback(
    (id: string) => {
      dispatch({ type: 'todo/DELETE_TODO_CATEGORY', payload: id });
    },
    [dispatch]
  );

  const refreshCategories = useCallback(() => {
    dispatch({ type: 'todo/SILENT_REFRESH_TODO_CATEGORIES' });
  }, [dispatch]);

  return {
    categories,
    createCategory,
    updateCategory,
    deleteCategory,
    refreshCategories,
  };
};

// SelectedCategory hook - replaces SelectedCategoryContext
export const useSelectedCategory = () => {
  const dispatch = useAppDispatch();
  const homeCategory = useAppSelector((state) => state.ui.homeCategory);

  const setHomeCategory = useCallback(
    (category: string) => {
      dispatch({ type: 'ui/setHomeCategory', payload: category });
    },
    [dispatch]
  );

  return {
    homeCategory,
    setHomeCategory,
  };
};

// Category hook - replaces CategoryContext
// Note: Categories are now managed via Redux state (useInventoryCategories hook)
// This hook is kept for backward compatibility
export const useCategory = () => {
  const dispatch = useAppDispatch();

  const refreshCategories = useCallback(() => {
    dispatch({ type: 'inventoryCategory/SILENT_LOAD_CATEGORIES' });
  }, [dispatch]);

  // Refresh callbacks are no longer needed since Redux state is reactive
  const registerRefreshCallback = useCallback(() => {
    // No-op: Redux state updates automatically trigger re-renders
    return () => {};
  }, []);

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
    (item: Omit<InventoryItem, 'id'>) => {
      dispatch({ type: 'inventory/CREATE_ITEM', payload: item });
    },
    [dispatch]
  );

  const updateItem = useCallback(
    (id: string, updates: Partial<Omit<InventoryItem, 'id'>>) => {
      reduxLogger.info(`updateItem called with id: ${id}`, updates);
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

// Inventory Categories hook
export const useInventoryCategories = () => {
  const dispatch = useAppDispatch();
  const activeHomeId = useAppSelector((state) => state.auth.activeHomeId);
  const allCategories = useAppSelector((state) => state.inventoryCategory.categories);
  const loading = useAppSelector((state) => state.inventoryCategory.loading);
  const error = useAppSelector((state) => state.inventoryCategory.error);

  const categories = useMemo(() => {
    return allCategories.filter((c) => c.homeId === activeHomeId);
  }, [allCategories, activeHomeId]);

  const refreshCategories = useCallback(() => {
    dispatch({ type: 'inventoryCategory/SILENT_LOAD_CATEGORIES' });
  }, [dispatch]);

  const createCategory = useCallback(
    (name: string, description?: string, color?: string, icon?: string) => {
      dispatch({ type: 'inventoryCategory/ADD_CATEGORY', payload: { name, description, color, icon } });
    },
    [dispatch]
  );

  const updateCategory = useCallback(
    (id: string, name: string, description?: string, color?: string, icon?: string) => {
      dispatch({ type: 'inventoryCategory/UPDATE_CATEGORY', payload: { id, name, description, color, icon } });
    },
    [dispatch]
  );

  const deleteCategory = useCallback(
    (id: string) => {
      dispatch({ type: 'inventoryCategory/DELETE_CATEGORY', payload: id });
    },
    [dispatch]
  );

  return {
    categories,
    loading,
    error,
    refreshCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};

// Locations hook - manages locations via CRUD API
export const useLocations = () => {
  const dispatch = useAppDispatch();
  const activeHomeId = useAppSelector((state) => state.auth.activeHomeId);
  const allLocations = useAppSelector((state) => state.location.locations);
  const loading = useAppSelector((state) => state.location.loading);
  const addingLocation = useAppSelector((state) => state.location.addingLocation);
  const updatingLocationIds = useAppSelector((state) => state.location.updatingLocationIds);
  const error = useAppSelector((state) => state.location.error);

  const locations = useMemo(() => {
    return allLocations.filter((l) => l.homeId === activeHomeId);
  }, [allLocations, activeHomeId]);

  const refreshLocations = useCallback(() => {
    dispatch({ type: 'location/LOAD_LOCATIONS' });
  }, [dispatch]);

  const createLocation = useCallback(
    (name: string, icon?: string) => {
      dispatch({ type: 'location/ADD_LOCATION', payload: { name, icon } });
    },
    [dispatch]
  );

  const updateLocation = useCallback(
    (id: string, name: string, icon?: string) => {
      dispatch({ type: 'location/UPDATE_LOCATION', payload: { id, name, icon } });
    },
    [dispatch]
  );

  const deleteLocation = useCallback(
    (id: string) => {
      dispatch({ type: 'location/DELETE_LOCATION', payload: id });
    },
    [dispatch]
  );

  return {
    locations,
    loading,
    addingLocation,
    updatingLocationIds,
    error,
    refreshLocations,
    createLocation,
    updateLocation,
    deleteLocation,
  };
};
