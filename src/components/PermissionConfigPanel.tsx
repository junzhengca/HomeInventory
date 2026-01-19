import React from 'react';
import { View, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import type { StyledProps } from '../utils/styledComponents';
import { BaseCard } from './BaseCard';

const Container = styled(View)`
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const Title = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const PermissionItem = styled(BaseCard)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const ItemContent = styled(View)`
  flex-direction: row;
  align-items: center;
  width: 100%;
`;

const IconContainer = styled(View)<{ isShared: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: ${({ theme, isShared }: StyledProps & { isShared: boolean }) =>
    isShared ? theme.colors.successLight : theme.colors.borderLight};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const TextContainer = styled(View)`
  flex: 1;
  flex-direction: column;
`;

const ItemLabel = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const ItemDescription = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.regular};
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

interface PermissionConfigPanelProps {
  canShareInventory: boolean;
  canShareTodos: boolean;
  onToggleInventory: () => void;
  onToggleTodos: () => void;
  isLoading?: boolean;
}

export const PermissionConfigPanel: React.FC<PermissionConfigPanelProps> = ({
  canShareInventory,
  canShareTodos,
  onToggleInventory,
  onToggleTodos,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Container>
      <Title>{t('share.permissions.title')}</Title>
      
      <PermissionItem
        onPress={isLoading ? undefined : onToggleInventory}
        activeOpacity={isLoading ? 1 : 0.8}
      >
        <ItemContent>
          <IconContainer isShared={canShareInventory}>
            <Ionicons
              name={canShareInventory ? 'shield-checkmark' : 'lock-closed'}
              size={22}
              color={canShareInventory ? theme.colors.success : theme.colors.textSecondary}
            />
          </IconContainer>
          <TextContainer>
            <ItemLabel>{t('share.permissions.itemLibrary.label')}</ItemLabel>
            <ItemDescription>
              {canShareInventory
                ? t('share.permissions.itemLibrary.shared')
                : t('share.permissions.itemLibrary.unshared')}
            </ItemDescription>
          </TextContainer>
        </ItemContent>
      </PermissionItem>

      <PermissionItem
        onPress={isLoading ? undefined : onToggleTodos}
        activeOpacity={isLoading ? 1 : 0.8}
      >
        <ItemContent>
          <IconContainer isShared={canShareTodos}>
            <Ionicons
              name={canShareTodos ? 'shield-checkmark' : 'lock-closed'}
              size={22}
              color={canShareTodos ? theme.colors.success : theme.colors.textSecondary}
            />
          </IconContainer>
          <TextContainer>
            <ItemLabel>{t('share.permissions.shoppingList.label')}</ItemLabel>
            <ItemDescription>
              {canShareTodos
                ? t('share.permissions.shoppingList.shared')
                : t('share.permissions.shoppingList.unshared')}
            </ItemDescription>
          </TextContainer>
        </ItemContent>
      </PermissionItem>
    </Container>
  );
};
