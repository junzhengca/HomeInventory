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
  },
});

export const { setTodos, silentSetTodos, addTodo, updateTodo, removeTodo, setLoading } =
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

