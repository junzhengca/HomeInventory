import { Settings, defaultSettings } from '../types/settings';
import { readFile, writeFile } from './FileSystemService';

const SETTINGS_FILE = 'settings.json';

/**
 * Get current settings
 */
export const getSettings = async (): Promise<Settings> => {
  const settings = await readFile<Settings>(SETTINGS_FILE);
  return settings || defaultSettings;
};

/**
 * Update settings (supports partial updates)
 */
export const updateSettings = async (updates: Partial<Settings>): Promise<Settings | null> => {
  try {
    const currentSettings = await getSettings();
    const newSettings: Settings = {
      ...currentSettings,
      ...updates,
    };
    
    const success = await writeFile<Settings>(SETTINGS_FILE, newSettings);
    return success ? newSettings : null;
  } catch (error) {
    console.error('Error updating settings:', error);
    return null;
  }
};

/**
 * Reset settings to defaults
 */
export const resetToDefaults = async (): Promise<Settings | null> => {
  try {
    const success = await writeFile<Settings>(SETTINGS_FILE, defaultSettings);
    return success ? defaultSettings : null;
  } catch (error) {
    console.error('Error resetting settings:', error);
    return null;
  }
};

