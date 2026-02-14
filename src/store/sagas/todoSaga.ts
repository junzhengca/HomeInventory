import { call, put, select, takeLatest, delay, spawn } from 'redux-saga/effects';
import {
  setTodos,
  silentSetTodos,
  addTodo as addTodoSlice,
  updateTodo as updateTodoSlice,
  removeTodo as removeTodoSlice,
  setLoading,
  setTodoCategories,
  silentSetTodoCategories,
  addTodoCategory as addTodoCategorySlice,
  updateTodoCategory as updateTodoCategorySlice,
  removeTodoCategory as removeTodoCategorySlice,
  upsertTodos,
  addTodos,
  removeTodos,
  upsertTodoCategories,
  addTodoCategories,
  removeTodoCategories,
} from '../slices/todoSlice';
import { todoService } from '../../services/TodoService';
import { todoCategoryService } from '../../services/TodoCategoryService';
import { TodoItem, TodoCategory } from '../../types/inventory';
import { SyncDelta } from '../../types/sync';
import type { RootState } from '../types';
import { homeService } from '../../services/HomeService';
import { ApiClient } from '../../services/ApiClient';
import { getDeviceId } from '../../utils/deviceUtils';
import { sagaLogger } from '../../utils/Logger';

// Action types
const LOAD_TODOS = 'todo/LOAD_TODOS';
const SILENT_REFRESH_TODOS = 'todo/SILENT_REFRESH_TODOS';
const ADD_TODO = 'todo/ADD_TODO';
const TOGGLE_TODO = 'todo/TOGGLE_TODO';
const DELETE_TODO = 'todo/DELETE_TODO';
const UPDATE_TODO = 'todo/UPDATE_TODO';
const SYNC_TODOS = 'todo/SYNC_TODOS'; // New action
const LOAD_TODO_CATEGORIES = 'todo/LOAD_TODO_CATEGORIES';
const SILENT_REFRESH_TODO_CATEGORIES = 'todo/SILENT_REFRESH_TODO_CATEGORIES';
const ADD_TODO_CATEGORY = 'todo/ADD_TODO_CATEGORY';
const UPDATE_TODO_CATEGORY = 'todo/UPDATE_TODO_CATEGORY';
const DELETE_TODO_CATEGORY = 'todo/DELETE_TODO_CATEGORY';

// Action creators
export const loadTodos = () => ({ type: LOAD_TODOS });
export const silentRefreshTodos = () => ({ type: SILENT_REFRESH_TODOS });
export const addTodo = (text: string, note?: string, categoryId?: string) => ({ type: ADD_TODO, payload: { text, note, categoryId } });
export const toggleTodo = (id: string) => ({ type: TOGGLE_TODO, payload: id });
export const deleteTodoAction = (id: string) => ({ type: DELETE_TODO, payload: id });
export const updateTodoText = (id: string, text: string, note?: string) => ({
  type: UPDATE_TODO,
  payload: { id, text, note },
});
export const syncTodosAction = () => ({ type: SYNC_TODOS });
export const loadTodoCategoriesAction = () => ({ type: LOAD_TODO_CATEGORIES });
export const silentRefreshTodoCategoriesAction = () => ({ type: SILENT_REFRESH_TODO_CATEGORIES });
export const addTodoCategoryAction = (name: string, homeId: string) => ({ type: ADD_TODO_CATEGORY, payload: { name, homeId } });
export const updateTodoCategoryAction = (id: string, name: string) => ({ type: UPDATE_TODO_CATEGORY, payload: { id, name } });
export const deleteTodoCategoryAction = (id: string) => ({ type: DELETE_TODO_CATEGORY, payload: id });

function* getFileHomeId() {
  const state: RootState = yield select();
  const { activeHomeId } = state.auth;

  if (!activeHomeId) {
    sagaLogger.error('No active home - cannot load todos');
    yield put(setTodos([])); // Clear todos
    return; // Stop execution
  }

  return activeHomeId;
}

function* loadTodosSaga() {
  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      yield put(setLoading(false));
      return; // No home = no todos
    }

    yield put(setLoading(true));
    const allTodos: TodoItem[] = yield call([todoService, 'getAllTodos'], homeId);
    // Sort by createdAt in descending order (newest first)
    allTodos.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    yield put(setTodos(allTodos));

    // Trigger sync on load? Maybe strictly stick to periodic + triggers
    // But loading often implies "I just opened this screen", so a pull is good.
    // However, authSaga already triggers home sync.
  } catch (error) {
    sagaLogger.error('Error loading todos', error);
  } finally {
    yield put(setLoading(false));
  }
}

function* silentRefreshTodosSaga() {
  try {
    // Silent refresh - no loading state changes
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      return; // No home = no todos
    }

    const allTodos: TodoItem[] = yield call([todoService, 'getAllTodos'], homeId);
    // Sort by createdAt in descending order (newest first)
    allTodos.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    // Use silentSetTodos to update without touching loading state
    yield put(silentSetTodos(allTodos));
  } catch (error) {
    sagaLogger.error('Error silently refreshing todos', error);
    // Don't throw - silent refresh should fail silently
  }
}

function* syncTodosSaga() {
  sagaLogger.verbose('▶️ syncTodosSaga - ENTRY');
  try {
    const state: RootState = yield select();
    const { activeHomeId, apiClient, isAuthenticated } = state.auth;

    if (!activeHomeId || !apiClient || !isAuthenticated) {
      sagaLogger.verbose('⛔ syncTodosSaga - EARLY EXIT: No activeHomeId/apiClient/auth');
      return;
    }

    sagaLogger.info('▶️ Starting scheduled/triggered sync sequence');

    // 1. Sync Homes first (Important rule)
    sagaLogger.debug('📍 Step 1/4: Syncing homes');
    yield call([homeService, homeService.syncHomes], apiClient);
    sagaLogger.verbose('✅ Step 1/4: Homes synced');

    // 2. Sync Todo Categories
    sagaLogger.debug('📍 Step 2/4: Syncing todo categories');
    const deviceId: string = yield call(getDeviceId);
    sagaLogger.verbose(`📱 Device ID: ${deviceId}`);

    const categoriesDelta: SyncDelta<TodoCategory> = yield call(
      [todoCategoryService, 'syncCategories'],
      activeHomeId,
      apiClient as ApiClient,
      deviceId
    );
    sagaLogger.verbose(`📊 Categories Delta: created=${categoriesDelta.created.length}, updated=${categoriesDelta.updated.length}, deleted=${categoriesDelta.deleted.length}, unchanged=${categoriesDelta.unchanged}`);

    if (!categoriesDelta.unchanged) {
      // Process 'created' before 'updated' to ensure new entities are added before updates
      if (categoriesDelta.created.length > 0) {
        sagaLogger.verbose(`➕ Adding ${categoriesDelta.created.length} new categories`);
        yield put(addTodoCategories(categoriesDelta.created));
      }
      if (categoriesDelta.updated.length > 0) {
        sagaLogger.verbose(`🔄 Updating ${categoriesDelta.updated.length} categories`);
        yield put(upsertTodoCategories(categoriesDelta.updated));
      }
      if (categoriesDelta.deleted.length > 0) {
        sagaLogger.verbose(`➖ Removing ${categoriesDelta.deleted.length} categories`);
        yield put(removeTodoCategories(categoriesDelta.deleted));
      }
    } else {
      sagaLogger.verbose('⏭ Categories unchanged');
    }

    // 3. Sync Todos
    sagaLogger.debug('📍 Step 3/4: Syncing todos');
    const todosDelta: SyncDelta<TodoItem> = yield call(
      [todoService, 'syncTodos'],
      activeHomeId,
      apiClient as ApiClient,
      deviceId
    );
    sagaLogger.verbose(`📊 Todos Delta: created=${todosDelta.created.length}, updated=${todosDelta.updated.length}, deleted=${todosDelta.deleted.length}, unchanged=${todosDelta.unchanged}`);

    if (!todosDelta.unchanged) {
      // Process 'created' before 'updated' to ensure new entities are added before updates
      if (todosDelta.created.length > 0) {
        sagaLogger.verbose(`➕ Adding ${todosDelta.created.length} new todos`);
        sagaLogger.verbose(`📋 Created todo IDs: ${todosDelta.created.map(t => t.id).join(', ')}`);
        yield put(addTodos(todosDelta.created));
      }
      if (todosDelta.updated.length > 0) {
        sagaLogger.verbose(`🔄 Updating ${todosDelta.updated.length} todos`);
        sagaLogger.verbose(`📋 Updated todo IDs: ${todosDelta.updated.map(t => t.id).join(', ')}`);
        todosDelta.updated.forEach(t => {
          sagaLogger.verbose(`  → Todo ${t.id}: text="${t.text}", completed=${t.completed}, pendingCreate=${t.pendingCreate}, pendingUpdate=${t.pendingUpdate}`);
        });
        yield put(upsertTodos(todosDelta.updated));
      }
      if (todosDelta.deleted.length > 0) {
        sagaLogger.verbose(`➖ Removing ${todosDelta.deleted.length} todos`);
        sagaLogger.verbose(`📋 Deleted todo IDs: ${todosDelta.deleted.join(', ')}`);
        yield put(removeTodos(todosDelta.deleted));
      }
    } else {
      sagaLogger.verbose('⏭ Todos unchanged');
    }

    // 4. Silent refresh from storage to ensure Redux state matches persisted data
    sagaLogger.debug('📍 Step 4/4: Silent refresh from storage');
    const allTodos: TodoItem[] = yield call([todoService, 'getAllTodos'], activeHomeId);
    sagaLogger.verbose(`📋 Total todos in storage after sync: ${allTodos.length}`);
    allTodos.forEach(t => {
      sagaLogger.verbose(`  → Todo ${t.id}: text="${t.text}", completed=${t.completed}, pendingCreate=${t.pendingCreate}`);
    });
    allTodos.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    yield put(silentSetTodos(allTodos));
    sagaLogger.verbose('✅ Redux state refreshed from storage');

    // Also refresh categories
    const allCategories: TodoCategory[] = yield call([todoCategoryService, 'getAllCategories'], activeHomeId);
    yield put(silentSetTodoCategories(allCategories));

    sagaLogger.info('✅ Sync complete');
  } catch (error) {
    sagaLogger.error('❌ Error in sync sequence', error);
  }
}

function* addTodoSaga(action: { type: string; payload: { text: string; note?: string; categoryId?: string } }) {
  const { text, note, categoryId } = action.payload;
  if (!text.trim()) return;

  sagaLogger.verbose(`▶️ addTodoSaga - Creating todo: "${text}"`);

  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      sagaLogger.error('Cannot create todo: No active home selected');
      return;
    }
    // homeId comes from getFileHomeId which returns activeHomeId
    const createInput = {
      text,
      note,
      categoryId,
    };
    sagaLogger.verbose(`📝 Calling todoService.createTodo with input: ${JSON.stringify(createInput)}`);
    const newTodo: TodoItem = yield call([todoService, 'createTodo'], createInput, homeId);
    if (newTodo) {
      sagaLogger.verbose(`✅ Todo created: id=${newTodo.id}, text="${newTodo.text}", pendingCreate=${newTodo.pendingCreate}`);
      // Optimistically add to state
      yield put(addTodoSlice(newTodo));
      sagaLogger.verbose(`➕ Todo added to Redux state via addTodoSlice`);

      // Refresh to ensure sync (but don't set loading)
      sagaLogger.verbose(`🔄 Refreshing from storage...`);
      const allTodos: TodoItem[] = yield call([todoService, 'getAllTodos'], homeId);
      sagaLogger.verbose(`📋 Total todos in storage: ${allTodos.length}`);
      allTodos.forEach(t => {
        sagaLogger.verbose(`  → Todo ${t.id}: text="${t.text}", completed=${t.completed}, pendingCreate=${t.pendingCreate}`);
      });
      allTodos.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      yield put(setTodos(allTodos));
      sagaLogger.verbose(`✅ Redux state replaced via setTodos with ${allTodos.length} todos`);

      // Trigger sync
      sagaLogger.verbose(`🔄 Triggering sync...`);
      yield put(syncTodosAction());
    } else {
      sagaLogger.error('❌ Failed to create todo: newTodo is null/undefined');
    }
  } catch (error) {
    sagaLogger.error('❌ Error adding todo', error);
    // Revert on error by refreshing
    yield loadTodosSaga();
  }
}

function* toggleTodoSaga(action: { type: string; payload: string }) {
  const id = action.payload;

  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      sagaLogger.error('Cannot toggle todo: No active home selected');
      return;
    }

    // Optimistically update to state
    const currentTodos: TodoItem[] = yield select((state: RootState) => state.todo.todos);
    const todoToUpdate = currentTodos.find((todo) => todo.id === id);
    if (todoToUpdate) {
      const updatedTodo = { ...todoToUpdate, completed: !todoToUpdate.completed };
      yield put(updateTodoSlice(updatedTodo));
    }

    // Then update in storage
    yield call([todoService, 'toggleTodo'], id, homeId);

    // Refresh to ensure sync (but don't set loading)
    const allTodos: TodoItem[] = yield call([todoService, 'getAllTodos'], homeId);
    allTodos.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    yield put(setTodos(allTodos));

    // Trigger sync
    yield put(syncTodosAction());
  } catch (error) {
    sagaLogger.error('Error toggling todo', error);
    // Revert on error by refreshing
    yield loadTodosSaga();
  }
}

function* deleteTodoSaga(action: { type: string; payload: string }) {
  const id = action.payload;

  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      sagaLogger.error('Cannot delete todo: No active home selected');
      return;
    }

    // Optimistically remove from state
    yield put(removeTodoSlice(id));

    // Then delete from storage
    yield call([todoService, 'deleteTodo'], id, homeId);

    // Refresh to ensure sync (but don't set loading)
    const allTodos: TodoItem[] = yield call([todoService, 'getAllTodos'], homeId);
    allTodos.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    yield put(setTodos(allTodos));

    // Trigger sync
    yield put(syncTodosAction());
  } catch (error) {
    sagaLogger.error('Error deleting todo', error);
    // Revert on error by refreshing
    yield loadTodosSaga();
  }
}

function* updateTodoSaga(action: { type: string; payload: { id: string; text: string; note?: string } }) {
  const { id, text, note } = action.payload;

  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      sagaLogger.error('Cannot update todo: No active home selected');
      return;
    }

    // Optimistically update to state
    const currentTodos: TodoItem[] = yield select((state: RootState) => state.todo.todos);
    const todoToUpdate = currentTodos.find((todo) => todo.id === id);
    if (todoToUpdate) {
      const updatedTodo = { ...todoToUpdate, text, note: note !== undefined ? note : todoToUpdate.note };
      yield put(updateTodoSlice(updatedTodo));
    }

    // Then update in storage
    yield call([todoService, 'updateTodo'], id, { text, note }, homeId);

    // Refresh to ensure sync (but don't set loading)
    const allTodos: TodoItem[] = yield call([todoService, 'getAllTodos'], homeId);
    allTodos.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    yield put(setTodos(allTodos));

    // Trigger sync
    yield put(syncTodosAction());
  } catch (error) {
    sagaLogger.error('Error updating todo', error);
    // Revert on error by refreshing
    yield loadTodosSaga();
  }
}

function* loadTodoCategoriesSaga() {
  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      sagaLogger.error('Cannot load todo categories: No active home selected');
      return;
    }
    const allCategories: TodoCategory[] = yield call([todoCategoryService, 'getAllCategories'], homeId);
    yield put(setTodoCategories(allCategories));
  } catch (error) {
    sagaLogger.error('Error loading todo categories', error);
  }
}

function* silentRefreshTodoCategoriesSaga() {
  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      return;
    }
    const allCategories: TodoCategory[] = yield call([todoCategoryService, 'getAllCategories'], homeId);
    yield put(silentSetTodoCategories(allCategories));
  } catch (error) {
    sagaLogger.error('Error silently refreshing todo categories', error);
  }
}

function* addTodoCategorySaga(action: { type: string; payload: { name: string; homeId: string } }) {
  const { name } = action.payload;
  if (!name.trim()) return;

  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      sagaLogger.error('Cannot create todo category: No active home selected');
      return;
    }
    const newCategory: TodoCategory = yield call([todoCategoryService, 'createCategory'], { name }, homeId);
    if (newCategory) {
      yield put(addTodoCategorySlice(newCategory));

      // Refresh to ensure sync
      const allCategories: TodoCategory[] = yield call([todoCategoryService, 'getAllCategories'], homeId);
      yield put(setTodoCategories(allCategories));

      // Trigger sync
      yield put(syncTodosAction());
    }
  } catch (error) {
    sagaLogger.error('Error adding todo category', error);
    yield loadTodoCategoriesSaga();
  }
}

function* updateTodoCategorySaga(action: { type: string; payload: { id: string; name: string } }) {
  const { id, name } = action.payload;

  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) return;

    // Optimistically update to state
    const currentCategories: TodoCategory[] = yield select((state: RootState) => state.todo.categories);
    const categoryToUpdate = currentCategories.find((cat) => cat.id === id);
    if (categoryToUpdate) {
      const updatedCategory = { ...categoryToUpdate, name };
      yield put(updateTodoCategorySlice(updatedCategory));
    }

    // Then update in storage
    yield call([todoCategoryService, 'updateCategory'], id, { name }, homeId as string);

    // Refresh to ensure sync
    const allCategories: TodoCategory[] = yield call([todoCategoryService, 'getAllCategories'], homeId);
    yield put(setTodoCategories(allCategories));

    // Trigger sync
    yield put(syncTodosAction());
  } catch (error) {
    sagaLogger.error('Error updating todo category', error);
    yield loadTodoCategoriesSaga();
  }
}

function* deleteTodoCategorySaga(action: { type: string; payload: string }) {
  const id = action.payload;

  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) return;

    // Optimistically remove from state
    yield put(removeTodoCategorySlice(id));

    // Then delete from storage
    yield call([todoCategoryService, 'deleteCategory'], id, homeId as string);

    // Refresh to ensure sync
    const allCategories: TodoCategory[] = yield call([todoCategoryService, 'getAllCategories'], homeId);
    yield put(setTodoCategories(allCategories));

    // Trigger sync
    yield put(syncTodosAction());
  } catch (error) {
    sagaLogger.error('Error deleting todo category', error);
    yield loadTodoCategoriesSaga();
  }
}

function* periodicSyncSaga() {
  while (true) {
    // Wait 5 minutes
    yield delay(5 * 60 * 1000);
    const state: RootState = yield select();
    if (state.auth.isAuthenticated) {
      sagaLogger.info('Triggering periodic sync');
      yield put(syncTodosAction());
    }
  }
}

// Watcher
export function* todoSaga() {
  yield takeLatest(LOAD_TODOS, loadTodosSaga);
  yield takeLatest(SILENT_REFRESH_TODOS, silentRefreshTodosSaga);
  yield takeLatest(ADD_TODO, addTodoSaga);
  yield takeLatest(TOGGLE_TODO, toggleTodoSaga);
  yield takeLatest(DELETE_TODO, deleteTodoSaga);
  yield takeLatest(UPDATE_TODO, updateTodoSaga);
  yield takeLatest(SYNC_TODOS, syncTodosSaga); // Listen for explicit sync requests

  // Todo categories
  yield takeLatest(LOAD_TODO_CATEGORIES, loadTodoCategoriesSaga);
  yield takeLatest(SILENT_REFRESH_TODO_CATEGORIES, silentRefreshTodoCategoriesSaga);
  yield takeLatest(ADD_TODO_CATEGORY, addTodoCategorySaga);
  yield takeLatest(UPDATE_TODO_CATEGORY, updateTodoCategorySaga);
  yield takeLatest(DELETE_TODO_CATEGORY, deleteTodoCategorySaga);

  // Start periodic sync
  yield spawn(periodicSyncSaga);
}
