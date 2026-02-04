import { SyncMetadata } from './inventory';

export interface Settings extends SyncMetadata {
  theme: string; // Selected theme ID
  currency: string; // Selected currency ID
  language: string; // Selected language ID
  darkMode: boolean; // Dark mode toggle
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
}

// Note: defaultSettings does not include timestamps as they are set on first use
export const defaultSettings: Omit<Settings, keyof SyncMetadata> = {
  theme: 'forest',
  currency: 'cny',
  language: 'en',
  darkMode: false,
};

