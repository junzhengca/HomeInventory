import { Ionicons } from '@expo/vector-icons';

export interface Category {
  id: string;
  name: string;
  label?: string; // Chinese label - making optional/deprecated as name will be used
  isCustom: boolean; // Flag to distinguish system vs user-created categories
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string; // Hex color code for category display
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

export interface Location {
  id: string;
  name: string; // Chinese label (will be i18n'd in future)
  homeId: string;
  icon?: keyof typeof Ionicons.glyphMap;

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

export interface InventoryItem {
  id: string;
  name: string;
  location: string; // Location ID (e.g., "living-room")
  detailedLocation: string; // e.g., "梳妆台"
  status: string; // Status ID (e.g., "using", "new", "out-of-stock")
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  warningThreshold?: number; // Warning threshold for restocking badge (defaults to 0)
  batches: ItemBatch[];      // Purchase batches
  categoryId?: string;
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

export interface TodoItem {
  id: string;
  homeId: string; // Home this todo belongs to
  text: string;
  completed: boolean;
  note?: string; // Optional note field
  createdAt: string; // ISO date string
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

