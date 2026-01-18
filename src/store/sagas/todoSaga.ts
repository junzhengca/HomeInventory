import { call, put, select, takeLatest } from 'redux-saga/effects';
import {
  setTodos,
  silentSetTodos,
  addTodo as addTodoSlice,
  updateTodo as updateTodoSlice,
  removeTodo as removeTodoSlice,
  setLoading,
} from '../slices/todoSlice';
import {
  getAllTodos,
  createTodo,
  toggleTodo as toggleTodoService,
  deleteTodo,
  updateTodo,
} from '../../services/TodoService';
import { TodoItem } from '../../types/inventory';
import type { RootState } from '../types';

// Action types
const LOAD_TODOS = 'todo/LOAD_TODOS';
const SILENT_REFRESH_TODOS = 'todo/SILENT_REFRESH_TODOS';
const ADD_TODO = 'todo/ADD_TODO';
const TOGGLE_TODO = 'todo/TOGGLE_TODO';
const DELETE_TODO = 'todo/DELETE_TODO';
const UPDATE_TODO = 'todo/UPDATE_TODO';

// Action creators
export const loadTodos = () => ({ type: LOAD_TODOS });
export const silentRefreshTodos = () => ({ type: SILENT_REFRESH_TODOS });
export const addTodo = (text: string, note?: string) => ({ type: ADD_TODO, payload: { text, note } });
export const toggleTodo = (id: string) => ({ type: TOGGLE_TODO, payload: id });
export const deleteTodoAction = (id: string) => ({ type: DELETE_TODO, payload: id });
export const updateTodoText = (id: string, text: string, note?: string) => ({
  type: UPDATE_TODO,
  payload: { id, text, note },
});

function* loadTodosSaga() {
  try {
    yield put(setLoading(true));
    const allTodos: TodoItem[] = yield call(getAllTodos);
    // Sort by createdAt in descending order (newest first)
    allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    yield put(setTodos(allTodos));
  } catch (error) {
    console.error('[TodoSaga] Error loading todos:', error);
  } finally {
    yield put(setLoading(false));
  }
}

function* silentRefreshTodosSaga() {
  try {
    // Silent refresh - no loading state changes
    const allTodos: TodoItem[] = yield call(getAllTodos);
    // Sort by createdAt in descending order (newest first)
    allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    // Use silentSetTodos to update without touching loading state
    yield put(silentSetTodos(allTodos));
  } catch (error) {
    console.error('[TodoSaga] Error silently refreshing todos:', error);
    // Don't throw - silent refresh should fail silently
  }
}

function* addTodoSaga(action: { type: string; payload: { text: string; note?: string } }) {
  const { text, note } = action.payload;
  if (!text.trim()) return;

  try {
    const newTodo: TodoItem = yield call(createTodo, text, note);
    if (newTodo) {
      // Optimistically add to state
      yield put(addTodoSlice(newTodo));

      // Refresh to ensure sync (but don't set loading)
      const allTodos: TodoItem[] = yield call(getAllTodos);
      allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      yield put(setTodos(allTodos));
    }
  } catch (error) {
    console.error('[TodoSaga] Error adding todo:', error);
    // Revert on error by refreshing
    yield loadTodosSaga();
  }
}

function* toggleTodoSaga(action: { type: string; payload: string }) {
  const id = action.payload;

  try {
    // Optimistically update to state
    const currentTodos: TodoItem[] = yield select((state: RootState) => state.todo.todos);
    const todoToUpdate = currentTodos.find((todo) => todo.id === id);
    if (todoToUpdate) {
      const updatedTodo = { ...todoToUpdate, completed: !todoToUpdate.completed };
      yield put(updateTodoSlice(updatedTodo));
    }

    // Then update in storage
    yield call(toggleTodoService, id);

    // Refresh to ensure sync (but don't set loading)
    const allTodos: TodoItem[] = yield call(getAllTodos);
    allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    yield put(setTodos(allTodos));
  } catch (error) {
    console.error('[TodoSaga] Error toggling todo:', error);
    // Revert on error by refreshing
    yield loadTodosSaga();
  }
}

function* deleteTodoSaga(action: { type: string; payload: string }) {
  const id = action.payload;

  try {
    // Optimistically remove from state
    yield put(removeTodoSlice(id));

    // Then delete from storage
    yield call(deleteTodo, id);

    // Refresh to ensure sync (but don't set loading)
    const allTodos: TodoItem[] = yield call(getAllTodos);
    allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    yield put(setTodos(allTodos));
  } catch (error) {
    console.error('[TodoSaga] Error deleting todo:', error);
    // Revert on error by refreshing
    yield loadTodosSaga();
  }
}

function* updateTodoSaga(action: { type: string; payload: { id: string; text: string; note?: string } }) {
  const { id, text, note } = action.payload;

  try {
    // Optimistically update to state
    const currentTodos: TodoItem[] = yield select((state: RootState) => state.todo.todos);
    const todoToUpdate = currentTodos.find((todo) => todo.id === id);
    if (todoToUpdate) {
      const updatedTodo = { ...todoToUpdate, text, note: note !== undefined ? note : todoToUpdate.note };
      yield put(updateTodoSlice(updatedTodo));
    }

    // Then update in storage
    yield call(updateTodo, id, { text, note });

    // Refresh to ensure sync (but don't set loading)
    const allTodos: TodoItem[] = yield call(getAllTodos);
    allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    yield put(setTodos(allTodos));
  } catch (error) {
    console.error('[TodoSaga] Error updating todo:', error);
    // Revert on error by refreshing
    yield loadTodosSaga();
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
}
