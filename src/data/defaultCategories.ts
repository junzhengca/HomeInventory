import { Category } from '../types/inventory';

// Item-type categories (used for categorizing items)
// Note: Default labels are in English and will be translated via i18n
export const itemCategories: Category[] = [
  { id: 'appliances', name: 'appliances', label: 'Appliances', isCustom: false, icon: 'desktop-outline', iconColor: '#4A90E2' },
  { id: 'kitchenware', name: 'kitchenware', label: 'Kitchenware', isCustom: false, icon: 'restaurant-outline', iconColor: '#FFA07A' },
  { id: 'digital', name: 'digital', label: 'Digital', isCustom: false, icon: 'phone-portrait-outline', iconColor: '#9B59B6' },
  { id: 'beauty', name: 'beauty', label: 'Beauty', isCustom: false, icon: 'sparkles', iconColor: '#D81B60' },
  { id: 'entertainment', name: 'entertainment', label: 'Entertainment', isCustom: false, icon: 'game-controller-outline', iconColor: '#DDA0DD' },
  { id: 'apparel', name: 'apparel', label: 'Apparel', isCustom: false, icon: 'shirt-outline', iconColor: '#E74C3C' },
  { id: 'home', name: 'home', label: 'Home', isCustom: false, icon: 'home-outline', iconColor: '#16A085' },
  { id: 'other', name: 'other', label: 'Other', isCustom: false, icon: 'cube-outline', iconColor: '#95A5A6' },
];

