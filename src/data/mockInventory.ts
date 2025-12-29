import { Category, InventoryItem } from '../types/inventory';

export const categories: Category[] = [
  { id: 'all', name: 'all', label: '全部', isCustom: false },
  { id: 'living-room', name: 'living-room', label: '客厅', isCustom: false },
  { id: 'kitchen', name: 'kitchen', label: '厨房', isCustom: false },
  { id: 'bedroom', name: 'bedroom', label: '卧室', isCustom: false },
  { id: 'study', name: 'study', label: '书房', isCustom: false },
  { id: 'storage', name: 'storage', label: '储物', isCustom: false },
];

export const mockInventoryItems: InventoryItem[] = [
  {
    id: '1',
    name: 'SK-II 神仙水',
    location: '主卧',
    detailedLocation: '梳妆台',
    icon: 'sparkles',
    iconColor: '#D81B60', // Deep pink
    price: 1540,
    amount: 2,
    category: 'bedroom',
    tags: ['化妆品', '护肤品'],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    purchaseDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
  },
  {
    id: '2',
    name: 'PS5 游戏机',
    location: '客厅',
    detailedLocation: '电视柜',
    icon: 'game-controller-outline',
    iconColor: '#DDA0DD', // Light purple
    price: 3500,
    category: 'living-room',
    tags: ['电子产品', '游戏'],
    purchaseDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(), // 120 days ago
  },
  {
    id: '3',
    name: '酷彩铸铁锅',
    location: '厨房',
    detailedLocation: '下层橱柜',
    icon: 'restaurant-outline',
    iconColor: '#FFA07A', // Light orange
    price: 1880,
    category: 'kitchen',
    tags: ['厨具', '烹饪'],
    purchaseDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 180 days ago
  },
  {
    id: '4',
    name: '戴森吹风机',
    location: '主卧',
    detailedLocation: '卫生间柜子',
    icon: 'cut-outline',
    iconColor: '#D3D3D3', // Light gray
    price: 2990,
    category: 'bedroom',
    tags: ['电器', '个人护理'],
    purchaseDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
  },
];

