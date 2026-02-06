import React, { useMemo } from 'react';
import { TouchableOpacity, ScrollView, View, Text } from 'react-native';
import styled from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type {
    StyledProps,
    StyledPropsWith,
} from '../../utils/styledComponents';
import { useCategories } from '../../hooks/useCategories';

const FilterContainer = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const CategoryScrollView = styled(ScrollView).attrs(() => ({
    horizontal: true,
    showsHorizontalScrollIndicator: false,
}))`
  flex-grow: 0;
`;

// Square/Rounded item container
const CategoryButton = styled(TouchableOpacity) <{ isSelected: boolean }>`
  width: 50px;
  height: 50px;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
  background-color: ${({
    theme,
    isSelected,
}: StyledPropsWith<{ isSelected: boolean }>) =>
        isSelected ? theme.colors.primary : theme.colors.surface};
  border-width: 1px;
  border-color: ${({
            theme,
            isSelected,
        }: StyledPropsWith<{ isSelected: boolean }>) =>
        isSelected ? theme.colors.primary : theme.colors.border};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

// Wrapper for the button + text below it
const CategoryWrapper = styled(View)`
  align-items: center;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const CategoryLabel = styled(Text) <{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  text-align: center;
`;



export interface CategoryFilterProps {
    selectedCategoryId: string | null;
    onSelect: (categoryId: string | null) => void;
    counts?: Record<string, number>;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
    selectedCategoryId,
    onSelect,
    counts = {},
}) => {
    const { t } = useTranslation();
    const { categories, loading } = useCategories();

    // Sort categories if needed, or rely on default order.
    // We might want to put "All" first.

    const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);

    if (loading && categories.length === 0) {
        return null; // Or skeleton
    }

    return (
        <FilterContainer>
            <CategoryScrollView
                contentContainerStyle={{ paddingHorizontal: 0 }}
            >
                {/* All Categories Option */}
                <CategoryWrapper>
                    <CategoryButton
                        isSelected={selectedCategoryId === null}
                        onPress={() => onSelect(null)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="grid-outline"
                            size={24}
                            color={selectedCategoryId === null ? '#FFFFFF' : '#666666'}
                        />
                    </CategoryButton>
                    <CategoryLabel isSelected={selectedCategoryId === null}>
                        {t('categories.all')} <Text style={{ fontSize: 10, opacity: 0.7 }}>({totalCount})</Text>
                    </CategoryLabel>
                </CategoryWrapper>

                {/* Categories */}
                {categories.map((category) => {
                    const isSelected = selectedCategoryId === category.id;
                    return (
                        <CategoryWrapper key={category.id}>
                            <CategoryButton
                                isSelected={isSelected}
                                onPress={() => onSelect(category.id)}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={category.icon as any || 'list'}
                                    size={24}
                                    color={isSelected ? '#FFFFFF' : '#666666'}
                                />
                            </CategoryButton>
                            <CategoryLabel isSelected={isSelected}>
                                {category.name} <Text style={{ fontSize: 10, opacity: 0.7 }}>({counts[category.id] || 0})</Text>
                            </CategoryLabel>
                        </CategoryWrapper>
                    );
                })}
            </CategoryScrollView>
        </FilterContainer>
    );
};
