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
  /** Use smaller bottom margin (e.g. when followed by more content in same card) */
  compactBottom?: boolean;
  /** Remove bottom margin (e.g. when this is the last item in the section) */
  noMarginBottom?: boolean;
}

const Button = styled(TouchableOpacity)<{ compactBottom?: boolean; noMarginBottom?: boolean }>`
  flex-direction: row;
  align-items: center;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  margin-bottom: ${({ theme, compactBottom, noMarginBottom }: StyledProps & { compactBottom?: boolean; noMarginBottom?: boolean }) =>
    noMarginBottom ? 0 : compactBottom ? theme.spacing.sm : theme.spacing.md}px;
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
  compactBottom = false,
  noMarginBottom = false,
}) => {
  return (
    <Button onPress={onPress} activeOpacity={0.7} compactBottom={compactBottom} noMarginBottom={noMarginBottom}>
      {icon && <Icon name={icon} size={20} variant={variant} />}
      <ButtonText variant={variant}>{label}</ButtonText>
    </Button>
  );
};
