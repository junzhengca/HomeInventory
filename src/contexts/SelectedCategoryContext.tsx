import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SelectedCategoryContextType {
  homeCategory: string;
  inventoryCategory: string;
  setHomeCategory: (category: string) => void;
  setInventoryCategory: (category: string) => void;
}

const SelectedCategoryContext = createContext<SelectedCategoryContextType | undefined>(undefined);

export const SelectedCategoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [homeCategory, setHomeCategory] = useState<string>('all');
  const [inventoryCategory, setInventoryCategory] = useState<string>('all');

  return (
    <SelectedCategoryContext.Provider
      value={{
        homeCategory,
        inventoryCategory,
        setHomeCategory,
        setInventoryCategory,
      }}
    >
      {children}
    </SelectedCategoryContext.Provider>
  );
};

export const useSelectedCategory = (): SelectedCategoryContextType => {
  const context = useContext(SelectedCategoryContext);
  if (!context) {
    throw new Error('useSelectedCategory must be used within a SelectedCategoryProvider');
  }
  return context;
};

