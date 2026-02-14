import { Category, InventoryItem, TodoItem, TodoCategory, Location } from '../types/inventory';
import { Settings, defaultSettings } from '../types/settings';
import { fileSystemService } from './FileSystemService';
import { itemCategories as defaultItemCategories } from '../data/defaultCategories';
import { todoCategories as defaultTodoCategories } from '../data/defaultTodoCategories';
import { locations as defaultLocations } from '../data/locations';
import { getLocationIdsSet } from '../utils/locationUtils';
import i18n from '../i18n/i18n';
import { storageLogger } from '../utils/Logger';

const ITEMS_FILE = 'items.json';
const CATEGORIES_FILE = 'categories.json';
const TODO_CATEGORIES_FILE = 'todo_categories.json';
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

interface TodoCategoriesData {
  categories: TodoCategory[];
}

class DataInitializationService {
  public constructor() {}

  /**
   * Initialize data files.
   * Global files (settings) are initialized here.
   * Home-specific files should be initialized via initializeHomeData().
   * For backward compatibility or first-run, this can still ensure global settings exist.
   */
  async initializeDataFiles(): Promise<void> {
    try {
      // Initialize settings (Global)
      if (!(await fileSystemService.fileExists(SETTINGS_FILE))) {
        await fileSystemService.writeFile<Settings>(SETTINGS_FILE, defaultSettings);
        storageLogger.info('Settings file initialized');
      }

      // Note: Items, Categories, and Todos are now home-scoped.
      // They are initialized when a home is created or switched to via initializeHomeData.
    } catch (error) {
      storageLogger.error('Error initializing data files:', error);
      throw error;
    }
  }

  /**
   * Initialize data files for a specific home
   */
  async initializeHomeData(homeId: string): Promise<void> {
    try {
      const categoriesFile = CATEGORIES_FILE; // FileSystemService handles suffixing

      // Initialize categories for this home
      if (!(await fileSystemService.fileExists(categoriesFile, homeId))) {
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

        await fileSystemService.writeFile<CategoriesData>(categoriesFile, {
          categories: itemCats,
        }, homeId);
        storageLogger.info(`Categories file initialized for home ${homeId}`);
      } else {
        // Ensure item categories exist even if file already exists
        const existingData = await fileSystemService.readFile<CategoriesData>(categoriesFile, homeId);
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

          await fileSystemService.writeFile<CategoriesData>(categoriesFile, {
            categories: updatedCategories,
          }, homeId);
          storageLogger.info(`Added missing item categories for home ${homeId}`);
        }
      }

      // Initialize locations for this home
      const locationsFile = LOCATIONS_FILE;
      if (!(await fileSystemService.fileExists(locationsFile, homeId))) {
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

        await fileSystemService.writeFile<LocationsData>(locationsFile, {
          locations: locations,
        }, homeId);
        storageLogger.info(`Locations file initialized for home ${homeId}`);
      }

      // Initialize items for this home
      const itemsFile = ITEMS_FILE;
      if (!(await fileSystemService.fileExists(itemsFile, homeId))) {
        await fileSystemService.writeFile<ItemsData>(itemsFile, {
          items: [],
        }, homeId);
        storageLogger.info(`Items file initialized for home ${homeId}`);
      }

      // Initialize todos for this home
      const todosFile = TODOS_FILE;
      if (!(await fileSystemService.fileExists(todosFile, homeId))) {
        await fileSystemService.writeFile<TodosData>(todosFile, {
          todos: [],
        }, homeId);
        storageLogger.info(`Todos file initialized for home ${homeId}`);
      }

      // Initialize todo categories for this home
      const todoCategoriesFile = TODO_CATEGORIES_FILE;
      if (!(await fileSystemService.fileExists(todoCategoriesFile, homeId))) {
        const todoCats: TodoCategory[] = defaultTodoCategories.map((cat) => ({
          ...cat,
          homeId: homeId,
          name: i18n.t(`todoCategories.${cat.id}`), // Use localized name
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pendingCreate: true,
        }));

        await fileSystemService.writeFile<TodoCategoriesData>(todoCategoriesFile, {
          categories: todoCats,
        }, homeId);
        storageLogger.info(`Todo categories file initialized for home ${homeId}`);
      } else {
        // Ensure todo categories exist even if file already exists
        const existingData = await fileSystemService.readFile<TodoCategoriesData>(todoCategoriesFile, homeId);
        const existingCategories = existingData?.categories || [];
        const existingIds = new Set(existingCategories.map(cat => cat.id));

        const missingCategories = defaultTodoCategories.filter(cat => !existingIds.has(cat.id));
        if (missingCategories.length > 0) {
          const updatedCategories = [
            ...existingCategories,
            ...missingCategories.map(cat => ({
              ...cat,
              homeId: homeId,
              name: i18n.t(`todoCategories.${cat.id}`),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              pendingCreate: true,
            }))
          ];

          await fileSystemService.writeFile<TodoCategoriesData>(todoCategoriesFile, {
            categories: updatedCategories,
          }, homeId);
          storageLogger.info(`Added missing todo categories for home ${homeId}`);
        }
      }

    } catch (error) {
      storageLogger.error(`Error initializing home data for ${homeId}:`, error);
      throw error;
    }
  }

  /**
   * Check if data files are initialized
   */
  async isDataInitialized(): Promise<boolean> {
    const settingsExist = await fileSystemService.fileExists(SETTINGS_FILE);
    return settingsExist;
  }

  /**
   * Relocalize default categories when language changes
   */
  async relocalizeDefaultCategories(homeId: string): Promise<void> {
    try {
      const categoriesFile = CATEGORIES_FILE;
      const existingData = await fileSystemService.readFile<CategoriesData>(categoriesFile, homeId);
      const categories = existingData?.categories || [];

      let updated = false;
      const updatedCategories = categories.map(cat => {
        const isDefault = defaultItemCategories.some(defaultCat => defaultCat.id === cat.id);
        if (isDefault) {
          const localizedName = i18n.t(`categories.${cat.id}`);
          if (cat.name !== localizedName) {
            updated = true;
            const now = new Date().toISOString();
            return {
              ...cat,
              name: localizedName,
              updatedAt: now,
              version: cat.version + 1,
              clientUpdatedAt: now,
              pendingUpdate: !cat.pendingCreate,
            };
          }
        }
        return cat;
      });

      if (updated) {
        await fileSystemService.writeFile<CategoriesData>(categoriesFile, {
          categories: updatedCategories,
        }, homeId);
        storageLogger.info(`Relocalized categories for home ${homeId}`);
      }
    } catch (error) {
      storageLogger.error('Error relocalizing categories:', error);
      throw error;
    }
  }

  /**
   * Relocalize default todo categories when language changes
   */
  async relocalizeDefaultTodoCategories(homeId: string): Promise<void> {
    try {
      const todoCategoriesFile = TODO_CATEGORIES_FILE;
      const existingData = await fileSystemService.readFile<TodoCategoriesData>(todoCategoriesFile, homeId);
      const categories = existingData?.categories || [];

      let updated = false;
      const updatedCategories = categories.map(cat => {
        const isDefault = defaultTodoCategories.some(defaultCat => defaultCat.id === cat.id);
        if (isDefault) {
          const localizedName = i18n.t(`todoCategories.${cat.id}`);
          if (cat.name !== localizedName) {
            updated = true;
            const now = new Date().toISOString();
            return {
              ...cat,
              name: localizedName,
              updatedAt: now,
              version: cat.version + 1,
              clientUpdatedAt: now,
              pendingUpdate: !cat.pendingCreate,
            };
          }
        }
        return cat;
      });

      if (updated) {
        await fileSystemService.writeFile<TodoCategoriesData>(todoCategoriesFile, {
          categories: updatedCategories,
        }, homeId);
        storageLogger.info(`Relocalized todo categories for home ${homeId}`);
      }
    } catch (error) {
      storageLogger.error('Error relocalizing todo categories:', error);
      throw error;
    }
  }

  /**
   * Clear all data files and re-initialize them with default data
   */
  async clearAllDataFiles(): Promise<boolean> {
    try {
      // Delete all JSON files in the data directory
      const files = await fileSystemService.listJsonFiles();

      for (const file of files) {
        const deleted = await fileSystemService.deleteFile(file);
        if (!deleted) {
          storageLogger.error(`Failed to delete file: ${file}`);
          // Continue deleting other files even if one fails
        }
      }

      storageLogger.info('All data files deleted successfully');

      // Re-initialize with default data
      await this.initializeDataFiles();

      storageLogger.info('Data files re-initialized with defaults');
      return true;
    } catch (error) {
      storageLogger.error('Error clearing data files:', error);
      return false;
    }
  }
}

export const dataInitializationService = new DataInitializationService();
export type { DataInitializationService };
