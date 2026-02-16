import React from 'react';
import { View, Text } from 'react-native';
import styled from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import type { StyledProps } from '../../utils/styledComponents';
import { IconContainer, Toggle, SectionTitle } from '../atoms';

const Container = styled(View)`
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const PermissionRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const LeftSection = styled(View)`
  flex-direction: row;
  align-items: center;
  flex: 1;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const TextContainer = styled(View)`
  flex: 1;
  flex-direction: column;
  margin-left: ${({ theme }: StyledProps) => theme.spacing.md}px;
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
  color: ${({ theme }: StyledProps) => theme.colors.textLight};
`;

export interface PermissionConfigPanelProps {
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

  const handleInventoryToggle = (value: boolean) => {
    // Only trigger if the value is actually changing
    if (value !== canShareInventory) {
      onToggleInventory();
    }
  };

  const handleTodosToggle = (value: boolean) => {
    // Only trigger if the value is actually changing
    if (value !== canShareTodos) {
      onToggleTodos();
    }
  };

  return (
    <Container>
      <SectionTitle title={t('share.permissions.title')} icon="share-outline" />
      
      <PermissionRow>
        <LeftSection>
          <IconContainer icon="cube-outline" />
          <TextContainer>
            <ItemLabel>{t('share.permissions.itemLibrary.label')}</ItemLabel>
            <ItemDescription>
              {canShareInventory
                ? t('share.permissions.itemLibrary.shared')
                : t('share.permissions.itemLibrary.unshared')}
            </ItemDescription>
          </TextContainer>
        </LeftSection>
        <Toggle
          value={canShareInventory}
          onValueChange={handleInventoryToggle}
          disabled={isLoading}
        />
      </PermissionRow>

      <PermissionRow>
        <LeftSection>
          <IconContainer icon="list-outline" />
          <TextContainer>
            <ItemLabel>{t('share.permissions.shoppingList.label')}</ItemLabel>
            <ItemDescription>
              {canShareTodos
                ? t('share.permissions.shoppingList.shared')
                : t('share.permissions.shoppingList.unshared')}
            </ItemDescription>
          </TextContainer>
        </LeftSection>
        <Toggle
          value={canShareTodos}
          onValueChange={handleTodosToggle}
          disabled={isLoading}
        />
      </PermissionRow>
    </Container>
  );
};
