/**
 * ID generation utilities
 */

/**
 * Generate a unique ID using timestamp and random string
 * @param prefix - Optional prefix for the ID (e.g., 'custom')
 * @returns Unique ID string
 */
export const generateId = (prefix?: string): string => {
  const timestamp = Date.now().toString();
  const randomStr = Math.random().toString(36).substring(2, 11);
  
  if (prefix) {
    return `${prefix}-${timestamp}-${randomStr}`;
  }
  
  return `${timestamp}${randomStr}`;
};

/**
 * Generate an ID for an inventory item
 * @returns Unique item ID
 */
export const generateItemId = (): string => {
  return generateId();
};

/**
 * Generate an ID for a todo item
 * @returns Unique todo ID
 */
export const generateTodoId = (): string => {
  return generateId();
};

/**
 * Generate an ID for a custom category
 * @returns Unique category ID with 'custom' prefix
 */
export const generateCategoryId = (): string => {
  return generateId('custom');
};

/**
 * Generate an ID for a location
 * @returns Unique location ID
 */
export const generateLocationId = (): string => {
  return generateId('loc');
};

