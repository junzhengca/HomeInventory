import { Category, InventoryItem } from '../types/inventory';
import { Settings, defaultSettings } from '../types/settings';
import { fileExists, writeFile } from './FileSystemService';
import { categories as mockCategories, mockInventoryItems } from '../data/mockInventory';

const ITEMS_FILE = 'items.json';
const CATEGORIES_FILE = 'categories.json';
const SETTINGS_FILE = 'settings.json';

interface ItemsData {
  items: InventoryItem[];
}

interface CategoriesData {
  categories: Category[];
}

/**
 * Initialize data files with default/mock data if they don't exist
 */
export const initializeDataFiles = async (): Promise<void> => {
  try {
    // Initialize categories
    if (!(await fileExists(CATEGORIES_FILE))) {
      // Exclude "all" category as it's a UI filter, not a stored category
      const systemCategories: Category[] = mockCategories
        .filter((cat) => cat.id !== 'all')
        .map((cat) => ({
          ...cat,
          isCustom: false,
        }));
      
      await writeFile<CategoriesData>(CATEGORIES_FILE, {
        categories: systemCategories,
      });
      console.log('Categories file initialized');
    }
    
    // Initialize items
    if (!(await fileExists(ITEMS_FILE))) {
      // Migrate mock items to new format
      const migratedItems: InventoryItem[] = mockInventoryItems.map((item) => ({
        ...item,
        tags: [], // Initialize empty tags array
        // Remove isExpiring as it's now calculated from expiryDate
      }));
      
      await writeFile<ItemsData>(ITEMS_FILE, {
        items: migratedItems,
      });
      console.log('Items file initialized');
    }
    
    // Initialize settings
    if (!(await fileExists(SETTINGS_FILE))) {
      await writeFile<Settings>(SETTINGS_FILE, defaultSettings);
      console.log('Settings file initialized');
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
  
  return itemsExist && categoriesExist && settingsExist;
};

