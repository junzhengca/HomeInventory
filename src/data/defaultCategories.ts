import { Category } from '../types/inventory';

// Item-type categories (used for categorizing items)
// Note: Default labels are in English and will be translated via i18n
const SYSTEM_TIMESTAMP = '1970-01-01T00:00:00.000Z';

export const itemCategories: Category[] = [
  { id: 'appliances', name: 'appliances', label: 'Appliances', isCustom: false, icon: 'desktop-outline', iconColor: '#4A90E2', createdAt: SYSTEM_TIMESTAMP, updatedAt: SYSTEM_TIMESTAMP },
  { id: 'kitchenware', name: 'kitchenware', label: 'Kitchenware', isCustom: false, icon: 'restaurant-outline', iconColor: '#FFA07A', createdAt: SYSTEM_TIMESTAMP, updatedAt: SYSTEM_TIMESTAMP },
  { id: 'digital', name: 'digital', label: 'Digital', isCustom: false, icon: 'phone-portrait-outline', iconColor: '#9B59B6', createdAt: SYSTEM_TIMESTAMP, updatedAt: SYSTEM_TIMESTAMP },
  { id: 'beauty', name: 'beauty', label: 'Beauty', isCustom: false, icon: 'sparkles', iconColor: '#D81B60', createdAt: SYSTEM_TIMESTAMP, updatedAt: SYSTEM_TIMESTAMP },
  { id: 'entertainment', name: 'entertainment', label: 'Entertainment', isCustom: false, icon: 'game-controller-outline', iconColor: '#DDA0DD', createdAt: SYSTEM_TIMESTAMP, updatedAt: SYSTEM_TIMESTAMP },
  { id: 'apparel', name: 'apparel', label: 'Apparel', isCustom: false, icon: 'shirt-outline', iconColor: '#E74C3C', createdAt: SYSTEM_TIMESTAMP, updatedAt: SYSTEM_TIMESTAMP },
  { id: 'home', name: 'home', label: 'Home', isCustom: false, icon: 'home-outline', iconColor: '#16A085', createdAt: SYSTEM_TIMESTAMP, updatedAt: SYSTEM_TIMESTAMP },
  { id: 'other', name: 'other', label: 'Other', isCustom: false, icon: 'cube-outline', iconColor: '#95A5A6', createdAt: SYSTEM_TIMESTAMP, updatedAt: SYSTEM_TIMESTAMP },
];

