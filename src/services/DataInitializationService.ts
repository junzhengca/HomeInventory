import { Category, InventoryItem, TodoItem } from '../types/inventory';
import { Settings, defaultSettings } from '../types/settings';
import { fileExists, writeFile, readFile, deleteFile } from './FileSystemService';
import { itemCategories as defaultItemCategories } from '../data/defaultCategories';
import { getLocationIdsSet } from '../utils/locationUtils';

const ITEMS_FILE = 'items.json';
const CATEGORIES_FILE = 'categories.json';
const SETTINGS_FILE = 'settings.json';
const TODOS_FILE = 'todos.json';

interface ItemsData {
  items: InventoryItem[];
}

interface CategoriesData {
  categories: Category[];
}

interface TodosData {
  todos: TodoItem[];
}

/**
 * Initialize data files with default data if they don't exist
 */
export const initializeDataFiles = async (): Promise<void> => {
  try {
    // Initialize categories
    if (!(await fileExists(CATEGORIES_FILE))) {
      // Only save item categories to categories.json (NOT locations)
      const itemCats: Category[] = defaultItemCategories.map((cat) => ({
        ...cat,
        isCustom: false,
      }));

      await writeFile<CategoriesData>(CATEGORIES_FILE, {
        categories: itemCats,
      });
      console.log('Categories file initialized');
    } else {
      // Ensure item categories exist even if file already exists
      const existingData = await readFile<CategoriesData>(CATEGORIES_FILE);
      const existingCategories = existingData?.categories || [];
      const existingIds = new Set(existingCategories.map(cat => cat.id));

      // Filter out any location categories that might have been incorrectly added
      const locationIds = getLocationIdsSet();
      const filteredCategories = existingCategories.filter(cat => !locationIds.has(cat.id));

      const missingItemCategories = defaultItemCategories.filter(cat => !existingIds.has(cat.id));
      if (missingItemCategories.length > 0 || filteredCategories.length !== existingCategories.length) {
        const updatedCategories = [...filteredCategories, ...missingItemCategories];
        await writeFile<CategoriesData>(CATEGORIES_FILE, {
          categories: updatedCategories,
        });
        console.log('Added missing item categories and removed location categories');
      }
    }
    
    // Initialize items
    if (!(await fileExists(ITEMS_FILE))) {
      // Start with empty array - no mock data
      await writeFile<ItemsData>(ITEMS_FILE, {
        items: [],
      });
      console.log('Items file initialized');
    }
    
    // Initialize settings
    if (!(await fileExists(SETTINGS_FILE))) {
      await writeFile<Settings>(SETTINGS_FILE, defaultSettings);
      console.log('Settings file initialized');
    }

    // Initialize todos
    if (!(await fileExists(TODOS_FILE))) {
      await writeFile<TodosData>(TODOS_FILE, {
        todos: [],
      });
      console.log('Todos file initialized');
    }
  } catch (error) {
    console.error('Error initializing data files:', error);
    throw error;
  }
};

/**
 * Check if data files are initialized
 */
export const isDataInitialized = async (): Promise<boolean> => {
  const itemsExist = await fileExists(ITEMS_FILE);
  const categoriesExist = await fileExists(CATEGORIES_FILE);
  const settingsExist = await fileExists(SETTINGS_FILE);
  const todosExist = await fileExists(TODOS_FILE);

  return itemsExist && categoriesExist && settingsExist && todosExist;
};

/**
 * Clear all data files and re-initialize them with default data
 */
export const clearAllDataFiles = async (): Promise<boolean> => {
  try {
    // Delete all JSON files
    const filesToDelete = [ITEMS_FILE, CATEGORIES_FILE, SETTINGS_FILE, TODOS_FILE];
    
    for (const file of filesToDelete) {
      const deleted = await deleteFile(file);
      if (!deleted) {
        console.error(`Failed to delete file: ${file}`);
        return false;
      }
    }
    
    console.log('All data files deleted successfully');
    
    // Re-initialize with default data
    await initializeDataFiles();
    
    console.log('Data files re-initialized with defaults');
    return true;
  } catch (error) {
    console.error('Error clearing data files:', error);
    return false;
  }
};

