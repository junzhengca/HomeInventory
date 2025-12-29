export interface Theme {
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    primaryLightest: string;
    primaryExtraLight: string;
    secondary: string;
    background: string;
    backgroundLight: string;
    surface: string;
    text: string;
    textSecondary: string;
    textLight: string;
    border: string;
    borderLight: string;
    inputFocus: string;
    error: string;
    errorLight: string;
    success: string;
    successLight: string;
    warning: string;
    notification: string;
  };
  typography: {
    fontFamily: {
      regular: string;
      medium: string;
      bold: string;
    };
    fontSize: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
      xxxl: number;
    };
    fontWeight: {
      regular: string;
      medium: string;
      bold: string;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    full: number;
  };
}

