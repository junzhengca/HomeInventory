import React, { createContext, useContext, useCallback, useRef } from 'react';

interface CategoryContextType {
  refreshCategories: () => void;
  registerRefreshCallback: (callback: () => void) => () => void;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const callbacksRef = useRef<Set<() => void>>(new Set());

  const registerRefreshCallback = useCallback((callback: () => void) => {
    callbacksRef.current.add(callback);
    // Return unregister function
    return () => {
      callbacksRef.current.delete(callback);
    };
  }, []);

  const refreshCategories = useCallback(() => {
    callbacksRef.current.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('Error calling refresh callback:', error);
      }
    });
  }, []);

  return (
    <CategoryContext.Provider value={{ refreshCategories, registerRefreshCallback }}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategory = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategory must be used within CategoryProvider');
  }
  return context;
};

