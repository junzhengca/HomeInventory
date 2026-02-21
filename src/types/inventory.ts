import { Ionicons } from '@expo/vector-icons';

/**
 * Base type for all home-scoped entities using direct CRUD endpoints.
 */
export interface HomeScopedCrudEntity {
  id: string;
  homeId: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface InventoryCategory extends HomeScopedCrudEntity {
  name: string;
  label?: string; // Deprecated - use name instead (kept for backward compatibility)
  description?: string;
  isCustom?: boolean; // Flag to distinguish system vs user-created categories
  icon?: string; // Icon name
  color?: string; // Hex color code for category display
}

// Backward compatibility alias
export type Category = InventoryCategory;

/** Location has no position; order comes from the server. */
export interface Location extends HomeScopedCrudEntity {
  name: string; // Location name
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface ItemBatch {
  id: string;              // UUID, generated client-side
  amount: number;          // Quantity in this batch
  unit?: string;           // Unit of measurement (e.g. "kg", "pcs", "bottles")
  expiryDate?: string;     // ISO date string
  purchaseDate?: string;   // ISO date string
  price?: number;          // Price paid for this batch
  vendor?: string;         // Where it was purchased
  note?: string;           // Optional note for this batch
  createdAt: string;       // ISO date string
}

export interface InventoryItem extends HomeScopedCrudEntity {
  name: string;
  location: string; // Location ID (e.g., "living-room")
  detailedLocation: string; // e.g., "梳妆台"
  status: string; // Status ID (e.g., "using", "new", "out-of-stock")
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  warningThreshold?: number; // Warning threshold for restocking badge (defaults to 0)
  batches: ItemBatch[];      // Purchase batches
  categoryId?: string;
}

export interface TodoItem extends HomeScopedCrudEntity {
  text: string;
  completed: boolean;
  completedAt?: string | null; // ISO date string when completed
  position?: number; // Position for ordering
  note?: string; // Optional note field
  categoryId?: string; // Optional reference to TodoCategory
}

export interface TodoCategory extends HomeScopedCrudEntity {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  position?: number;
}
