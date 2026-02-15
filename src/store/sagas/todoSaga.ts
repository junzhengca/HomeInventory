import { call, put, select, takeLatest } from 'redux-saga/effects';
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
import { todoService } from '../../services/TodoService';
import { todoCategoryService } from '../../services/TodoCategoryService';
import { TodoItem, TodoCategory } from '../../types/inventory';
import type { RootState } from '../types';
import { sagaLogger } from '../../utils/Logger';
import { getActiveHomeId } from './helpers/getActiveHomeId';
import { requestSync } from './syncSaga';

// Action types
const LOAD_TODOS = 'todo/LOAD_TODOS';
const SILENT_REFRESH_TODOS = 'todo/SILENT_REFRESH_TODOS';
const ADD_TODO = 'todo/ADD_TODO';
const TOGGLE_TODO = 'todo/TOGGLE_TODO';
const DELETE_TODO = 'todo/DELETE_TODO';
const UPDATE_TODO = 'todo/UPDATE_TODO';
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
export const loadTodoCategoriesAction = () => ({ type: LOAD_TODO_CATEGORIES });
export const silentRefreshTodoCategoriesAction = () => ({ type: SILENT_REFRESH_TODO_CATEGORIES });
export const addTodoCategoryAction = (name: string, homeId: string) => ({ type: ADD_TODO_CATEGORY, payload: { name, homeId } });
export const updateTodoCategoryAction = (id: string, name: string) => ({ type: UPDATE_TODO_CATEGORY, payload: { id, name } });
export const deleteTodoCategoryAction = (id: string) => ({ type: DELETE_TODO_CATEGORY, payload: id });

function* getFileHomeId() {
  const homeId: string | undefined = yield call(getActiveHomeId);

  if (!homeId) {
    sagaLogger.error('No active home - cannot load todos');
    yield put(setTodos([]));
    return;
  }

  return homeId;
}

function* loadTodosSaga() {
  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      yield put(setLoading(false));
      return;
    }

    yield put(setLoading(true));
    const allTodos: TodoItem[] = yield call([todoService, 'getAllTodos'], homeId);

    // CRITICAL: Preserve pending edits from current Redux state
    const currentState: RootState = yield select();
    const currentTodos = currentState.todo.todos;
    const pendingTodos = currentTodos.filter(t => t.pendingUpdate || t.pendingCreate);
    const pendingTodoIds = new Set(pendingTodos.map(t => t.id));

    // Merge: storage todos (synced) + pending todos (local edits)
    const mergedTodos: TodoItem[] = [
      ...pendingTodos,
      ...allTodos.filter(t => !pendingTodoIds.has(t.id))
    ];

    mergedTodos.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    yield put(setTodos(mergedTodos));
  } catch (error) {
    sagaLogger.error('Error loading todos', error);
  } finally {
    yield put(setLoading(false));
  }
}

function* silentRefreshTodosSaga() {
  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      return;
    }

    const allTodos: TodoItem[] = yield call([todoService, 'getAllTodos'], homeId);

    // CRITICAL: Preserve pending edits from current Redux state
    const currentState: RootState = yield select();
    const currentTodos = currentState.todo.todos;
    const pendingTodos = currentTodos.filter(t => t.pendingUpdate || t.pendingCreate);
    const pendingTodoIds = new Set(pendingTodos.map(t => t.id));

    // Merge: storage todos (synced) + pending todos (local edits)
    const mergedTodos: TodoItem[] = [
      ...pendingTodos,
      ...allTodos.filter(t => !pendingTodoIds.has(t.id))
    ];

    mergedTodos.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    yield put(silentSetTodos(mergedTodos));
  } catch (error) {
    sagaLogger.error('Error silently refreshing todos', error);
  }
}

function* addTodoSaga(action: { type: string; payload: { text: string; note?: string; categoryId?: string } }) {
  const { text, note, categoryId } = action.payload;
  if (!text.trim()) return;

  sagaLogger.verbose(`addTodoSaga - Creating todo: "${text}"`);

  try {
    const homeId: string | undefined = yield call(getFileHomeId);
    if (!homeId) {
      sagaLogger.error('Cannot create todo: No active home selected');
      return;
    }
    const createInput = { text, note, categoryId };
    sagaLogger.verbose(`Calling todoService.createTodo with input: ${JSON.stringify(createInput)}`);
    const newTodo: TodoItem = yield call([todoService, 'createTodo'], createInput, homeId);
    if (newTodo) {
      sagaLogger.verbose(`Todo created: id=${newTodo.id}, text="${newTodo.text}"`);
      yield put(addTodoSlice(newTodo));
      yield put(requestSync());
    } else {
      sagaLogger.error('Failed to create todo: newTodo is null/undefined');
    }
  } catch (error) {
    sagaLogger.error('Error adding todo', error);
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

    const currentTodos: TodoItem[] = yield select((state: RootState) => state.todo.todos);
    const todoToUpdate = currentTodos.find((todo) => todo.id === id);
    if (todoToUpdate) {
      const updatedTodo = { ...todoToUpdate, completed: !todoToUpdate.completed };
      yield put(updateTodoSlice(updatedTodo));
    }

    yield call([todoService, 'toggleTodo'], id, homeId);
    yield put(requestSync());
  } catch (error) {
    sagaLogger.error('Error toggling todo', error);
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

    yield put(removeTodoSlice(id));
    yield call([todoService, 'deleteTodo'], id, homeId);
    yield put(requestSync());
  } catch (error) {
    sagaLogger.error('Error deleting todo', error);
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

    const currentTodos: TodoItem[] = yield select((state: RootState) => state.todo.todos);
    const todoToUpdate = currentTodos.find((todo) => todo.id === id);
    if (todoToUpdate) {
      const updatedTodo = { ...todoToUpdate, text, note: note !== undefined ? note : todoToUpdate.note };
      yield put(updateTodoSlice(updatedTodo));
    }

    yield call([todoService, 'updateTodo'], id, { text, note }, homeId);
    yield put(requestSync());
  } catch (error) {
    sagaLogger.error('Error updating todo', error);
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

    // CRITICAL: Preserve pending edits from current Redux state
    const currentState: RootState = yield select();
    const currentCategories = currentState.todo.categories;
    const pendingCategories = currentCategories.filter(c => c.pendingUpdate || c.pendingCreate);
    const pendingCategoryIds = new Set(pendingCategories.map(c => c.id));

    const mergedCategories: TodoCategory[] = [
      ...pendingCategories,
      ...allCategories.filter(c => !pendingCategoryIds.has(c.id))
    ];

    yield put(setTodoCategories(mergedCategories));
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

    // CRITICAL: Preserve pending edits from current Redux state
    const currentState: RootState = yield select();
    const currentCategories = currentState.todo.categories;
    const pendingCategories = currentCategories.filter(c => c.pendingUpdate || c.pendingCreate);
    const pendingCategoryIds = new Set(pendingCategories.map(c => c.id));

    const mergedCategories: TodoCategory[] = [
      ...pendingCategories,
      ...allCategories.filter(c => !pendingCategoryIds.has(c.id))
    ];

    yield put(silentSetTodoCategories(mergedCategories));
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
      yield put(requestSync());
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

    const currentCategories: TodoCategory[] = yield select((state: RootState) => state.todo.categories);
    const categoryToUpdate = currentCategories.find((cat) => cat.id === id);
    if (categoryToUpdate) {
      const updatedCategory = { ...categoryToUpdate, name };
      yield put(updateTodoCategorySlice(updatedCategory));
    }

    yield call([todoCategoryService, 'updateCategory'], id, { name }, homeId as string);
    yield put(requestSync());
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

    yield put(removeTodoCategorySlice(id));
    yield call([todoCategoryService, 'deleteCategory'], id, homeId as string);
    yield put(requestSync());
  } catch (error) {
    sagaLogger.error('Error deleting todo category', error);
    yield loadTodoCategoriesSaga();
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

  // Todo categories
  yield takeLatest(LOAD_TODO_CATEGORIES, loadTodoCategoriesSaga);
  yield takeLatest(SILENT_REFRESH_TODO_CATEGORIES, silentRefreshTodoCategoriesSaga);
  yield takeLatest(ADD_TODO_CATEGORY, addTodoCategorySaga);
  yield takeLatest(UPDATE_TODO_CATEGORY, updateTodoCategorySaga);
  yield takeLatest(DELETE_TODO_CATEGORY, deleteTodoCategorySaga);
}
