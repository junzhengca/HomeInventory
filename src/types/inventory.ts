import { Ionicons } from '@expo/vector-icons';

export interface Category {
  id: string;
  name: string;
  label: string; // Chinese label
  isCustom: boolean; // Flag to distinguish system vs user-created categories
  createdAt?: string; // ISO date string for custom categories
}

export interface InventoryItem {
  id: string;
  name: string;
  location: string; // e.g., "主卧"
  detailedLocation: string; // e.g., "梳妆台"
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  price: number;
  amount?: number; // Optional quantity
  category: string; // Category ID
  tags: string[]; // Array of tag strings
  expiryDate?: string; // ISO date string (optional)
  purchaseDate?: string; // ISO date string (optional)
}

