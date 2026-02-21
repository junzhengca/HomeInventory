import React, { useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, Text } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import { useInventoryCategories } from '../../store/hooks';
import { getInventoryCategoryDisplayName } from '../../utils/inventoryCategoryI18n';
import type { StyledProps, StyledPropsWith } from '../../utils/styledComponents';
import type { Theme } from '../../theme/types';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { CreateCategoryBottomSheet } from '../organisms/CreateCategoryBottomSheet';

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

const CreateCategoryButton = styled(TouchableOpacity)`
  align-items: center;
  justify-content: center;
  flex-direction: row;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  background-color: transparent;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  border-width: 1.5px;
  border-style: dotted;
  border-color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

export interface CategoryFormSelectorProps {
    selectedCategoryId: string | null;
    onSelect: (categoryId: string) => void;
    onOpeningNestedModal?: (isOpening: boolean) => void;
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
    onOpeningNestedModal,
}) => {
    const theme = useTheme() as Theme;
    const { t } = useTranslation();
    const { categories } = useInventoryCategories();
    const bottomSheetRef = React.useRef<BottomSheetModal>(null);

    const horizontalPadding = theme.spacing.md;

    const scrollContentStyle = {
        paddingVertical: theme.spacing.sm,
        paddingLeft: horizontalPadding,
        paddingRight: horizontalPadding,
    };

    // Auto-select first category if nothing is selected and categories exist
    useEffect(() => {
        if (!selectedCategoryId && categories.length > 0) {
            onSelect(categories[0].id);
        }
    }, [categories, selectedCategoryId, onSelect]);

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
                            <ColorDot color={category.color || theme.colors.secondary} />
                            <CategoryText isSelected={isSelected}>
                                {category.label || getInventoryCategoryDisplayName(category, t)}
                            </CategoryText>
                        </CategoryButton>
                    );
                })}

                <CreateCategoryButton
                    onPress={() => {
                        onOpeningNestedModal?.(true);
                        bottomSheetRef.current?.present();
                    }}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="add"
                        size={20}
                        color={theme.colors.textSecondary}
                    />
                </CreateCategoryButton>
            </ScrollContainer>

            <CreateCategoryBottomSheet
                bottomSheetRef={bottomSheetRef}
                onClose={() => onOpeningNestedModal?.(false)}
            />
        </Container>
    );
};
