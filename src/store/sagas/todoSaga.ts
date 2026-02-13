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
} from '../slices/todoSlice';
import {
  getAllTodos,
  createTodo,
  toggleTodo as toggleTodoService,
  deleteTodo,
  updateTodo,
  syncTodos,
} from '../../services/TodoService';
import {
  getAllCategories as getAllTodoCategories,
  createCategory as createTodoCategoryService,
  updateCategory as updateTodoCategoryService,
  deleteCategory as deleteTodoCategoryService,
  syncCategories as syncTodoCategories,
} from '../../services/TodoCategoryService';
import { TodoItem, TodoCategory } from '../../types/inventory';
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

function* getFileUserId() {
  const state: RootState = yield select();
  const { activeHomeId } = state.auth;
  // If we have an active home ID, use it as the "userId" for file scoping
  // This effectively scopes todos to the home
  return activeHomeId || undefined;
}

function* loadTodosSaga() {
  try {
    yield put(setLoading(true));
    const userId: string | undefined = yield call(getFileUserId);
    const allTodos: TodoItem[] = yield call(getAllTodos, userId);
    // Sort by createdAt in descending order (newest first)
    allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    const userId: string | undefined = yield call(getFileUserId);
    const allTodos: TodoItem[] = yield call(getAllTodos, userId);
    // Sort by createdAt in descending order (newest first)
    allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    // Use silentSetTodos to update without touching loading state
    yield put(silentSetTodos(allTodos));
  } catch (error) {
    sagaLogger.error('Error silently refreshing todos', error);
    // Don't throw - silent refresh should fail silently
  }
}

function* syncTodosSaga() {
  try {
    const state: RootState = yield select();
    const { activeHomeId, apiClient, isAuthenticated } = state.auth;

    if (!activeHomeId || !apiClient || !isAuthenticated) return;

    sagaLogger.info('Starting scheduled/triggered sync sequence');

    // 1. Sync Homes first (Important rule)
    yield call([homeService, homeService.syncHomes], apiClient);

    // 2. Sync Todo Categories
    const deviceId: string = yield call(getDeviceId);
    yield call(syncTodoCategories, activeHomeId, apiClient as ApiClient, deviceId);

    // 3. Sync Todos
    yield call(syncTodos, activeHomeId, apiClient as ApiClient, deviceId);

    // 4. Refresh UI
    yield call(silentRefreshTodosSaga);
    yield call(silentRefreshTodoCategoriesSaga);

  } catch (error) {
    sagaLogger.error('Error in sync sequence', error);
  }
}

function* addTodoSaga(action: { type: string; payload: { text: string; note?: string; categoryId?: string } }) {
  const { text, note, categoryId } = action.payload;
  if (!text.trim()) return;

  try {
    const userId: string | undefined = yield call(getFileUserId);
    if (!userId) {
      sagaLogger.error('Cannot create todo: No active home selected');
      return;
    }
    // userId here IS the homeId because getFileUserId returns activeHomeId
    const newTodo: TodoItem = yield call(createTodo, text, userId, note, categoryId);
    if (newTodo) {
      // Optimistically add to state
      yield put(addTodoSlice(newTodo));

      // Refresh to ensure sync (but don't set loading)
      const allTodos: TodoItem[] = yield call(getAllTodos, userId);
      allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      yield put(setTodos(allTodos));

      // Trigger sync
      yield put(syncTodosAction());
    }
  } catch (error) {
    sagaLogger.error('Error adding todo', error);
    // Revert on error by refreshing
    yield loadTodosSaga();
  }
}

function* toggleTodoSaga(action: { type: string; payload: string }) {
  const id = action.payload;

  try {
    const userId: string | undefined = yield call(getFileUserId);

    // Optimistically update to state
    const currentTodos: TodoItem[] = yield select((state: RootState) => state.todo.todos);
    const todoToUpdate = currentTodos.find((todo) => todo.id === id);
    if (todoToUpdate) {
      const updatedTodo = { ...todoToUpdate, completed: !todoToUpdate.completed };
      yield put(updateTodoSlice(updatedTodo));
    }

    // Then update in storage
    yield call(toggleTodoService, id, userId);

    // Refresh to ensure sync (but don't set loading)
    const allTodos: TodoItem[] = yield call(getAllTodos, userId);
    allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    const userId: string | undefined = yield call(getFileUserId);

    // Optimistically remove from state
    yield put(removeTodoSlice(id));

    // Then delete from storage
    yield call(deleteTodo, id, userId);

    // Refresh to ensure sync (but don't set loading)
    const allTodos: TodoItem[] = yield call(getAllTodos, userId);
    allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    const userId: string | undefined = yield call(getFileUserId);

    // Optimistically update to state
    const currentTodos: TodoItem[] = yield select((state: RootState) => state.todo.todos);
    const todoToUpdate = currentTodos.find((todo) => todo.id === id);
    if (todoToUpdate) {
      const updatedTodo = { ...todoToUpdate, text, note: note !== undefined ? note : todoToUpdate.note };
      yield put(updateTodoSlice(updatedTodo));
    }

    // Then update in storage
    yield call(updateTodo, id, { text, note }, userId);

    // Refresh to ensure sync (but don't set loading)
    const allTodos: TodoItem[] = yield call(getAllTodos, userId);
    allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    const userId: string | undefined = yield call(getFileUserId);
    const allCategories: TodoCategory[] = yield call(getAllTodoCategories, userId);
    yield put(setTodoCategories(allCategories));
  } catch (error) {
    sagaLogger.error('Error loading todo categories', error);
  }
}

function* silentRefreshTodoCategoriesSaga() {
  try {
    const userId: string | undefined = yield call(getFileUserId);
    const allCategories: TodoCategory[] = yield call(getAllTodoCategories, userId);
    yield put(silentSetTodoCategories(allCategories));
  } catch (error) {
    sagaLogger.error('Error silently refreshing todo categories', error);
  }
}

function* addTodoCategorySaga(action: { type: string; payload: { name: string; homeId: string } }) {
  const { name, homeId } = action.payload;
  if (!name.trim()) return;

  try {
    const userId: string | undefined = yield call(getFileUserId);
    if (!userId) {
      sagaLogger.error('Cannot create todo category: No active home selected');
      return;
    }
    const newCategory: TodoCategory = yield call(createTodoCategoryService, { name }, userId);
    if (newCategory) {
      yield put(addTodoCategorySlice(newCategory));

      // Refresh to ensure sync
      const allCategories: TodoCategory[] = yield call(getAllTodoCategories, userId);
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
    const userId: string | undefined = yield call(getFileUserId);
    if (!userId) return;

    // Optimistically update to state
    const currentCategories: TodoCategory[] = yield select((state: RootState) => state.todo.categories);
    const categoryToUpdate = currentCategories.find((cat) => cat.id === id);
    if (categoryToUpdate) {
      const updatedCategory = { ...categoryToUpdate, name };
      yield put(updateTodoCategorySlice(updatedCategory));
    }

    // Then update in storage
    yield call(updateTodoCategoryService, id, { name }, userId);

    // Refresh to ensure sync
    const allCategories: TodoCategory[] = yield call(getAllTodoCategories, userId);
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
    const userId: string | undefined = yield call(getFileUserId);
    if (!userId) return;

    // Optimistically remove from state
    yield put(removeTodoCategorySlice(id));

    // Then delete from storage
    yield call(deleteTodoCategoryService, id, userId);

    // Refresh to ensure sync
    const allCategories: TodoCategory[] = yield call(getAllTodoCategories, userId);
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
