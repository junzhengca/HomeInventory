import { Category } from '../types/inventory';
import { readFile, writeFile } from './FileSystemService';
import { getAllItems } from './InventoryService';
import { generateCategoryId } from '../utils/idGenerator';
import { syncCallbackRegistry } from './SyncCallbackRegistry';

const CATEGORIES_FILE = 'categories.json';

interface CategoriesData {
  categories: Category[];
}

/**
 * Get all categories
 */
export const getAllCategories = async (): Promise<Category[]> => {
  const data = await readFile<CategoriesData>(CATEGORIES_FILE);
  return data?.categories || [];
};

/**
 * Get a single category by ID
 */
export const getCategoryById = async (id: string): Promise<Category | null> => {
  const categories = await getAllCategories();
  return categories.find((category) => category.id === id) || null;
};

/**
 * Check if a category is in use by any items
 */
export const isCategoryInUse = async (categoryId: string): Promise<boolean> => {
  const items = await getAllItems();
  return items.some((item) => item.category === categoryId);
};

/**
 * Create a new custom category
 */
export const createCategory = async (
  category: Omit<Category, 'id' | 'isCustom' | 'createdAt' | 'updatedAt'>
): Promise<Category | null> => {
  try {
    const categories = await getAllCategories();

    // Check if category name already exists
    const existingCategory = categories.find(
      (cat) => cat.name === category.name || cat.label === category.label
    );

    if (existingCategory) {
      throw new Error('Category with this name already exists');
    }

    const now = new Date().toISOString();
    const newCategory: Category = {
      ...category,
      id: generateCategoryId(),
      isCustom: true,
      createdAt: now,
      updatedAt: now,
    };

    categories.push(newCategory);
    const success = await writeFile<CategoriesData>(CATEGORIES_FILE, { categories });

    if (success) {
      console.log('[CategoryService] Triggering sync after createCategory');
      syncCallbackRegistry.trigger('categories');
    }

    return success ? newCategory : null;
  } catch (error) {
    console.error('Error creating category:', error);
    return null;
  }
};

/**
 * Update an existing category
 */
export const updateCategory = async (
  id: string,
  updates: Partial<Omit<Category, 'id' | 'isCustom' | 'createdAt' | 'updatedAt'>>
): Promise<Category | null> => {
  try {
    const categories = await getAllCategories();
    const index = categories.findIndex((category) => category.id === id);

    if (index === -1) {
      return null;
    }

    // Prevent updating system categories
    if (!categories[index].isCustom) {
      throw new Error('Cannot update system categories');
    }

    // Check for duplicate names
    if (updates.name || updates.label) {
      const duplicate = categories.find(
        (cat, idx) =>
          idx !== index &&
          (cat.name === (updates.name || categories[index].name) ||
            cat.label === (updates.label || categories[index].label))
      );

      if (duplicate) {
        throw new Error('Category with this name already exists');
      }
    }

    categories[index] = { ...categories[index], ...updates, updatedAt: new Date().toISOString() };
    const success = await writeFile<CategoriesData>(CATEGORIES_FILE, { categories });

    if (success) {
      console.log('[CategoryService] Triggering sync after updateCategory');
      syncCallbackRegistry.trigger('categories');
    }

    return success ? categories[index] : null;
  } catch (error) {
    console.error('Error updating category:', error);
    return null;
  }
};

/**
 * Delete a category
 */
export const deleteCategory = async (id: string): Promise<boolean> => {
  try {
    const categories = await getAllCategories();
    const category = categories.find((cat) => cat.id === id);

    if (!category) {
      return false; // Category not found
    }

    // Prevent deleting system categories
    if (!category.isCustom) {
      throw new Error('Cannot delete system categories');
    }

    // Check if category is in use
    const inUse = await isCategoryInUse(id);
    if (inUse) {
      throw new Error('Cannot delete category that is in use by items');
    }

    const filteredCategories = categories.filter((cat) => cat.id !== id);
    const success = await writeFile<CategoriesData>(CATEGORIES_FILE, { categories: filteredCategories });

    if (success) {
      console.log('[CategoryService] Triggering sync after deleteCategory');
      syncCallbackRegistry.trigger('categories');
    }

    return success;
  } catch (error) {
    console.error('Error deleting category:', error);
    return false;
  }
};

