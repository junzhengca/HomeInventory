import { InventoryItem } from '../types/inventory';
import { readFile, writeFile } from './FileSystemService';

const ITEMS_FILE = 'items.json';

interface ItemsData {
  items: InventoryItem[];
}

/**
 * Get all inventory items
 */
export const getAllItems = async (): Promise<InventoryItem[]> => {
  const data = await readFile<ItemsData>(ITEMS_FILE);
  return data?.items || [];
};

/**
 * Get a single item by ID
 */
export const getItemById = async (id: string): Promise<InventoryItem | null> => {
  const items = await getAllItems();
  return items.find((item) => item.id === id) || null;
};

/**
 * Create a new item
 */
export const createItem = async (item: Omit<InventoryItem, 'id'>): Promise<InventoryItem | null> => {
  try {
    const items = await getAllItems();
    const newItem: InventoryItem = {
      ...item,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      tags: item.tags || [],
    };
    
    items.push(newItem);
    const success = await writeFile<ItemsData>(ITEMS_FILE, { items });
    
    return success ? newItem : null;
  } catch (error) {
    console.error('Error creating item:', error);
    return null;
  }
};

/**
 * Update an existing item
 */
export const updateItem = async (
  id: string,
  updates: Partial<Omit<InventoryItem, 'id'>>
): Promise<InventoryItem | null> => {
  try {
    const items = await getAllItems();
    const index = items.findIndex((item) => item.id === id);
    
    if (index === -1) {
      return null;
    }
    
    items[index] = { ...items[index], ...updates };
    const success = await writeFile<ItemsData>(ITEMS_FILE, { items });
    
    return success ? items[index] : null;
  } catch (error) {
    console.error('Error updating item:', error);
    return null;
  }
};

/**
 * Delete an item
 */
export const deleteItem = async (id: string): Promise<boolean> => {
  try {
    const items = await getAllItems();
    const filteredItems = items.filter((item) => item.id !== id);
    
    if (filteredItems.length === items.length) {
      return false; // Item not found
    }
    
    return await writeFile<ItemsData>(ITEMS_FILE, { items: filteredItems });
  } catch (error) {
    console.error('Error deleting item:', error);
    return false;
  }
};

/**
 * Search and filter items
 */
export const searchItems = async (
  query?: string,
  filters?: {
    category?: string;
    tags?: string[];
    expiringSoon?: boolean; // Items expiring within 7 days
  }
): Promise<InventoryItem[]> => {
  let items = await getAllItems();
  
  // Filter by category
  if (filters?.category && filters.category !== 'all') {
    items = items.filter((item) => item.category === filters.category);
  }
  
  // Filter by tags
  if (filters?.tags && filters.tags.length > 0) {
    items = items.filter((item) =>
      filters.tags!.some((tag) => item.tags?.includes(tag))
    );
  }
  
  // Filter by expiring soon
  if (filters?.expiringSoon) {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    items = items.filter((item) => {
      if (!item.expiryDate) return false;
      const expiryDate = new Date(item.expiryDate);
      return expiryDate <= sevenDaysFromNow && expiryDate >= now;
    });
  }
  
  // Search by query
  if (query && query.trim()) {
    const lowerQuery = query.toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.location.toLowerCase().includes(lowerQuery) ||
        item.detailedLocation.toLowerCase().includes(lowerQuery) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }
  
  return items;
};

