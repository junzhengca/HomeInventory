/**
 * Comprehensive unit tests for SettingsService
 *
 * Tests cover:
 * - getSettings
 * - updateSettings
 * - resetToDefaults
 * - Edge cases and error handling
 */

// Mock dependencies before importing SettingsService
const mockFileSystemService = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
};

jest.mock('./FileSystemService', () => ({
  fileSystemService: mockFileSystemService,
}));

// Mock logger to avoid console output
jest.mock('../utils/Logger', () => ({
  storageLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    verbose: jest.fn(),
  },
}));

// Import SettingsService after mocks are set up
import { settingsService } from './SettingsService';
import { Settings } from '../types/settings';

describe('SettingsService', () => {
  const createMockSettings = (overrides?: Partial<Settings>): Settings => ({
    theme: 'forest',
    currency: 'cny',
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
    it('should return settings when file exists', async () => {
      const settings = createMockSettings();
      mockFileSystemService.readFile.mockResolvedValue(settings);

      const result = await settingsService.getSettings();

      expect(result).toEqual(settings);
    });

    it('should return default settings when file does not exist', async () => {
      mockFileSystemService.readFile.mockResolvedValue(null);

      const result = await settingsService.getSettings();

      expect(result.theme).toBe('forest');
      expect(result.currency).toBe('cny');
      expect(result.language).toBe('en');
      expect(result.darkMode).toBe(false);
    });

    it('should accept optional userId parameter', async () => {
      const settings = createMockSettings();
      mockFileSystemService.readFile.mockResolvedValue(settings);

      await settingsService.getSettings('user-123');

      expect(mockFileSystemService.readFile).toHaveBeenCalledWith('settings.json', 'user-123');
    });

    it('should work without userId parameter', async () => {
      const settings = createMockSettings();
      mockFileSystemService.readFile.mockResolvedValue(settings);

      await settingsService.getSettings();

      expect(mockFileSystemService.readFile).toHaveBeenCalledWith('settings.json', undefined);
    });
  });

  // ===========================================================================
  // updateSettings
  // ===========================================================================

  describe('updateSettings', () => {
    it('should update existing settings', async () => {
      const currentSettings = createMockSettings();
      mockFileSystemService.readFile.mockResolvedValue(currentSettings);
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await settingsService.updateSettings({
        theme: 'ocean',
        darkMode: true,
      });

      expect(result).not.toBeNull();
      expect(result?.theme).toBe('ocean');
      expect(result?.darkMode).toBe(true);
      expect(result?.currency).toBe('cny'); // Unchanged
      expect(result?.language).toBe('en'); // Unchanged
      expect(result?.updatedAt).toBeDefined();
    });

    it('should create settings if none exist', async () => {
      mockFileSystemService.readFile.mockResolvedValue(null);
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await settingsService.updateSettings({
        language: 'zh-CN',
      });

      expect(result).not.toBeNull();
      expect(result?.theme).toBe('forest'); // Default
      expect(result?.currency).toBe('cny'); // Default
      expect(result?.language).toBe('zh-CN'); // Updated
      expect(result?.darkMode).toBe(false); // Default
      expect(result?.createdAt).toBeDefined();
    });

    it('should preserve createdAt when updating', async () => {
      const currentSettings = createMockSettings({
        createdAt: '2020-01-01T00:00:00.000Z',
      });
      mockFileSystemService.readFile.mockResolvedValue(currentSettings);
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await settingsService.updateSettings({
        theme: 'ocean',
      });

      expect(result).not.toBeNull();
      expect(result?.createdAt).toBe('2020-01-01T00:00:00.000Z');
      expect(result?.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
    });

    it('should set createdAt and updatedAt for new settings', async () => {
      mockFileSystemService.readFile.mockResolvedValue(null);
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await settingsService.updateSettings({});

      expect(result).not.toBeNull();
      expect(result?.createdAt).toBeDefined();
      expect(result?.updatedAt).toBeDefined();
      expect(result?.updatedAt).toBe(result?.createdAt);
    });

    it('should return null on write failure', async () => {
      const currentSettings = createMockSettings();
      mockFileSystemService.readFile.mockResolvedValue(currentSettings);
      mockFileSystemService.writeFile.mockResolvedValue(false);

      const result = await settingsService.updateSettings({
        theme: 'ocean',
      });

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockFileSystemService.readFile.mockRejectedValue(new Error('Read error'));

      const result = await settingsService.updateSettings({
        theme: 'ocean',
      });

      expect(result).toBeNull();
    });

    it('should accept optional userId parameter', async () => {
      const currentSettings = createMockSettings();
      mockFileSystemService.readFile.mockResolvedValue(currentSettings);
      mockFileSystemService.writeFile.mockResolvedValue(true);

      await settingsService.updateSettings({ theme: 'ocean' }, 'user-123');

      expect(mockFileSystemService.readFile).toHaveBeenCalledWith('settings.json', 'user-123');
      expect(mockFileSystemService.writeFile).toHaveBeenCalledWith('settings.json', expect.anything(), 'user-123');
    });
  });

  // ===========================================================================
  // resetToDefaults
  // ===========================================================================

  describe('resetToDefaults', () => {
    it('should reset to default settings', async () => {
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await settingsService.resetToDefaults();

      expect(result).not.toBeNull();
      expect(result?.theme).toBe('forest');
      expect(result?.currency).toBe('cny');
      expect(result?.language).toBe('en');
      expect(result?.darkMode).toBe(false);
    });

    it('should set new timestamps', async () => {
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await settingsService.resetToDefaults();

      expect(result).not.toBeNull();
      expect(result?.createdAt).toBeDefined();
      expect(result?.updatedAt).toBeDefined();
    });

    it('should return null on write failure', async () => {
      mockFileSystemService.writeFile.mockResolvedValue(false);

      const result = await settingsService.resetToDefaults();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockFileSystemService.writeFile.mockRejectedValue(new Error('Write error'));

      const result = await settingsService.resetToDefaults();

      expect(result).toBeNull();
    });

    it('should accept optional userId parameter', async () => {
      mockFileSystemService.writeFile.mockResolvedValue(true);

      await settingsService.resetToDefaults('user-123');

      expect(mockFileSystemService.writeFile).toHaveBeenCalledWith('settings.json', expect.anything(), 'user-123');
    });

    it('should work without userId parameter', async () => {
      mockFileSystemService.writeFile.mockResolvedValue(true);

      await settingsService.resetToDefaults();

      expect(mockFileSystemService.writeFile).toHaveBeenCalledWith('settings.json', expect.anything(), undefined);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty updates', async () => {
      const currentSettings = createMockSettings();
      mockFileSystemService.readFile.mockResolvedValue(currentSettings);
      mockFileSystemService.writeFile.mockResolvedValue(true);

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
      mockFileSystemService.readFile.mockResolvedValue(currentSettings);
      mockFileSystemService.writeFile.mockResolvedValue(true);

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

    it('should handle undefined userId gracefully', async () => {
      const currentSettings = createMockSettings();
      mockFileSystemService.readFile.mockResolvedValue(currentSettings);
      mockFileSystemService.writeFile.mockResolvedValue(true);

      const result = await settingsService.updateSettings({}, undefined);

      expect(result).toBeDefined();
      expect(mockFileSystemService.readFile).toHaveBeenCalledWith('settings.json', undefined);
    });
  });
});
