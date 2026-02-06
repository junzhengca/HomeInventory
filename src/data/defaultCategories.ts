import { Category } from '../types/inventory';

// Item-type categories (used for categorizing items)
// Note: Default labels are in English and will be translated via i18n
const SYSTEM_TIMESTAMP = '1970-01-01T00:00:00.000Z';

export const itemCategories: Omit<Category, 'homeId'>[] = [
  { id: 'appliances', name: 'appliances', label: 'Appliances', isCustom: false, icon: 'desktop-outline', createdAt: SYSTEM_TIMESTAMP, updatedAt: SYSTEM_TIMESTAMP, version: 1, clientUpdatedAt: SYSTEM_TIMESTAMP },
  { id: 'kitchenware', name: 'kitchenware', label: 'Kitchenware', isCustom: false, icon: 'restaurant-outline', createdAt: SYSTEM_TIMESTAMP, updatedAt: SYSTEM_TIMESTAMP, version: 1, clientUpdatedAt: SYSTEM_TIMESTAMP },
  { id: 'digital', name: 'digital', label: 'Digital', isCustom: false, icon: 'phone-portrait-outline', createdAt: SYSTEM_TIMESTAMP, updatedAt: SYSTEM_TIMESTAMP, version: 1, clientUpdatedAt: SYSTEM_TIMESTAMP },
  { id: 'beauty', name: 'beauty', label: 'Beauty', isCustom: false, icon: 'sparkles', createdAt: SYSTEM_TIMESTAMP, updatedAt: SYSTEM_TIMESTAMP, version: 1, clientUpdatedAt: SYSTEM_TIMESTAMP },
  { id: 'entertainment', name: 'entertainment', label: 'Entertainment', isCustom: false, icon: 'game-controller-outline', createdAt: SYSTEM_TIMESTAMP, updatedAt: SYSTEM_TIMESTAMP, version: 1, clientUpdatedAt: SYSTEM_TIMESTAMP },
  { id: 'apparel', name: 'apparel', label: 'Apparel', isCustom: false, icon: 'shirt-outline', createdAt: SYSTEM_TIMESTAMP, updatedAt: SYSTEM_TIMESTAMP, version: 1, clientUpdatedAt: SYSTEM_TIMESTAMP },
  { id: 'home', name: 'home', label: 'Home', isCustom: false, icon: 'home-outline', createdAt: SYSTEM_TIMESTAMP, updatedAt: SYSTEM_TIMESTAMP, version: 1, clientUpdatedAt: SYSTEM_TIMESTAMP },
  { id: 'other', name: 'other', label: 'Other', isCustom: false, icon: 'cube-outline', createdAt: SYSTEM_TIMESTAMP, updatedAt: SYSTEM_TIMESTAMP, version: 1, clientUpdatedAt: SYSTEM_TIMESTAMP },
];

