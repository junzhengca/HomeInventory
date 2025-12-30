import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StyledProps, StyledPropsWith } from '../utils/styledComponents';

export interface ActionButton {
  label: string;
  onPress: () => void;
  variant?: 'outlined' | 'filled' | 'danger';
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface BottomActionBarProps {
  actions: ActionButton[];
  safeArea?: boolean;
}

const BottomBarContainer = styled(View)<{ bottomInset: number; showSafeArea: boolean }>`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-bottom: ${({ bottomInset, showSafeArea }: { bottomInset: number; showSafeArea: boolean }) => showSafeArea ? bottomInset + 12 : 12}px;
  border-top-width: 1px;
  border-top-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  shadow-color: #000;
  shadow-offset: 0px -4px;
  shadow-opacity: 0.05;
  shadow-radius: 12px;
  elevation: 8;
`;

const ActionsContainer = styled(View)`
  flex-direction: row;
  gap: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const StyledTouchableOpacity = styled(TouchableOpacity)<{ variant: 'outlined' | 'filled' | 'danger' }>`
  flex: 1;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.sm + 2}px;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  background-color: ${({ theme, variant }: StyledPropsWith<{ variant: 'outlined' | 'filled' | 'danger' }>) => {
    if (variant === 'filled') return theme.colors.primary;
    if (variant === 'danger') return theme.colors.surface;
    return theme.colors.surface;
  }};
  border-width: ${({ variant }: { variant: 'outlined' | 'filled' | 'danger' }) => (variant === 'outlined' || variant === 'danger' ? 1.5 : 0)}px;
  border-color: ${({ theme, variant }: StyledPropsWith<{ variant: 'outlined' | 'filled' | 'danger' }>) => {
    if (variant === 'danger') return theme.colors.error;
    if (variant === 'outlined') return theme.colors.border;
    return 'transparent';
  }};
  min-height: 44px;
  opacity: ${({ disabled }: { disabled?: boolean }) => (disabled ? 0.5 : 1)};
  shadow-color: ${({ theme, variant }: StyledPropsWith<{ variant: 'outlined' | 'filled' | 'danger' }>) => {
    if (variant === 'filled') return theme.colors.primary;
    return '#000';
  }};
  shadow-offset: 0px 2px;
  shadow-opacity: ${({ variant }: { variant: 'outlined' | 'filled' | 'danger' }) => (variant === 'filled' ? 0.2 : 0.05)};
  shadow-radius: ${({ variant }: { variant: 'outlined' | 'filled' | 'danger' }) => (variant === 'filled' ? 8 : 4)}px;
  elevation: ${({ variant }: { variant: 'outlined' | 'filled' | 'danger' }) => (variant === 'filled' ? 4 : 2)};
`;

const ButtonText = styled(Text)<{ variant: 'outlined' | 'filled' | 'danger' }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme, variant }: StyledPropsWith<{ variant: 'outlined' | 'filled' | 'danger' }>) => {
    if (variant === 'filled') return theme.colors.surface;
    if (variant === 'danger') return theme.colors.error;
    return theme.colors.text;
  }};
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

export const BottomActionBar: React.FC<BottomActionBarProps> = ({
  actions,
  safeArea = true,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <BottomBarContainer bottomInset={insets.bottom} showSafeArea={safeArea}>
      <ActionsContainer>
        {actions.map((action, index) => (
          <StyledTouchableOpacity
            key={index}
            variant={action.variant || 'outlined'}
            onPress={action.onPress}
            disabled={action.disabled}
            activeOpacity={0.7}
          >
            {action.icon}
            <ButtonText variant={action.variant || 'outlined'}>
              {action.label}
            </ButtonText>
          </StyledTouchableOpacity>
        ))}
      </ActionsContainer>
    </BottomBarContainer>
  );
};

