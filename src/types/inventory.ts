import { Ionicons } from '@expo/vector-icons';

/**
 * Base type for all syncable, home-scoped entities.
 * All entities that sync to server must extend this type.
 */
export interface HomeScopedEntity {
  id: string;
  homeId: string;
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
  deletedAt?: string; // ISO date string - marks soft deletion

  // Sync metadata
  version: number;
  clientUpdatedAt: string;
  serverUpdatedAt?: string;
  lastSyncedAt?: string;
  pendingCreate?: boolean;
  pendingUpdate?: boolean;
  pendingDelete?: boolean;
}

export interface Category extends HomeScopedEntity {
  name: string;
  label?: string; // Chinese label - making optional/deprecated as name will be used
  isCustom: boolean; // Flag to distinguish system vs user-created categories
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string; // Hex color code for category display
}

export interface Location extends HomeScopedEntity {
  name: string; // Chinese label (will be i18n'd in future)
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

export interface InventoryItem extends HomeScopedEntity {
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

export interface TodoItem extends HomeScopedEntity {
  text: string;
  completed: boolean;
  note?: string; // Optional note field
  categoryId?: string; // Optional reference to TodoCategory
}

export interface TodoCategory extends HomeScopedEntity {
  name: string;
}
