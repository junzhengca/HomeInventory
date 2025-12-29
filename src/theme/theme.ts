import { Theme } from './types';

export const theme: Theme = {
  colors: {
    primary: '#00897B', // Teal green from screenshot
    primaryDark: '#00695C',
    primaryLight: '#4DB6AC',
    primaryLightest: '#F1FBF9', // Light background for header
    primaryExtraLight: '#F8FEFC', // Extra light for icon containers
    secondary: '#81C784',
    background: '#F1FBF9',
    backgroundLight: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#424242', // Professional dark grey
    textSecondary: '#757575',
    textLight: '#9E9E9E',
    border: '#E0E0E0',
    borderLight: '#F0F0F0',
    inputFocus: '#B2F5EA',
    error: '#D32F2F',
    errorLight: '#FFEBEE',
    success: '#388E3C',
    successLight: '#E8F5E9',
    warning: '#F57C00',
    notification: '#FFB300', // Yellow badge
  },
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

