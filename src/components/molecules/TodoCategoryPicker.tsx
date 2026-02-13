import React from 'react';
import { TouchableOpacity, ScrollView, View, Text } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import type {
    StyledProps,
    StyledPropsWith,
} from '../../utils/styledComponents';
import { useTodoCategories } from '../../store/hooks';
import type { Theme } from '../../theme/types';

const PickerContainer = styled(View)`
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const CategoryScrollView = styled(ScrollView).attrs(() => ({
    horizontal: true,
    showsHorizontalScrollIndicator: false,
}))`
  flex-grow: 0;
`;

const CategoryButton = styled(TouchableOpacity) <{ isSelected: boolean }>`
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  background-color: ${({
    theme,
    isSelected,
}: StyledPropsWith<{ isSelected: boolean }>) =>
        isSelected ? theme.colors.primary : theme.colors.surface};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  border-width: 1px;
  border-color: ${({
            theme,
            isSelected,
        }: StyledPropsWith<{ isSelected: boolean }>) =>
        isSelected ? theme.colors.primary : 'transparent'};
`;

const CategoryText = styled(Text) <{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.regular};
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
        isSelected ? theme.colors.surface : theme.colors.textSecondary};
`;

export interface TodoCategoryPickerProps {
    selectedCategoryId: string | null;
    onSelect: (categoryId: string | null) => void;
}

export const TodoCategoryPicker: React.FC<TodoCategoryPickerProps> = ({
    selectedCategoryId,
    onSelect,
}) => {
    const { t } = useTranslation();
    const theme = useTheme() as Theme;
    const { categories } = useTodoCategories();

    // Select first category by default if none selected
    React.useEffect(() => {
        if (categories.length > 0 && !selectedCategoryId) {
            // Find if the currently selected category still exists (in case of deletion)
            // If selectedCategoryId is null, this select the first one.
            // If selectedCategoryId is set but not found in categories?
            // The logic " !selectedCategoryId" covers null/undefined.
            // If it is set but invalid, we might want to check that too, but the requirement says "select first one as default".
            onSelect(categories[0].id);
        }
    }, [categories, selectedCategoryId, onSelect]);


    // Scroll content padding uses theme spacing for consistency
    const scrollContentStyle = {
        paddingLeft: theme.spacing.md,
        paddingRight: theme.spacing.md,
    };

    if (categories.length === 0) {
        return null;
    }

    return (
        <PickerContainer>
            <CategoryScrollView contentContainerStyle={scrollContentStyle}>
                {categories.map((category) => {
                    const isSelected = selectedCategoryId === category.id;
                    return (
                        <CategoryButton
                            key={category.id}
                            isSelected={isSelected}
                            onPress={() => onSelect(category.id)}
                            activeOpacity={0.7}
                        >
                            <CategoryText isSelected={isSelected}>
                                {category.name}
                            </CategoryText>
                        </CategoryButton>
                    );
                })}
            </CategoryScrollView>
        </PickerContainer>
    );
};
