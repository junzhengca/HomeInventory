/**
 * Comprehensive unit tests for SettingsService
 *
 * Tests cover:
 * - getSettings
 * - updateSettings
 * - resetToDefaults
 * - Edge cases and error handling
 */

import { settingsService } from './SettingsService';
import { Settings } from '../types/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock logger to avoid console output
jest.mock('../utils/Logger', () => ({
  storageLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    verbose: jest.fn(),
  },
}));

describe('SettingsService', () => {
  const createMockSettings = (overrides?: Partial<Settings>): Settings => ({
    theme: 'ocean',
    currency: 'usd',
    language: 'en',
    darkMode: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // getSettings
  // ===========================================================================

  describe('getSettings', () => {
    it('should return settings when storage has data', async () => {
      const settings = createMockSettings();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(settings));

      const result = await settingsService.getSettings();

      expect(result.theme).toBe(settings.theme);
      expect(result.currency).toBe(settings.currency);
      expect(result.language).toBe(settings.language);
      expect(result.darkMode).toBe(settings.darkMode);
      expect(result.createdAt).toBe(settings.createdAt);
      expect(result.updatedAt).toBe(settings.updatedAt);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('app_settings');
    });

    it('should return default settings when storage is empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await settingsService.getSettings();

      expect(result.theme).toBe('ocean');
      expect(result.currency).toBe('usd');
      expect(result.language).toBe('en');
      expect(result.darkMode).toBe(false);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should merge stored settings with defaults', async () => {
      const partialSettings = { theme: 'ocean', currency: 'usd' };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(partialSettings));

      const result = await settingsService.getSettings();

      expect(result.theme).toBe('ocean');
      expect(result.currency).toBe('usd');
      expect(result.language).toBe('en'); // Default
      expect(result.darkMode).toBe(false); // Default
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should return defaults on storage error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await settingsService.getSettings();

      expect(result.theme).toBe('ocean');
      expect(result.currency).toBe('usd');
      expect(result.language).toBe('en');
      expect(result.darkMode).toBe(false);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  // ===========================================================================
  // updateSettings
  // ===========================================================================

  describe('updateSettings', () => {
    it('should update existing settings', async () => {
      const currentSettings = createMockSettings();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentSettings));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await settingsService.updateSettings({
        theme: 'ocean',
        darkMode: true,
      });

      expect(result).not.toBeNull();
      expect(result?.theme).toBe('ocean');
      expect(result?.darkMode).toBe(true);
      expect(result?.currency).toBe('usd'); // Unchanged
      expect(result?.language).toBe('en'); // Unchanged
      expect(result?.createdAt).toBe(currentSettings.createdAt); // Preserved
      expect(result?.updatedAt).toBeDefined();
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should create settings if none exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await settingsService.updateSettings({
        language: 'zh-CN',
      });

      expect(result).not.toBeNull();
      expect(result?.theme).toBe('ocean'); // Default
      expect(result?.currency).toBe('usd'); // Default
      expect(result?.language).toBe('zh-CN'); // Updated
      expect(result?.darkMode).toBe(false); // Default
      expect(result?.createdAt).toBeDefined();
    });

    it('should preserve createdAt when updating', async () => {
      const currentSettings = createMockSettings({
        createdAt: '2020-01-01T00:00:00.000Z',
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentSettings));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await settingsService.updateSettings({
        theme: 'ocean',
      });

      expect(result).not.toBeNull();
      expect(result?.createdAt).toBe('2020-01-01T00:00:00.000Z');
      expect(result?.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
    });

    it('should set createdAt and updatedAt for new settings', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await settingsService.updateSettings({});

      expect(result).not.toBeNull();
      expect(result?.createdAt).toBeDefined();
      expect(result?.updatedAt).toBeDefined();
    });

    it('should return null on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(createMockSettings()));
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Write error'));

      const result = await settingsService.updateSettings({
        theme: 'ocean',
      });

      expect(result).toBeNull();
    });

    it('should handle partial updates correctly', async () => {
      const currentSettings = createMockSettings();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentSettings));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await settingsService.updateSettings({ darkMode: true });

      expect(result?.darkMode).toBe(true);
      expect(result?.theme).toBe('ocean'); // Unchanged
      expect(result?.currency).toBe('usd'); // Unchanged
      expect(result?.language).toBe('en'); // Unchanged
    });
  });

  // ===========================================================================
  // resetToDefaults
  // ===========================================================================

  describe('resetToDefaults', () => {
    it('should reset to default settings', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await settingsService.resetToDefaults();

      expect(result).not.toBeNull();
      expect(result?.theme).toBe('ocean');
      expect(result?.currency).toBe('usd');
      expect(result?.language).toBe('en');
      expect(result?.darkMode).toBe(false);
    });

    it('should set new timestamps', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await settingsService.resetToDefaults();

      expect(result).not.toBeNull();
      expect(result?.createdAt).toBeDefined();
      expect(result?.updatedAt).toBeDefined();
    });

    it('should return null on error', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Write error'));

      const result = await settingsService.resetToDefaults();

      expect(result).toBeNull();
    });

    it('should write to AsyncStorage with correct key', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await settingsService.resetToDefaults();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('app_settings', expect.stringContaining('"theme":"ocean"'));
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty updates', async () => {
      const currentSettings = createMockSettings();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentSettings));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await settingsService.updateSettings({});

      expect(result).not.toBeNull();
      // Empty update still updates the updatedAt timestamp
      expect(result?.theme).toBe(currentSettings.theme);
      expect(result?.currency).toBe(currentSettings.currency);
      expect(result?.language).toBe(currentSettings.language);
      expect(result?.darkMode).toBe(currentSettings.darkMode);
      expect(result?.createdAt).toBe(currentSettings.createdAt);
      expect(result?.updatedAt).not.toBe(currentSettings.updatedAt);
    });

    it('should handle all settings being updated', async () => {
      const currentSettings = createMockSettings();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(currentSettings));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await settingsService.updateSettings({
        theme: 'ocean',
        currency: 'usd',
        language: 'zh-CN',
        darkMode: true,
      });

      expect(result).not.toBeNull();
      expect(result?.theme).toBe('ocean');
      expect(result?.currency).toBe('usd');
      expect(result?.language).toBe('zh-CN');
      expect(result?.darkMode).toBe(true);
    });

    it('should handle invalid JSON in storage gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const result = await settingsService.getSettings();

      // Should return defaults on parse error
      expect(result.theme).toBe('ocean');
      expect(result.currency).toBe('usd');
      expect(result.language).toBe('en');
      expect(result.darkMode).toBe(false);
    });
  });
});
