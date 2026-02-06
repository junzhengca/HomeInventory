import React from 'react';
import { TouchableOpacity, ScrollView, View, Text } from 'react-native';
import styled from 'styled-components/native';
import { useTranslation } from 'react-i18next';
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

// Pill-shaped item container
const CategoryButton = styled(TouchableOpacity) <{ isSelected: boolean }>`
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  flex-direction: row;
  align-items: center;
  background-color: ${({
    theme,
    isSelected,
}: StyledPropsWith<{ isSelected: boolean }>) =>
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

const CountText = styled(Text) <{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
        isSelected ? theme.colors.surface : theme.colors.textSecondary};
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  opacity: 0.7;
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
                <CategoryButton
                    isSelected={selectedCategoryId === null}
                    onPress={() => onSelect(null)}
                    activeOpacity={0.7}
                >
                    <CategoryText isSelected={selectedCategoryId === null}>
                        {t('categories.all')}
                    </CategoryText>
                    <CountText isSelected={selectedCategoryId === null}>
                        {totalCount}
                    </CountText>
                </CategoryButton>

                {/* Categories */}
                {categories.map((category) => {
                    const isSelected = selectedCategoryId === category.id;
                    return (
                        <CategoryButton
                            key={category.id}
                            isSelected={isSelected}
                            onPress={() => onSelect(category.id)}
                            activeOpacity={0.7}
                        >
                            {category.color && <ColorDot color={category.color} />}
                            <CategoryText isSelected={isSelected}>
                                {category.name}
                            </CategoryText>
                            <CountText isSelected={isSelected}>
                                {counts[category.id] || 0}
                            </CountText>
                        </CategoryButton>
                    );
                })}
            </CategoryScrollView>
        </FilterContainer>
    );
};
