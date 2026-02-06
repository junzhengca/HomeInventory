import { Category, InventoryItem, TodoItem, Location } from '../types/inventory';
import { Settings, defaultSettings } from '../types/settings';
import { fileExists, writeFile, readFile, deleteFile, listJsonFiles } from './FileSystemService';
import { itemCategories as defaultItemCategories } from '../data/defaultCategories';
import { locations as defaultLocations } from '../data/locations';
import { getLocationIdsSet } from '../utils/locationUtils';
import i18n from '../i18n/i18n';

const ITEMS_FILE = 'items.json';
const CATEGORIES_FILE = 'categories.json';
const SETTINGS_FILE = 'settings.json';
const TODOS_FILE = 'todos.json';
const LOCATIONS_FILE = 'locations.json';
const HOMES_FILE = 'homes.json';

interface ItemsData {
  items: InventoryItem[];
}

interface CategoriesData {
  categories: Category[];
}

interface LocationsData {
  locations: Location[];
}

interface TodosData {
  todos: TodoItem[];
}

/**
 * Initialize data files with default data if they don't exist
 */
/**
 * Initialize data files.
 * Global files (settings) are initialized here.
 * Home-specific files should be initialized via initializeHomeData().
 * For backward compatibility or first-run, this can still ensure global settings exist.
 */
export const initializeDataFiles = async (): Promise<void> => {
  try {
    // Initialize settings (Global)
    if (!(await fileExists(SETTINGS_FILE))) {
      await writeFile<Settings>(SETTINGS_FILE, defaultSettings);
      console.log('Settings file initialized');
    }

    // Note: Items, Categories, and Todos are now home-scoped.
    // They are initialized when a home is created or switched to via initializeHomeData.
  } catch (error) {
    console.error('Error initializing data files:', error);
    throw error;
  }
};

/**
 * Initialize data files for a specific home
 */
export const initializeHomeData = async (homeId: string): Promise<void> => {
  try {
    const categoriesFile = CATEGORIES_FILE; // FileSystemService handles suffixing

    // Initialize categories for this home
    if (!(await fileExists(categoriesFile, homeId))) {
      // Create defaults with homeId injected
      const itemCats: Category[] = defaultItemCategories.map((cat) => ({
        ...cat,
        homeId: homeId,
        name: i18n.t(`categories.${cat.id}`), // Use localized name
        isCustom: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        clientUpdatedAt: new Date().toISOString(),
        pendingCreate: true,
        pendingUpdate: false,
        pendingDelete: false,
      }));

      await writeFile<CategoriesData>(categoriesFile, {
        categories: itemCats,
      }, homeId);
      console.log(`Categories file initialized for home ${homeId}`);
    } else {
      // Ensure item categories exist even if file already exists
      const existingData = await readFile<CategoriesData>(categoriesFile, homeId);
      const existingCategories = existingData?.categories || [];
      const existingIds = new Set(existingCategories.map(cat => cat.id));

      // Filter out any location categories that might have been incorrectly added (legacy cleanup)
      const locationIds = getLocationIdsSet();
      const filteredCategories = existingCategories.filter(cat => !locationIds.has(cat.id));

      const missingItemCategories = defaultItemCategories.filter(cat => !existingIds.has(cat.id));
      if (missingItemCategories.length > 0 || filteredCategories.length !== existingCategories.length) {
        const updatedCategories = [
          ...filteredCategories,
          ...missingItemCategories.map(cat => ({
            ...cat,
            homeId: homeId,
            name: i18n.t(`categories.${cat.id}`),
            isCustom: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1,
            clientUpdatedAt: new Date().toISOString(),
            pendingCreate: true,
            pendingUpdate: false,
            pendingDelete: false,
          }))
        ];

        await writeFile<CategoriesData>(categoriesFile, {
          categories: updatedCategories,
        }, homeId);
        console.log(`Added missing item categories for home ${homeId}`);
      }
    }

    // Initialize locations for this home
    const locationsFile = LOCATIONS_FILE;
    if (!(await fileExists(locationsFile, homeId))) {
      const locations: Location[] = defaultLocations.map((loc) => ({
        ...loc,
        homeId: homeId,
        name: i18n.t(`locations.${loc.id}`), // Use localized name
        // Sync metadata
        version: 1,
        clientUpdatedAt: new Date().toISOString(),
        pendingCreate: true,
        pendingUpdate: false,
        pendingDelete: false
      }));

      await writeFile<LocationsData>(locationsFile, {
        locations: locations,
      }, homeId);
      console.log(`Locations file initialized for home ${homeId}`);
    }

    // Initialize items for this home
    const itemsFile = ITEMS_FILE;
    if (!(await fileExists(itemsFile, homeId))) {
      await writeFile<ItemsData>(itemsFile, {
        items: [],
      }, homeId);
      console.log(`Items file initialized for home ${homeId}`);
    }

    // Initialize todos for this home
    const todosFile = TODOS_FILE;
    if (!(await fileExists(todosFile, homeId))) {
      await writeFile<TodosData>(todosFile, {
        todos: [],
      }, homeId);
      console.log(`Todos file initialized for home ${homeId}`);
    }

  } catch (error) {
    console.error(`Error initializing home data for ${homeId}:`, error);
    throw error;
  }
};

/**
 * Check if data files are initialized
 */
export const isDataInitialized = async (): Promise<boolean> => {
  const settingsExist = await fileExists(SETTINGS_FILE);
  return settingsExist;
};

/**
 * Clear all data files and re-initialize them with default data
 */
export const clearAllDataFiles = async (): Promise<boolean> => {
  try {
    // Delete all JSON files in the data directory
    const files = await listJsonFiles();

    for (const file of files) {
      const deleted = await deleteFile(file);
      if (!deleted) {
        console.error(`Failed to delete file: ${file}`);
        // Continue deleting other files even if one fails
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


