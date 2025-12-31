export interface Settings {
  theme: string; // Selected theme ID
  currency: string; // Selected currency ID
  language: string; // Selected language ID
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
}

// Note: defaultSettings does not include timestamps as they are set on first use
export const defaultSettings: Omit<Settings, 'createdAt' | 'updatedAt'> = {
  theme: 'forest',
  currency: 'cny',
  language: 'zh-cn',
};

