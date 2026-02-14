import { Settings, defaultSettings } from '../types/settings';
import { fileSystemService } from './FileSystemService';
import { storageLogger } from '../utils/Logger';

const SETTINGS_FILE = 'settings.json';

class SettingsService {
  public constructor() {}

  /**
   * Get current settings
   */
  async getSettings(userId?: string): Promise<Settings> {
    const settings = await fileSystemService.readFile<Settings>(SETTINGS_FILE, userId);
    return settings || defaultSettings as Settings;
  }

  /**
   * Update settings (supports partial updates)
   */
  async updateSettings(updates: Partial<Settings>, userId?: string): Promise<Settings | null> {
    try {
      const currentSettings = await this.getSettings(userId);
      const now = new Date().toISOString();
      const newSettings: Settings = {
        ...currentSettings,
        ...updates,
        updatedAt: now,
        createdAt: currentSettings.createdAt || now,
      };

      const success = await fileSystemService.writeFile<Settings>(SETTINGS_FILE, newSettings, userId);

      return success ? newSettings : null;
    } catch (error) {
      storageLogger.error('Error updating settings:', error);
      return null;
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetToDefaults(userId?: string): Promise<Settings | null> {
    try {
      const now = new Date().toISOString();
      const resetSettings: Settings = {
        ...defaultSettings,
        createdAt: now,
        updatedAt: now,
      };
      const success = await fileSystemService.writeFile<Settings>(SETTINGS_FILE, resetSettings, userId);

      return success ? resetSettings : null;
    } catch (error) {
      storageLogger.error('Error resetting settings:', error);
      return null;
    }
  }
}

export const settingsService = new SettingsService();
export type { SettingsService };
