import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import type { StyledProps } from '../../utils/styledComponents';

export interface SettingsTextButtonProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: 'default' | 'destructive';
}

const Button = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const Icon = styled(Ionicons)<{ variant?: 'default' | 'destructive' }>`
  color: ${({ theme, variant }: StyledProps & { variant?: 'default' | 'destructive' }) =>
    variant === 'destructive' ? theme.colors.error : theme.colors.textSecondary};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const ButtonText = styled(Text)<{ variant?: 'default' | 'destructive' }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.regular};
  color: ${({ theme, variant }: StyledProps & { variant?: 'default' | 'destructive' }) =>
    variant === 'destructive' ? theme.colors.error : theme.colors.text};
`;

export const SettingsTextButton: React.FC<SettingsTextButtonProps> = ({
  label,
  icon,
  onPress,
  variant = 'default',
}) => {
  return (
    <Button onPress={onPress} activeOpacity={0.7}>
      {icon && <Icon name={icon} size={20} variant={variant} />}
      <ButtonText variant={variant}>{label}</ButtonText>
    </Button>
  );
};
