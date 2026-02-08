import React from 'react';
import { TouchableOpacity, View, Text, ViewStyle } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import type { StyledProps, StyledPropsWith } from '../../utils/styledComponents';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps {
  onPress: () => void;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap | React.ReactNode;
  variant?: ButtonVariant;
  disabled?: boolean;
  iconColor?: string; // Optional custom icon color when using icon name
  fullWidth?: boolean; // If true, button takes full width; if false, uses flex: 1 in containers
  useGlass?: boolean; // If true, uses the glass effect (defaults to true)
}

const StyledButton = styled(TouchableOpacity).attrs({ activeOpacity: 0.7 }) <{ variant: ButtonVariant; disabled?: boolean; useGlass?: boolean }>`
  background-color: ${({ theme, variant, disabled, useGlass }: StyledPropsWith<{ variant: ButtonVariant; disabled?: boolean; useGlass?: boolean }>) =>
    disabled
      ? theme.colors.borderLight
      : useGlass
        ? 'transparent'
        : variant === 'primary'
          ? theme.colors.primary
          : 'transparent'};
  border-radius: 1000px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: 10px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-width: ${({ variant, disabled, useGlass }: { variant: ButtonVariant; disabled?: boolean; useGlass?: boolean }) =>
    (variant !== 'primary' && !disabled && !useGlass) ? 1.5 : 0}px;
  border-color: ${({ theme, variant }: StyledPropsWith<{ variant: ButtonVariant }>) =>
    variant === 'danger' ? theme.colors.error : theme.colors.border};
  width: 100%;
  height: 100%;
`;

const ButtonWrapper = styled(View) <{ fullWidth?: boolean }>`
  ${({ fullWidth }: { fullWidth?: boolean }) => fullWidth ? 'width: 100%;' : 'flex: 1;'}
  height: 44px;
`;

const IconContainer = styled(View)`
  width: 24px;
  height: 24px;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
  align-items: center;
  justify-content: center;
`;

const StyledIcon = styled(Ionicons) <{ variant: ButtonVariant; disabled?: boolean; color?: string; useGlass?: boolean }>`
  color: ${({ theme, variant, disabled, color, useGlass }: StyledPropsWith<{ variant: ButtonVariant; disabled?: boolean; color?: string; useGlass?: boolean }>) =>
    color
      ? color
      : disabled
        ? theme.colors.textSecondary
        : useGlass
          ? (variant === 'danger' ? theme.colors.error : variant === 'primary' ? theme.colors.primary : theme.colors.text)
          : variant === 'primary'
            ? theme.colors.surface
            : variant === 'danger'
              ? theme.colors.error
              : theme.colors.primary};
`;

const ButtonText = styled(Text) <{ variant: ButtonVariant; disabled?: boolean; useGlass?: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme, variant, disabled, useGlass }: StyledPropsWith<{ variant: ButtonVariant; disabled?: boolean; useGlass?: boolean }>) =>
    disabled
      ? theme.colors.textSecondary
      : useGlass
        ? (variant === 'danger' ? theme.colors.error : variant === 'primary' ? theme.colors.primary : theme.colors.text)
        : variant === 'primary'
          ? theme.colors.surface
          : variant === 'danger'
            ? theme.colors.error
            : theme.colors.text};
`;

export const Button: React.FC<ButtonProps> = ({
  onPress,
  label,
  icon,
  variant = 'secondary',
  disabled = false,
  iconColor,
  fullWidth = true,
  useGlass = true,
}) => {
  const theme = useTheme();

  const renderIcon = () => {
    if (!icon) return null;

    // If icon is a React element (custom icon), render it directly
    if (React.isValidElement(icon)) {
      return <IconContainer>{icon}</IconContainer>;
    }

    // Otherwise, it's an icon name string - render Ionicons
    return (
      <IconContainer>
        <StyledIcon
          name={icon as keyof typeof Ionicons.glyphMap}
          size={20}
          variant={variant}
          disabled={disabled}
          color={iconColor}
          useGlass={useGlass}
        />
      </IconContainer>
    );
  };

  const glassStyle: ViewStyle = {
    borderRadius: 1000,
    backgroundColor: disabled
      ? theme.colors.borderLight
      : variant === 'danger'
        ? theme.colors.error + '20'
        : variant === 'primary'
          ? theme.colors.primary + '20'
          : 'rgba(255, 255, 255, 0.05)',
    width: '100%',
    height: '100%',
  };

  if (useGlass) {
    return (
      <ButtonWrapper fullWidth={fullWidth}>
        <GlassView
          key={theme.colors.background}
          glassEffectStyle="regular"
          isInteractive={true}
          style={glassStyle}
        >
          <StyledButton
            onPress={onPress}
            variant={variant}
            disabled={disabled}
            useGlass={true}
          >
            {renderIcon()}
            <ButtonText variant={variant} disabled={disabled} useGlass={true}>{label}</ButtonText>
          </StyledButton>
        </GlassView>
      </ButtonWrapper>
    );
  }

  return (
    <ButtonWrapper fullWidth={fullWidth}>
      <StyledButton
        onPress={onPress}
        variant={variant}
        disabled={disabled}
        useGlass={false}
        style={{
          elevation: disabled ? 0 : 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: disabled ? 0 : 0.05,
          shadowRadius: 2,
        }}
      >
        {renderIcon()}
        <ButtonText variant={variant} disabled={disabled}>{label}</ButtonText>
      </StyledButton>
    </ButtonWrapper>
  );
};
