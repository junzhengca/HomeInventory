import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { TodoItem } from '../types/inventory';
import {
  getAllTodos,
  createTodo,
  toggleTodo,
  deleteTodo,
  updateTodo,
} from '../services/TodoService';

interface TodoContextType {
  todos: TodoItem[];
  pendingTodos: TodoItem[];
  completedTodos: TodoItem[];
  loading: boolean;
  refreshTodos: () => Promise<void>;
  addTodo: (text: string) => Promise<void>;
  toggleTodoCompletion: (id: string) => Promise<void>;
  removeTodo: (id: string) => Promise<void>;
  updateTodo: (id: string, text: string) => Promise<void>;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

export const TodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshTodos = useCallback(async () => {
    try {
      setLoading(true);
      const allTodos = await getAllTodos();
      // Sort by createdAt in descending order (newest first)
      allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTodos(allTodos);
    } catch (error) {
      console.error('Error refreshing todos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTodo = useCallback(async (text: string) => {
    if (!text.trim()) return;

    try {
      const newTodo = await createTodo(text);
      if (newTodo) {
        // Optimistically add to state
        setTodos((prevTodos) => [newTodo, ...prevTodos]);
        
        // Refresh to ensure sync (but don't set loading)
        const allTodos = await getAllTodos();
        allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTodos(allTodos);
      }
    } catch (error) {
      console.error('Error adding todo:', error);
      // Revert on error by refreshing
      await refreshTodos();
    }
  }, [refreshTodos]);

  const toggleTodoCompletion = useCallback(async (id: string) => {
    try {
      // Optimistically update the state
      setTodos((prevTodos) =>
        prevTodos.map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo
        )
      );
      
      // Then update in storage
      await toggleTodo(id);
      
      // Refresh to ensure sync (but don't set loading)
      const allTodos = await getAllTodos();
      allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTodos(allTodos);
    } catch (error) {
      console.error('Error toggling todo:', error);
      // Revert on error by refreshing
      await refreshTodos();
    }
  }, [refreshTodos]);

  const removeTodo = useCallback(async (id: string) => {
    try {
      // Optimistically remove from state
      setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== id));
      
      // Then delete from storage
      await deleteTodo(id);
      
      // Refresh to ensure sync (but don't set loading)
      const allTodos = await getAllTodos();
      allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTodos(allTodos);
    } catch (error) {
      console.error('Error deleting todo:', error);
      // Revert on error by refreshing
      await refreshTodos();
    }
  }, [refreshTodos]);

  const updateTodoText = useCallback(async (id: string, text: string) => {
    try {
      // Optimistically update the state
      setTodos((prevTodos) =>
        prevTodos.map((todo) =>
          todo.id === id ? { ...todo, text } : todo
        )
      );
      
      // Then update in storage
      await updateTodo(id, { text });
      
      // Refresh to ensure sync (but don't set loading)
      const allTodos = await getAllTodos();
      allTodos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTodos(allTodos);
    } catch (error) {
      console.error('Error updating todo:', error);
      // Revert on error by refreshing
      await refreshTodos();
    }
  }, [refreshTodos]);

  const pendingTodos = useMemo(
    () => todos.filter((todo) => !todo.completed),
    [todos]
  );
  const completedTodos = useMemo(
    () => todos.filter((todo) => todo.completed),
    [todos]
  );

  return (
    <TodoContext.Provider
      value={{
        todos,
        pendingTodos,
        completedTodos,
        loading,
        refreshTodos,
        addTodo,
        toggleTodoCompletion,
        removeTodo,
        updateTodo: updateTodoText,
      }}
    >
      {children}
    </TodoContext.Provider>
  );
};

export const useTodos = () => {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodos must be used within TodoProvider');
  }
  return context;
};

