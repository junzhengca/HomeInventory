import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, TouchableOpacity, View, Text } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { Category } from '../../types/inventory';
import { getAllCategories } from '../../services/CategoryService';
import { useCategory, useAppSelector } from '../../store/hooks';
import { useHome } from '../../hooks/useHome';
import { selectCategoryRefreshTimestamp } from '../../store/slices/refreshSlice';
import type { StyledProps, StyledPropsWith } from '../../utils/styledComponents';
import { uiLogger } from '../../utils/Logger';
import type { Theme } from '../../theme/types';

/**
 * Container with negative horizontal margins to enable edge-to-edge scrolling.
 * The ScrollView's contentContainerStyle adds horizontal padding to restore
 * proper spacing while allowing content to scroll to the screen edges.
 */
const Container = styled(View) <{ horizontalPadding: number }>`
  margin-horizontal: -${({ horizontalPadding }: { horizontalPadding: number }) => horizontalPadding}px;
`;

const ScrollContainer = styled(ScrollView)`
  flex-direction: row;
`;

const CategoryButton = styled(TouchableOpacity) <{ isSelected: boolean }>`
  flex-direction: row;
  align-items: center;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  background-color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
        isSelected ? theme.colors.primary : theme.colors.surface};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
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
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
        isSelected ? theme.colors.surface : theme.colors.text};
`;

export interface CategoryFormSelectorProps {
    selectedCategoryId: string | null;
    onSelect: (categoryId: string) => void;
}

/**
 * Category selector for item forms with edge-to-edge scrolling.
 * Displays categories as pills with optional color dots.
 *
 * Unlike CategoryFilter (for filtering), this component:
 * - Requires a selection (no "All" option for form, category is optional field)
 * - Uses negative margins for edge-to-edge scroll content
 */
export const CategoryFormSelector: React.FC<CategoryFormSelectorProps> = ({
    selectedCategoryId,
    onSelect,
}) => {
    const theme = useTheme() as Theme;
    const [categories, setCategories] = useState<Category[]>([]);
    const { registerRefreshCallback } = useCategory();
    const { currentHomeId } = useHome();
    const refreshTimestamp = useAppSelector(selectCategoryRefreshTimestamp);

    const horizontalPadding = theme.spacing.md;

    const scrollContentStyle = {
        paddingVertical: theme.spacing.sm,
        paddingLeft: horizontalPadding,
        paddingRight: horizontalPadding,
    };

    const loadCategories = useCallback(async () => {
        try {
            if (!currentHomeId) {
                setCategories([]);
                return;
            }
            const allCategories = await getAllCategories(currentHomeId);
            setCategories(allCategories);

            // Auto-select first category if nothing is selected and categories exist
            if (!selectedCategoryId && allCategories.length > 0) {
                onSelect(allCategories[0].id);
            }
        } catch (error) {
            uiLogger.error('Error loading categories', error);
            setCategories([]);
        }
    }, [currentHomeId, selectedCategoryId, onSelect]);

    // Load categories when home changes, refresh timestamp changes, or translations change
    useEffect(() => {
        loadCategories();
    }, [loadCategories, refreshTimestamp]);

    useEffect(() => {
        const unregister = registerRefreshCallback(loadCategories);
        return unregister;
    }, [registerRefreshCallback, loadCategories]);

    if (categories.length === 0) {
        return null;
    }

    return (
        <Container horizontalPadding={horizontalPadding}>
            <ScrollContainer
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={scrollContentStyle}
            >
                {categories.map((category) => {
                    const isSelected = selectedCategoryId === category.id;
                    return (
                        <CategoryButton
                            key={category.id}
                            isSelected={isSelected}
                            onPress={() => onSelect(category.id)}
                            activeOpacity={0.8}
                        >
                            {category.color && <ColorDot color={category.color} />}
                            <CategoryText isSelected={isSelected}>
                                {category.name}
                            </CategoryText>
                        </CategoryButton>
                    );
                })}
            </ScrollContainer>
        </Container>
    );
};
