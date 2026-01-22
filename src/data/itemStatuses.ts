export interface ItemStatus {
  id: string;
  name: string; // Chinese label (will be i18n'd in future)
}

export const itemStatuses: ItemStatus[] = [
  { id: 'using', name: '使用中' },
  { id: 'new', name: '全新' },
  { id: 'out-of-stock', name: '缺货' },
];
