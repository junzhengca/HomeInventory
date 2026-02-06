import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import type { StyledProps } from '../../utils/styledComponents';

export interface SettingsItemProps {
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    variant?: 'default' | 'destructive';
}

const Button = styled(TouchableOpacity)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.border};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  elevation: 1;
  shadow-color: #000;
  shadow-offset: 0px 1px;
  shadow-opacity: 0.05;
  shadow-radius: 2px;
`;

const IconContainer = styled(View)`
  width: 24px;
  height: 24px;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
  align-items: center;
  justify-content: center;
`;

const Icon = styled(Ionicons) <{ variant?: 'default' | 'destructive' }>`
  color: ${({ theme, variant }: StyledProps & { variant?: 'default' | 'destructive' }) =>
        variant === 'destructive' ? theme.colors.error : theme.colors.textSecondary};
`;

const ButtonText = styled(Text) <{ variant?: 'default' | 'destructive' }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme, variant }: StyledProps & { variant?: 'default' | 'destructive' }) =>
        variant === 'destructive' ? theme.colors.error : theme.colors.text};
  flex: 1;
`;

const Chevron = styled(Ionicons)`
  color: ${({ theme }: StyledProps) => theme.colors.textLight};
`;

export const SettingsItem: React.FC<SettingsItemProps> = ({
    label,
    icon,
    onPress,
    variant = 'default',
}) => {
    return (
        <Button onPress={onPress}>
            {icon && (
                <IconContainer>
                    <Icon name={icon} size={20} variant={variant} />
                </IconContainer>
            )}
            <ButtonText variant={variant}>{label}</ButtonText>
            <Chevron name="chevron-forward" size={20} />
        </Button>
    );
};
