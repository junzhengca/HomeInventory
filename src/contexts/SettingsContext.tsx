import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Settings, defaultSettings } from '../types/settings';
import { getSettings, updateSettings as updateSettingsService } from '../services/SettingsService';
import i18n from '../i18n/i18n';

interface SettingsContextType {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => Promise<boolean>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings = await getSettings();
        setSettings(loadedSettings);
        // Update i18n language when settings are loaded
        i18n.changeLanguage(loadedSettings.language);
      } catch (error) {
        console.error('Error loading settings:', error);
        // Use defaults if loading fails
        setSettings(defaultSettings);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = async (updates: Partial<Settings>): Promise<boolean> => {
    try {
      const updated = await updateSettingsService(updates);
      if (updated) {
        setSettings(updated);
        // Update i18n language when language setting changes
        if (updates.language) {
          i18n.changeLanguage(updates.language);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating settings:', error);
      return false;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

