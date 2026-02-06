import { Settings, defaultSettings } from '../types/settings';
import { readFile, writeFile } from './FileSystemService';
import { storageLogger } from '../utils/Logger';

const SETTINGS_FILE = 'settings.json';

/**
 * Get current settings
 */
export const getSettings = async (userId?: string): Promise<Settings> => {
  const settings = await readFile<Settings>(SETTINGS_FILE, userId);
  return settings || defaultSettings as Settings;
};

/**
 * Update settings (supports partial updates)
 */
export const updateSettings = async (updates: Partial<Settings>, userId?: string): Promise<Settings | null> => {
  try {
    const currentSettings = await getSettings(userId);
    const now = new Date().toISOString();
    const newSettings: Settings = {
      ...currentSettings,
      ...updates,
      updatedAt: now,
      createdAt: currentSettings.createdAt || now,
    };

    const success = await writeFile<Settings>(SETTINGS_FILE, newSettings, userId);

    return success ? newSettings : null;
  } catch (error) {
    storageLogger.error('Error updating settings:', error);
    return null;
  }
};

/**
 * Reset settings to defaults
 */
export const resetToDefaults = async (userId?: string): Promise<Settings | null> => {
  try {
    const now = new Date().toISOString();
    const resetSettings: Settings = {
      ...defaultSettings,
      createdAt: now,
      updatedAt: now,
    };
    const success = await writeFile<Settings>(SETTINGS_FILE, resetSettings, userId);

    return success ? resetSettings : null;
  } catch (error) {
    storageLogger.error('Error resetting settings:', error);
    return null;
  }
};

