import React, { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import styled from 'styled-components/native';
import { TouchableOpacity } from 'react-native';
import { Category } from '../types/inventory';
import { getAllCategories } from '../services/CategoryService';
import { categories as defaultCategories } from '../data/mockInventory';

const Container = styled.View`
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const ScrollContainer = styled(ScrollView)`
  flex-direction: row;
`;

const CategoryButton = styled(TouchableOpacity)<{ isSelected: boolean }>`
  padding-horizontal: 16px;
  padding-vertical: 6px;
  border-radius: 18px;
  background-color: ${({ theme, isSelected }) =>
    isSelected ? theme.colors.primary : theme.colors.surface};
  border-width: 1.5px;
  border-color: ${({ theme, isSelected }) =>
    isSelected ? theme.colors.primary : theme.colors.border};
  margin-right: ${({ theme }) => theme.spacing.sm}px;
  
  /* Elevation for Android */
  elevation: ${({ isSelected }) => (isSelected ? 4 : 0)};
  
  /* Shadow for iOS */
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: ${({ isSelected }) => (isSelected ? 0.1 : 0)};
  shadow-radius: 2px;
`;

const CategoryText = styled.Text<{ isSelected: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme, isSelected }) =>
    isSelected ? theme.colors.surface : theme.colors.textSecondary};
`;

interface CategorySelectorProps {
  categories?: Category[];
  onCategoryChange?: (categoryId: string) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories: providedCategories,
  onCategoryChange,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const loadCategories = async () => {
      if (providedCategories) {
        setCategories(providedCategories);
        return;
      }

      try {
        const allCategories = await getAllCategories();
        // Add "all" category at the beginning
        const allCategory: Category = {
          id: 'all',
          name: 'all',
          label: '全部',
          isCustom: false,
        };
        setCategories([allCategory, ...allCategories]);
      } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback to default categories
        const allCategory: Category = {
          id: 'all',
          name: 'all',
          label: '全部',
          isCustom: false,
        };
        setCategories([allCategory, ...defaultCategories.map(cat => ({ ...cat, isCustom: false }))]);
      }
    };

    loadCategories();
  }, [providedCategories]);

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
        contentContainerStyle={{ 
          paddingVertical: 8,
          paddingRight: 16 // Extra space at the end of scroll
        }}
      >
        {categories.map((category) => (
          <CategoryButton
            key={category.id}
            isSelected={selectedCategory === category.id}
            onPress={() => handleCategoryPress(category.id)}
            activeOpacity={0.8}
          >
            <CategoryText isSelected={selectedCategory === category.id}>
              {category.label}
            </CategoryText>
          </CategoryButton>
        ))}
      </ScrollContainer>
    </Container>
  );
};

