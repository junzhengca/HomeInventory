import React, { useState, useEffect, useMemo } from 'react';
import { FlatList, ActivityIndicator, View } from 'react-native';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { StyledProps } from '../utils/styledComponents';

import { PageHeader } from '../components/PageHeader';
import { SearchInput } from '../components/SearchInput';
import { CategorySelector } from '../components/CategorySelector';
import { ItemCard } from '../components/ItemCard';
import { EmptyState } from '../components/EmptyState';
import { InventoryItem } from '../types/inventory';
import { RootStackParamList } from '../navigation/types';
import { getAllItems } from '../services/InventoryService';
import { useInventory } from '../contexts/InventoryContext';
import { useSelectedCategory } from '../contexts/SelectedCategoryContext';
import { calculateBottomPadding } from '../utils/layout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const Content = styled(View)`
  flex: 1;
  padding: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const ListContainer = styled(View)`
  flex: 1;
`;

const LoadingContainer = styled(View)`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

export const InventoryScreen: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { registerRefreshCallback } = useInventory();
  const { inventoryCategory, setInventoryCategory } = useSelectedCategory();

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const allItems = await getAllItems();
      setItems(allItems);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Initialize and sync selectedCategory from context
  useEffect(() => {
    if (inventoryCategory) {
      setSelectedCategory(inventoryCategory);
    }
  }, [inventoryCategory]);

  useEffect(() => {
    const unregister = registerRefreshCallback(loadItems);
    return unregister;
  }, [registerRefreshCallback]);

  // Filter items based on selected category and search query
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (item) => item.category === selectedCategory
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(lowerQuery) ||
          item.location.toLowerCase().includes(lowerQuery) ||
          item.detailedLocation.toLowerCase().includes(lowerQuery) ||
          item.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    }

    return filtered;
  }, [selectedCategory, searchQuery, items]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setInventoryCategory(categoryId);
  };

  // Sync context when component mounts or selectedCategory changes
  useEffect(() => {
    setInventoryCategory(selectedCategory);
  }, [selectedCategory, setInventoryCategory]);

  const handleItemPress = (item: InventoryItem) => {
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('ItemDetails', { itemId: item.id });
    }
  };

  const handleSettingsPress = () => {
    // Navigate to Settings - need to use parent navigator
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('Settings');
    }
  };

  // Calculate bottom padding for scrollable content
  const bottomPadding = calculateBottomPadding(insets.bottom);

  if (isLoading) {
    return (
      <Container>
        <PageHeader
          icon="list"
          title={t('inventory.title')}
          subtitle={t('inventory.loading')}
          onSettingsPress={handleSettingsPress}
        />
        <LoadingContainer>
          <ActivityIndicator size="large" />
        </LoadingContainer>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader
        icon="list"
        title={t('inventory.title')}
        subtitle={t('inventory.itemsCount', { count: filteredItems.length })}
        onSettingsPress={handleSettingsPress}
      />
      <Content>
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <CategorySelector
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />
        <ListContainer>
          {filteredItems.length === 0 ? (
            <EmptyState
              icon="list-outline"
              title={t('inventory.empty.title')}
              description={searchQuery.trim() || selectedCategory !== 'all'
                ? t('inventory.empty.filtered')
                : t('inventory.empty.description')}
            />
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ItemCard item={item} onPress={handleItemPress} />
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: bottomPadding }}
            />
          )}
        </ListContainer>
      </Content>
    </Container>
  );
};

