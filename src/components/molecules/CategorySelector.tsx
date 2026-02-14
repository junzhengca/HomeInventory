import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, TouchableOpacity, View, Text } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import { Category } from '../../types/inventory';
import { categoryService } from '../../services/CategoryService';
import { useCategory, useAppSelector } from '../../store/hooks';
import { useHome } from '../../hooks/useHome';
import { selectCategoryRefreshTimestamp } from '../../store/slices/refreshSlice';
import type { StyledProps, StyledPropsWith } from '../../utils/styledComponents';
import { uiLogger } from '../../utils/Logger';
import type { Theme } from '../../theme/types';

const Container = styled(View)``;

const ScrollContainer = styled(ScrollView)`
  flex-direction: row;
`;

const CategoryButton = styled(TouchableOpacity) <{ isSelected: boolean }>`
  flex-direction: row;
  align-items: center;
  padding-horizontal: 16px;
  padding-vertical: 6px;
  border-radius: 18px;
  background-color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.surface};
  border-width: 1.5px;
  border-color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.border};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;

  /* Elevation for Android */
  elevation: ${({ isSelected }: { isSelected: boolean }) => (isSelected ? 4 : 0)};

  /* Shadow for iOS */
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: ${({ isSelected }: { isSelected: boolean }) => (isSelected ? 0.1 : 0)};
  shadow-radius: 2px;
`;

const ColorDot = styled(View) <{ color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background-color: ${({ color }: { color: string }) => color};
  margin-right: 6px;
`;

const CategoryText = styled(Text) <{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.surface : theme.colors.textSecondary};
`;

export interface CategorySelectorProps {
  categories?: Category[];
  selectedCategory?: string;
  onCategoryChange?: (categoryId: string) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories: providedCategories,
  selectedCategory: parentSelectedCategory,
  onCategoryChange,
}) => {
  const { t } = useTranslation();
  const theme = useTheme() as Theme;
  const [selectedCategory, setSelectedCategory] = useState<string>(parentSelectedCategory || 'all');
  const [categories, setCategories] = useState<Category[]>([]);
  const { registerRefreshCallback } = useCategory();
  const { currentHomeId } = useHome();
  const refreshTimestamp = useAppSelector(selectCategoryRefreshTimestamp);

  // Scroll content padding uses theme spacing for consistency
  const scrollContentStyle = {
    paddingVertical: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.md,
  };

  const loadCategories = useCallback(async () => {
    if (providedCategories) {
      setCategories(providedCategories);
      return;
    }

    try {
      if (!currentHomeId) {
        setCategories([]);
        return;
      }
      const allCategories = await categoryService.getAllCategories(currentHomeId);
      // Add "all" category at the beginning
      const allCategory: Category = {
        id: 'all',
        name: 'all',
        label: t('categories.all'),
        isCustom: false,
        homeId: '',
        version: 0,
        clientUpdatedAt: '',
      };
      setCategories([allCategory, ...allCategories]);
    } catch (error) {
      uiLogger.error('Error loading categories', error);
      // Categories will remain empty array if loading fails
      // Only show "all" category as fallback
      const allCategory: Category = {
        id: 'all',
        name: 'all',
        label: t('categories.all'),
        isCustom: false,
        homeId: '',
        version: 0,
        clientUpdatedAt: '',
      };
      setCategories([allCategory]);
    }
  }, [providedCategories, t, currentHomeId]);

  // Load categories when home changes, refresh timestamp changes, or translations change
  useEffect(() => {
    loadCategories();
  }, [loadCategories, refreshTimestamp]);

  useEffect(() => {
    if (!providedCategories) {
      const unregister = registerRefreshCallback(loadCategories);
      return unregister;
    }
  }, [providedCategories, registerRefreshCallback, loadCategories]);

  // Sync internal state with parent's selectedCategory prop
  useEffect(() => {
    if (parentSelectedCategory !== undefined) {
      setSelectedCategory(parentSelectedCategory);
    }
  }, [parentSelectedCategory]);

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (onCategoryChange) {
      onCategoryChange(categoryId);
    }
  };

  return (
    <Container>
      <ScrollContainer
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={scrollContentStyle}
      >
        {categories.map((category) => (
          <CategoryButton
            key={category.id}
            isSelected={selectedCategory === category.id}
            onPress={() => handleCategoryPress(category.id)}
            activeOpacity={0.8}
          >
            {category.color && <ColorDot color={category.color} />}
            <CategoryText isSelected={selectedCategory === category.id}>
              {category.isCustom ? category.label : t(`categories.${category.name}`)}
            </CategoryText>
          </CategoryButton>
        ))}
      </ScrollContainer>
    </Container>
  );
};
