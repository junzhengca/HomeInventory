import { generateItemId } from '../utils/idGenerator';
import { ApiClient } from './ApiClient';
import {
  InventoryCategoryDto,
  CreateInventoryCategoryRequest,
  UpdateInventoryCategoryRequest,
  DeleteInventoryCategoryResponse,
  ListInventoryCategoriesResponse,
  CreateInventoryCategoryResponse,
  UpdateInventoryCategoryResponse,
} from '../types/api';
import { InventoryCategory } from '../types/inventory';
import { apiLogger } from '../utils/Logger';

// Simple state for in-memory storage (no file persistence)
interface CategoryState {
  categories: InventoryCategory[];
}

interface CategoryLoadingState {
  isLoading: boolean;
  operation: 'list' | 'create' | 'update' | 'delete' | null;
  error: string | null;
}

/**
 * Convert API DTO to domain model
 */
function dtoToInventoryCategory(dto: InventoryCategoryDto): InventoryCategory {
  return {
    id: dto.categoryId,
    homeId: dto.homeId,
    name: dto.name,
    description: dto.description,
    color: dto.color,
    icon: dto.icon,
    isCustom: dto.isCustom ?? true,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

class InventoryCategoryService {
  // Simple state instead of file storage
  private state: Map<string, CategoryState> = new Map(); // homeId -> state
  private listeners: Set<() => void> = new Set();

  // Loading state tracking
  private loadingState: CategoryLoadingState = {
    isLoading: false,
    operation: null,
    error: null,
  };

  /**
   * Get state for a specific home
   */
  private getState(homeId: string): CategoryState {
    if (!this.state.has(homeId)) {
      this.state.set(homeId, { categories: [] });
    }
    return this.state.get(homeId)!;
  }

  /**
   * Subscribe to category state changes
   * @returns Unsubscribe function
   */
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(cb => cb());
  }

  /**
   * Get current loading state
   */
  getLoadingState(): CategoryLoadingState {
    return { ...this.loadingState };
  }

  /**
   * Set loading state
   */
  private setLoading(operation: CategoryLoadingState['operation'], error: string | null = null): void {
    this.loadingState = {
      isLoading: operation !== null,
      operation,
      error,
    };
    this.notifyListeners();
  }

  /**
   * Fetch categories from server for a home
   */
  async fetchCategories(apiClient: ApiClient, homeId: string): Promise<InventoryCategory[]> {
    this.setLoading('list');
    try {
      const response = await apiClient.listInventoryCategories(homeId) as ListInventoryCategoriesResponse;
      const categories = response.inventoryCategories.map(dto => dtoToInventoryCategory(dto));

      // Update state
      const state = this.getState(homeId);
      state.categories = categories;

      this.setLoading(null);
      this.notifyListeners();
      return categories;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch categories';
      apiLogger.error('Failed to fetch inventory categories:', error);
      this.setLoading(null, errorMessage);
      throw error;
    }
  }

  /**
   * Create a new category
   */
  async createCategory(apiClient: ApiClient, homeId: string, input: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }): Promise<InventoryCategory | null> {
    this.setLoading('create');
    try {
      const newId = generateItemId();
      const request: CreateInventoryCategoryRequest = {
        categoryId: newId,
        name: input.name.trim(),
        description: input.description?.trim(),
        color: input.color,
        icon: input.icon,
      };

      const response = await apiClient.createInventoryCategory(homeId, request) as CreateInventoryCategoryResponse;
      const newCategory = dtoToInventoryCategory(response.inventoryCategory);

      // Add to state
      const state = this.getState(homeId);
      state.categories = [...state.categories, newCategory];

      this.setLoading(null);
      this.notifyListeners();
      return newCategory;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create category';
      apiLogger.error('Failed to create inventory category:', error);
      this.setLoading(null, errorMessage);
      throw error;
    }
  }

  /**
   * Update a category
   */
  async updateCategory(apiClient: ApiClient, homeId: string, categoryId: string, updates: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
  }): Promise<InventoryCategory | null> {
    this.setLoading('update');
    try {
      const request: UpdateInventoryCategoryRequest = {
        name: updates.name,
        description: updates.description,
        color: updates.color,
        icon: updates.icon,
      };

      const response = await apiClient.updateInventoryCategory(homeId, categoryId, request) as UpdateInventoryCategoryResponse;
      const updatedCategory = dtoToInventoryCategory(response.inventoryCategory);

      // Update in state
      const state = this.getState(homeId);
      state.categories = state.categories.map(c => c.id === categoryId ? updatedCategory : c);

      this.setLoading(null);
      this.notifyListeners();
      return updatedCategory;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update category';
      apiLogger.error('Failed to update inventory category:', error);
      this.setLoading(null, errorMessage);
      throw error;
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(apiClient: ApiClient, homeId: string, categoryId: string): Promise<boolean> {
    this.setLoading('delete');
    try {
      await apiClient.deleteInventoryCategory(homeId, categoryId) as DeleteInventoryCategoryResponse;

      // Remove from state
      const state = this.getState(homeId);
      state.categories = state.categories.filter(c => c.id !== categoryId);

      this.setLoading(null);
      this.notifyListeners();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete category';
      apiLogger.error('Failed to delete inventory category:', error);
      this.setLoading(null, errorMessage);
      throw error;
    }
  }

  /**
   * Get all categories for a home (from state)
   */
  getAllCategories(homeId: string): InventoryCategory[] {
    const state = this.getState(homeId);
    return [...state.categories];
  }

  /**
   * Get a specific category by ID
   */
  getCategoryById(homeId: string, categoryId: string): InventoryCategory | null {
    const state = this.getState(homeId);
    return state.categories.find(c => c.id === categoryId) || null;
  }

  /**
   * Clear all categories for a home (useful when switching homes)
   */
  clearCategories(homeId: string): void {
    const state = this.getState(homeId);
    state.categories = [];
    this.notifyListeners();
  }
}

export const inventoryCategoryService = new InventoryCategoryService();
export type { InventoryCategoryService };
