import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, TouchableOpacity, View, Text, Alert } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import type { Category } from '../../types/inventory';
import { useInventoryCategories } from '../../store/hooks';
import { getInventoryCategoryDisplayName, DEFAULT_INVENTORY_CATEGORY_IDS } from '../../utils/inventoryCategoryI18n';
import type { StyledProps, StyledPropsWith } from '../../utils/styledComponents';
import type { Theme } from '../../theme/types';

const Container = styled(View) <{ edgeToEdge?: boolean; horizontalPadding: number }>`
  ${({ edgeToEdge, horizontalPadding }: { edgeToEdge?: boolean; horizontalPadding: number }) =>
    edgeToEdge ? `margin-horizontal: -${horizontalPadding}px;` : ''}
`;

const ScrollContainer = styled(ScrollView)`
  flex-direction: row;
`;

const CategoryButton = styled(TouchableOpacity) <{ isSelected: boolean }>`
  flex-direction: row;
  align-items: center;
  padding-horizontal: 16px;
  height: 38px;
  border-radius: 19px;
  background-color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.surface};
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
    isSelected ? theme.colors.surface : theme.colors.text};
`;

const CountText = styled(Text) <{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.surface : theme.colors.textSecondary};
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  opacity: 0.7;
`;

const CreateCategoryButton = styled(TouchableOpacity)`
  align-items: center;
  justify-content: center;
  flex-direction: row;
  padding-horizontal: 12px;
  height: 38px;
  border-radius: 19px;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
  align-self: center;
`;

export interface CategorySelectorProps {
  categories?: Category[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
  onOpeningNestedModal?: (isOpening: boolean) => void;
  counts?: Record<string, number>;
  showAllOption?: boolean;
  autoSelectFirst?: boolean;
  edgeToEdge?: boolean;
}

import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { CreateCategoryBottomSheet } from '../organisms/CreateCategoryBottomSheet';
import { ContextMenu } from '../organisms/ContextMenu/ContextMenu';

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories: providedCategories,
  selectedCategoryId: parentSelectedCategoryId,
  onSelect,
  onOpeningNestedModal,
  counts = {},
  showAllOption = false,
  autoSelectFirst = false,
  edgeToEdge = false,
}) => {
  const { t } = useTranslation();
  const theme = useTheme() as Theme;
  const bottomSheetRef = React.useRef<BottomSheetModal>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(parentSelectedCategoryId || (showAllOption ? 'all' : null));
  const [categories, setCategories] = useState<Category[]>([]);
  const { categories: allCategories, deleteCategory } = useInventoryCategories();
  const [categoryToEdit, setCategoryToEdit] = useState<{ id: string; name: string; color?: string; icon?: string } | null>(null);

  const horizontalPadding = theme.spacing.md;

  // Scroll content padding uses theme spacing for consistency
  const scrollContentStyle = {
    paddingVertical: theme.spacing.sm,
    paddingLeft: horizontalPadding,
    paddingRight: horizontalPadding,
  };

  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);

  const loadCategories = useCallback(() => {
    if (providedCategories) {
      setCategories(providedCategories);
      return;
    }

    // Use categories from Redux state
    if (showAllOption) {
      const allCategory: Category = {
        id: 'all',
        name: t('categories.all'),
        homeId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCategories([allCategory, ...allCategories]);
    } else {
      setCategories(allCategories);
    }
  }, [providedCategories, t, allCategories, showAllOption]);

  // Load categories when categories from Redux change
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Sync internal state with parent's selectedCategoryId prop
  useEffect(() => {
    if (parentSelectedCategoryId !== undefined) {
      setSelectedCategoryId(parentSelectedCategoryId);
    }
  }, [parentSelectedCategoryId]);

  // Auto-select first category if nothing is selected and categories exist (for forms)
  useEffect(() => {
    if (autoSelectFirst && !selectedCategoryId && categories.length > 0) {
      const firstNonAll = categories.find(c => c.id !== 'all');
      if (firstNonAll) {
        onSelect(firstNonAll.id);
      }
    }
  }, [categories, selectedCategoryId, onSelect, autoSelectFirst]);

  const handleCategoryPress = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    onSelect(categoryId);
  };

  const handleEditCategory = (category: Category) => {
    onOpeningNestedModal?.(true);
    setCategoryToEdit({
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
    });
    bottomSheetRef.current?.present();
  };

  const confirmDeleteCategory = (category: Category) => {
    Alert.alert(
      t('categories.delete.title'),
      t('categories.delete.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteCategory(category.id),
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <Container edgeToEdge={edgeToEdge} horizontalPadding={horizontalPadding}>
      <ScrollContainer
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={scrollContentStyle}
      >
        {categories.map((category) => {
          const isSystem = category.id === 'all' || DEFAULT_INVENTORY_CATEGORY_IDS.has(category.id);

          const menuItems = [
            {
              id: 'edit',
              label: t('itemDetails.actions.modify'),
              icon: 'pencil-outline',
              onPress: () => handleEditCategory(category),
              disabled: isSystem, // Cannot edit system categories or "All"
            },
            {
              id: 'delete',
              label: t('common.delete'),
              icon: 'trash-can-outline',
              onPress: () => confirmDeleteCategory(category),
              isDestructive: true,
            },
          ];

          // "All" option might not need context menu, but if requested we apply it, or let's omit for "All"
          const pillContent = (
            <CategoryButton
              isSelected={selectedCategoryId === category.id}
              onPress={() => handleCategoryPress(category.id)}
              activeOpacity={0.8}
            >
              <ColorDot
                color="transparent"
                style={{
                  borderWidth: 1.5,
                  borderColor: category.id === 'all'
                    ? (selectedCategoryId === 'all' ? theme.colors.surface : theme.colors.textSecondary)
                    : 'transparent',
                  backgroundColor: category.id === 'all'
                    ? 'transparent'
                    : (category.color || theme.colors.secondary)
                }}
              />
              <CategoryText isSelected={selectedCategoryId === category.id}>
                {getInventoryCategoryDisplayName(category, t)}
              </CategoryText>
              {counts && (counts[category.id] !== undefined || category.id === 'all') && (
                <CountText isSelected={selectedCategoryId === category.id}>
                  {category.id === 'all' ? totalCount : (counts[category.id] || 0)}
                </CountText>
              )}
            </CategoryButton>
          );

          if (category.id === 'all') {
            return <React.Fragment key={category.id}>{pillContent}</React.Fragment>;
          }

          return (
            <ContextMenu key={category.id} items={menuItems}>
              {pillContent}
            </ContextMenu>
          );
        })}

        <CreateCategoryButton
          onPress={() => {
            onOpeningNestedModal?.(true);
            setCategoryToEdit(null);
            bottomSheetRef.current?.present();
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name="add"
            size={24}
            color={theme.colors.textSecondary}
          />
        </CreateCategoryButton>
      </ScrollContainer>

      <CreateCategoryBottomSheet
        bottomSheetRef={bottomSheetRef}
        categoryToEdit={categoryToEdit}
        onClose={() => onOpeningNestedModal?.(false)}
      />
    </Container>
  );
};
