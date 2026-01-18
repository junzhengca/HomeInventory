import { Ionicons } from '@expo/vector-icons';

export interface Category {
  id: string;
  name: string;
  label: string; // Chinese label
  isCustom: boolean; // Flag to distinguish system vs user-created categories
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
  deletedAt?: string; // ISO date string - marks soft deletion
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

export interface Location {
  id: string;
  name: string; // Chinese label (will be i18n'd in future)
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
  deletedAt?: string; // ISO date string - marks soft deletion
}

export interface InventoryItem {
  id: string;
  name: string;
  location: string; // Location ID (e.g., "living-room")
  detailedLocation: string; // e.g., "梳妆台"
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  price: number;
  amount?: number; // Optional quantity
  category: string; // Category ID
  tags: string[]; // Array of tag strings
  expiryDate?: string; // ISO date string (optional)
  purchaseDate?: string; // ISO date string (optional)
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
  deletedAt?: string; // ISO date string - marks soft deletion
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  note?: string; // Optional note field
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
  deletedAt?: string; // ISO date string - marks soft deletion
}

