import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Category } from '../types/inventory';
import { getLightColor } from '../utils/colors';
import type { StyledProps } from '../utils/styledComponents';
import { BaseCard } from './BaseCard';
import { useTheme } from '../theme/ThemeProvider';

const IconContainer = styled(View)<{ backgroundColor: string }>`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.lg}px;
  background-color: ${({ backgroundColor }: { backgroundColor: string }) => backgroundColor};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const ContentContainer = styled(View)`
  flex: 1;
  justify-content: center;
`;

const CategoryName = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const ActionsContainer = styled(View)`
  flex-direction: row;
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  align-items: center;
`;

const ActionButton = styled(TouchableOpacity)`
  padding: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

interface CategoryPreviewCardProps {
  category: Category;
  onEdit?: (category: Category) => void;
  onDelete?: (categoryId: string) => void;
}

/**
 * CategoryPreviewCard - A card component for displaying category previews
 * Uses the same BaseCard styling as ItemCard for consistency
 */
export const CategoryPreviewCard: React.FC<CategoryPreviewCardProps> = ({
  category,
  onEdit,
  onDelete,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const displayLabel = category.isCustom ? category.label : t(`categories.${category.name}`);

  return (
    <BaseCard compact>
      <IconContainer backgroundColor={getLightColor(category.iconColor || theme.colors.primary)}>
        <Ionicons
          name={category.icon || 'cube-outline'}
          size={24}
          color={category.iconColor || theme.colors.primary}
        />
      </IconContainer>

      <ContentContainer>
        <CategoryName>{displayLabel}</CategoryName>
      </ContentContainer>

      {(onEdit || onDelete) && (
        <ActionsContainer>
          {onEdit && (
            <ActionButton onPress={() => onEdit(category)} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
            </ActionButton>
          )}
          {onDelete && (
            <ActionButton onPress={() => onDelete(category.id)} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
            </ActionButton>
          )}
        </ActionsContainer>
      )}
    </BaseCard>
  );
};

