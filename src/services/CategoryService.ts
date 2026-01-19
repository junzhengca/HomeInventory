import { Category } from '../types/inventory';
import { readFile, writeFile } from './FileSystemService';
import { generateCategoryId } from '../utils/idGenerator';
import { syncCallbackRegistry } from './SyncCallbackRegistry';

const CATEGORIES_FILE = 'categories.json';

interface CategoriesData {
  categories: Category[];
}

/**
 * Get all categories (excluding deleted categories)
 */
export const getAllCategories = async (): Promise<Category[]> => {
  const data = await readFile<CategoriesData>(CATEGORIES_FILE);
  const categories = data?.categories || [];
  return categories.filter((category) => !category.deletedAt);
};

/**
 * Get all categories for sync (including deleted categories)
 */
export const getAllCategoriesForSync = async (): Promise<Category[]> => {
  const data = await readFile<CategoriesData>(CATEGORIES_FILE);
  return data?.categories || [];
};

/**
 * Get a single category by ID (excluding deleted categories)
 */
export const getCategoryById = async (id: string): Promise<Category | null> => {
  const categories = await getAllCategories();
  return categories.find((category) => category.id === id && !category.deletedAt) || null;
};

/**
 * Check if a category is in use by any items
 * Note: Items no longer have categories, so this always returns false
 */
export const isCategoryInUse = async (_categoryId: string): Promise<boolean> => {
  // Items no longer have categories, so categories are never in use by items
  return false;
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
 * Delete a category (soft delete - sets deletedAt timestamp)
 */
export const deleteCategory = async (id: string): Promise<boolean> => {
  try {
    const data = await readFile<CategoriesData>(CATEGORIES_FILE);
    const categories = data?.categories || [];
    const category = categories.find((cat) => cat.id === id);

    if (!category) {
      return false; // Category not found
    }

    // Prevent deleting system categories
    if (!category.isCustom) {
      throw new Error('Cannot delete system categories');
    }

    // Check if category is in use (only check non-deleted items)
    const inUse = await isCategoryInUse(id);
    if (inUse) {
      throw new Error('Cannot delete category that is in use by items');
    }

    // If already deleted, return true (idempotent)
    if (category.deletedAt) {
      return true;
    }

    // Soft delete: set deletedAt and update updatedAt
    const index = categories.findIndex((cat) => cat.id === id);
    const now = new Date().toISOString();
    categories[index] = {
      ...categories[index],
      deletedAt: now,
      updatedAt: now,
    };

    const success = await writeFile<CategoriesData>(CATEGORIES_FILE, { categories });

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

