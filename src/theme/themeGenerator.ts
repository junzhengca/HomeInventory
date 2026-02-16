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
    md: 10,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
  },
};

// Common light mode colors
const commonLightColors = {
  backgroundLight: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#424242',
  textSecondary: '#757575',
  textLight: '#9E9E9E',
  border: '#E0E0E0',
  borderLight: '#F2F5F9',
  error: '#D32F2F',
  errorLight: '#FFEBEE',
  success: '#388E3C',
  successLight: '#E8F5E9',
  warning: '#F57C00',
  notification: '#FFB300',
  filterInactive: '#E9EDF4',
};

// Common dark mode colors
const commonDarkColors = {
  backgroundLight: '#1E1E1E',
  surface: '#2A2A2A',
  text: '#E0E0E0',
  textSecondary: '#B0B0B0',
  textLight: '#757575',
  border: '#3A3A3A',
  borderLight: '#333333',
  error: '#EF5350',
  errorLight: '#5C2B2B',
  success: '#66BB6A',
  successLight: '#2D4A31',
  warning: '#FFA726',
  notification: '#FFCA28',
  filterInactive: '#333333',
};

// Theme color palettes (light mode)
const themeLightPalettes: Record<
  string,
  Omit<Theme['colors'], keyof typeof commonLightColors>
> = {
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
  ocean: {
    primary: '#2463EB',
    primaryDark: '#1E40AF',
    primaryLight: '#60A5FA',
    primaryLightest: '#F0F7FF',
    primaryExtraLight: '#F8FBFF',
    secondary: '#60A5FA',
    background: '#F0F7FF',
    inputFocus: '#BBDEFB',
  },
  forest: {
    primary: '#00A67D',
    primaryDark: '#00796B',
    primaryLight: '#4DB6AC',
    primaryLightest: '#F1FBF9',
    primaryExtraLight: '#F8FEFC',
    secondary: '#4DB6AC',
    background: '#F1FBF9',
    inputFocus: '#C8E6C9',
  },
  lilac: {
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

// Theme color palettes (dark mode)
const themeDarkPalettes: Record<
  string,
  Omit<Theme['colors'], keyof typeof commonDarkColors>
> = {
  'warm-sun': {
    primary: '#FF8A50',
    primaryDark: '#FF701E',
    primaryLight: '#FFB388',
    primaryLightest: '#2D1E0A',
    primaryExtraLight: '#1A1205',
    secondary: '#FFB388',
    background: '#121209',
    inputFocus: '#4D3014',
  },
  ocean: {
    primary: '#4D82F5',
    primaryDark: '#2463EB',
    primaryLight: '#7DA3F7',
    primaryLightest: '#0A1428',
    primaryExtraLight: '#050C16',
    secondary: '#7DA3F7',
    background: '#0A0E14',
    inputFocus: '#1A2840',
  },
  forest: {
    primary: '#26C09B',
    primaryDark: '#00A67D',
    primaryLight: '#5DD4B5',
    primaryLightest: '#051A12',
    primaryExtraLight: '#020F09',
    secondary: '#5DD4B5',
    background: '#080F0D',
    inputFocus: '#0F2E24',
  },
  lilac: {
    primary: '#A46DFF',
    primaryDark: '#8B46FF',
    primaryLight: '#B99DFF',
    primaryLightest: '#1A0D28',
    primaryExtraLight: '#0E0616',
    secondary: '#B99DFF',
    background: '#0E0815',
    inputFocus: '#2D1A40',
  },
};

/**
 * Generate a theme based on the theme ID and dark mode setting
 * @param themeId - The theme identifier (e.g., 'warm-sun', 'ocean', 'forest', 'lilac')
 * @param darkMode - Whether to use dark mode colors
 * @returns A complete Theme object
 */
export const generateTheme = (
  themeId: string,
  darkMode: boolean = false
): Theme => {
  // Default to 'forest' if theme ID is invalid
  const palette = darkMode
    ? themeDarkPalettes[themeId] || themeDarkPalettes['forest']
    : themeLightPalettes[themeId] || themeLightPalettes['forest'];

  const commonColors = darkMode ? commonDarkColors : commonLightColors;

  return {
    colors: {
      ...palette,
      ...commonColors,
    },
    ...baseTheme,
  };
};
