import React, { useState, useMemo, useEffect } from 'react';
import { ScrollView, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PageHeader } from '../components/PageHeader';
import { SearchInput } from '../components/SearchInput';
import { CategorySelector } from '../components/CategorySelector';
import { SummaryCards } from '../components/SummaryCards';
import { RecentlyAdded } from '../components/RecentlyAdded';
import { InventoryItem } from '../types/inventory';
import { RootStackParamList } from '../navigation/types';
import { getAllItems, searchItems } from '../services/InventoryService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Content = styled(ScrollView)`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.lg}px;
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

export const HomeScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
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

    loadItems();
  }, []);

  // Filter items based on selected category
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') {
      return items;
    }
    return items.filter(
      (item) => item.category === selectedCategory
    );
  }, [selectedCategory, items]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleItemPress = (item: InventoryItem) => {
    console.log('Item pressed:', item.name);
    // TODO: Navigate to item detail screen
  };

  const handleViewAll = () => {
    console.log('View all pressed');
    // TODO: Navigate to full inventory list
  };

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  // Calculate bottom padding: nav bar height (60) + margin (16*2) + safe area + extra spacing
  const bottomPadding = 60 + 32 + insets.bottom + 24;

  if (isLoading) {
    return (
      <Container>
        <PageHeader
          icon="home"
          title="家里有什么"
          subtitle="家庭资产管理"
          avatarUrl="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
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
        icon="home"
        title="家里有什么"
        subtitle="家庭资产管理"
        avatarUrl="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
        onSettingsPress={handleSettingsPress}
      />
      <Content 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        <SearchInput />
        <CategorySelector onCategoryChange={handleCategoryChange} />
        <SummaryCards items={filteredItems} />
        <RecentlyAdded
          items={filteredItems}
          maxItems={3}
          onItemPress={handleItemPress}
          onViewAll={handleViewAll}
        />
      </Content>
    </Container>
  );
};

