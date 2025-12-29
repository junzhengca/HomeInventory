import { Theme } from './types';

// Base theme structure (typography, spacing, borderRadius are consistent)
const baseTheme = {
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
    fontSize: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
      xxl: 24,
      xxxl: 32,
    },
    fontWeight: {
      regular: '400',
      medium: '500',
      bold: '700',
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.8,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
  },
};

// Common colors that stay consistent across themes
const commonColors = {
  backgroundLight: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#424242',
  textSecondary: '#757575',
  textLight: '#9E9E9E',
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  error: '#D32F2F',
  errorLight: '#FFEBEE',
  success: '#388E3C',
  successLight: '#E8F5E9',
  warning: '#F57C00',
  notification: '#FFB300',
};

// Theme color palettes
const themePalettes: Record<string, Omit<Theme['colors'], keyof typeof commonColors>> = {
  'warm-sun': {
    primary: '#FF701E',
    primaryDark: '#E65100',
    primaryLight: '#FF9E66',
    primaryLightest: '#FFF9F2',
    primaryExtraLight: '#FFFEFA',
    secondary: '#FF9E66',
    background: '#FFF9F2',
    inputFocus: '#FFE0B2',
  },
  'ocean': {
    primary: '#2463EB',
    primaryDark: '#1E40AF',
    primaryLight: '#60A5FA',
    primaryLightest: '#F0F7FF',
    primaryExtraLight: '#F8FBFF',
    secondary: '#60A5FA',
    background: '#F0F7FF',
    inputFocus: '#BBDEFB',
  },
  'forest': {
    primary: '#00A67D',
    primaryDark: '#00796B',
    primaryLight: '#4DB6AC',
    primaryLightest: '#F1FBF9',
    primaryExtraLight: '#F8FEFC',
    secondary: '#4DB6AC',
    background: '#F1FBF9',
    inputFocus: '#C8E6C9',
  },
  'lilac': {
    primary: '#8B46FF',
    primaryDark: '#6A1B9A',
    primaryLight: '#B388FF',
    primaryLightest: '#FAF5FF',
    primaryExtraLight: '#FDFBFF',
    secondary: '#B388FF',
    background: '#FAF5FF',
    inputFocus: '#E1BEE7',
  },
};

/**
 * Generate a theme based on the theme ID
 * @param themeId - The theme identifier (e.g., 'warm-sun', 'ocean', 'forest', 'lilac')
 * @returns A complete Theme object
 */
export const generateTheme = (themeId: string): Theme => {
  // Default to 'forest' if theme ID is invalid
  const palette = themePalettes[themeId] || themePalettes['forest'];

  return {
    colors: {
      ...palette,
      ...commonColors,
    },
    ...baseTheme,
  };
};

