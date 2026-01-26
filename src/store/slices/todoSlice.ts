import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { TodoItem } from '../../types/inventory';

interface TodoState {
  todos: TodoItem[];
  loading: boolean;
}

const initialState: TodoState = {
  todos: [],
  loading: true,
};

const todoSlice = createSlice({
  name: 'todo',
  initialState,
  reducers: {
    setTodos: (state, action: PayloadAction<TodoItem[]>) => {
      state.todos = action.payload;
    },
    silentSetTodos: (state, action: PayloadAction<TodoItem[]>) => {
      // Silent update - only updates todos, does not touch loading state
      state.todos = action.payload;
    },
    addTodo: (state, action: PayloadAction<TodoItem>) => {
      state.todos.unshift(action.payload);
    },
    updateTodo: (state, action: PayloadAction<TodoItem>) => {
      const index = state.todos.findIndex((todo) => todo.id === action.payload.id);
      if (index !== -1) {
        state.todos[index] = action.payload;
      }
    },
    removeTodo: (state, action: PayloadAction<string>) => {
      state.todos = state.todos.filter((todo) => todo.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    upsertTodos: (state, action: PayloadAction<TodoItem[]>) => {
      const todosToUpsert = action.payload;
      if (todosToUpsert.length === 0) return;

      const todoMap = new Map(state.todos.map(todo => [todo.id, todo]));
      todosToUpsert.forEach(todo => {
        todoMap.set(todo.id, todo);
      });
      state.todos = Array.from(todoMap.values());
    },
    removeTodos: (state, action: PayloadAction<string[]>) => {
      const idsToRemove = new Set(action.payload);
      if (idsToRemove.size === 0) return;
      state.todos = state.todos.filter(todo => !idsToRemove.has(todo.id));
    },
  },
});

export const { setTodos, silentSetTodos, addTodo, updateTodo, removeTodo, setLoading, upsertTodos, removeTodos } =
  todoSlice.actions;

// Selectors
const selectTodos = (state: { todo: TodoState }) => state.todo.todos;

export const selectPendingTodos = createSelector(
  [selectTodos],
  (todos) => todos.filter((todo) => !todo.completed)
);

export const selectCompletedTodos = createSelector(
  [selectTodos],
  (todos) => todos.filter((todo) => todo.completed)
);

export default todoSlice.reducer;

