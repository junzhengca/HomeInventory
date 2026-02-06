import React from 'react';
import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import type {
  StyledProps,
  StyledPropsWith,
} from '../../utils/styledComponents';
import type { Category } from '../../types/inventory';
import { filterItemCategories } from '../../utils/categoryUtils';

const CategoryGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
`;

const CategoryButton = styled(TouchableOpacity) <{ isSelected: boolean }>`
  width: 30%;
  aspect-ratio: 1;
  margin-right: 3.33%;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  background-color: ${({
  theme,
  isSelected,
}: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primaryLightest : theme.colors.surface};
  border-width: 1.5px;
  border-color: ${({
      theme,
      isSelected,
    }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const CategoryIcon = styled.View<{ color?: string }>`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const CategoryLabel = styled.Text<{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.text};
  text-align: center;
`;

const AddCategoryButton = styled(CategoryButton)`
  border-style: dashed;
  border-color: ${({ theme }: StyledProps) => theme.colors.border};
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

export interface CategoryFieldProps {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
  onManageCategories?: () => void;
}

/**
 * Category selection field with grid layout.
 * Shows item-type categories in a 3-column grid with optional "Add" button.
 *
 * @example
 * <CategoryField
 *   categories={categories}
 *   selectedId={formData.categoryId}
 *   onSelect={(id) => updateField('categoryId', id)}
 *   onManageCategories={() => managerRef.current?.present()}
 * />
 */
export const CategoryField: React.FC<CategoryFieldProps> = ({
  categories,
  selectedId,
  onSelect,
  onManageCategories,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const itemTypeCategories = filterItemCategories(categories);

  const renderCategoryButton = (category: Category, index: number) => {
    const totalItems = itemTypeCategories.length + (onManageCategories ? 1 : 0);
    const itemsInLastRow = totalItems % 3 || 3;
    const lastRowStartIndex = totalItems - itemsInLastRow;
    const isLastRow = index >= lastRowStartIndex;
    const isLastInRow = (index + 1) % 3 === 0;

    const buttonStyle: { marginRight?: number; marginBottom?: number } = {};
    if (isLastInRow) buttonStyle.marginRight = 0;
    if (isLastRow) buttonStyle.marginBottom = 0;

    return (
      <CategoryButton
        key={category.id}
        isSelected={selectedId === category.id}
        onPress={() => onSelect(category.id)}
        activeOpacity={0.7}
        style={buttonStyle}
      >
        {category.icon && (
          <CategoryIcon color={theme.colors.primary}>
            <Ionicons
              name={category.icon}
              size={24}
              color={theme.colors.primary}
            />
          </CategoryIcon>
        )}
        <CategoryLabel isSelected={selectedId === category.id}>
          {category.isCustom
            ? category.label
            : t(`categories.${category.name}`)}
        </CategoryLabel>
      </CategoryButton>
    );
  };

  return (
    <CategoryGrid>
      {itemTypeCategories.map(renderCategoryButton)}
      {onManageCategories && (
        <AddCategoryButton
          onPress={onManageCategories}
          activeOpacity={0.7}
          isSelected={false}
          style={{ marginBottom: 0, marginRight: 0 }}
        >
          <Ionicons name="add" size={32} color={theme.colors.textLight} />
          <CategoryLabel isSelected={false}>{t('editItem.add')}</CategoryLabel>
        </AddCategoryButton>
      )}
    </CategoryGrid>
  );
};
