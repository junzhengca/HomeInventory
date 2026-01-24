import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import type { StyledProps, StyledPropsWith } from '../../utils/styledComponents';

export interface ButtonProps {
    onPress: () => void;
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
}

const StyledButton = styled(TouchableOpacity).attrs({ activeOpacity: 0.7 }) <{ variant: 'primary' | 'secondary'; disabled?: boolean }>`
  background-color: ${({ theme, variant, disabled }: StyledPropsWith<{ variant: 'primary' | 'secondary'; disabled?: boolean }>) =>
        disabled ? theme.colors.borderLight : variant === 'primary' ? theme.colors.primary : theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: 10px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-width: ${({ variant, disabled }: { variant: 'primary' | 'secondary'; disabled?: boolean }) =>
    (variant === 'secondary' && !disabled) ? 1 : 0}px;
  border-color: ${({ theme }: StyledProps) => theme.colors.border};
  elevation: ${({ disabled }: { disabled?: boolean }) => disabled ? 0 : 1};
  shadow-color: #000;
  shadow-offset: 0px 1px;
  shadow-opacity: ${({ disabled }: { disabled?: boolean }) => disabled ? 0 : 0.05};
  shadow-radius: 2px;
  width: 100%;
`;

const IconContainer = styled(View)`
  width: 24px;
  height: 24px;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
  align-items: center;
  justify-content: center;
`;

const StyledIcon = styled(Ionicons) <{ variant: 'primary' | 'secondary'; disabled?: boolean }>`
  color: ${({ theme, variant, disabled }: StyledPropsWith<{ variant: 'primary' | 'secondary'; disabled?: boolean }>) =>
        disabled
          ? theme.colors.textSecondary
          : variant === 'primary'
            ? theme.colors.surface
            : theme.colors.primary};
`;

const ButtonText = styled(Text) <{ variant: 'primary' | 'secondary'; disabled?: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme, variant, disabled }: StyledPropsWith<{ variant: 'primary' | 'secondary'; disabled?: boolean }>) =>
        disabled
          ? theme.colors.textSecondary
          : variant === 'primary'
            ? theme.colors.surface
            : theme.colors.text};
`;

export const Button: React.FC<ButtonProps> = ({
    onPress,
    label,
    icon,
    variant = 'secondary',
    disabled = false,
}) => {
    return (
        <StyledButton
            onPress={onPress}
            variant={variant}
            disabled={disabled}
        >
            {icon && (
                <IconContainer>
                    <StyledIcon name={icon} size={20} variant={variant} disabled={disabled} />
                </IconContainer>
            )}
            <ButtonText variant={variant} disabled={disabled}>{label}</ButtonText>
        </StyledButton>
    );
};
