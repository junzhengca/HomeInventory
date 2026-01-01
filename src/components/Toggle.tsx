import React from 'react';
import { Switch, SwitchProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface ToggleProps extends Omit<SwitchProps, 'trackColor' | 'thumbColor'> {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * Toggle - A custom toggle component that respects the theme system
 * Wraps the native Switch component with theme-aware colors
 */
export const Toggle: React.FC<ToggleProps> = ({ value, onValueChange, disabled = false, ...props }) => {
  const theme = useTheme();

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{
        false: theme.colors.border,
        true: theme.colors.primary,
      }}
      thumbColor={theme.colors.surface}
      ios_backgroundColor={theme.colors.border}
      {...props}
    />
  );
};

