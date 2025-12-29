import React, { useState, useEffect } from 'react';
import { FlatList, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PageHeader } from '../components/PageHeader';
import { SearchInput } from '../components/SearchInput';
import { CategorySelector } from '../components/CategorySelector';
import { ItemCard } from '../components/ItemCard';
import { InventoryItem } from '../types/inventory';
import { RootStackParamList } from '../navigation/types';
import { getAllItems } from '../services/InventoryService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Content = styled.View`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.lg}px;
`;

const ListContainer = styled.View`
  flex: 1;
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

export const InventoryScreen: React.FC = () => {
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

  const handleItemPress = (item: InventoryItem) => {
    console.log('Item pressed:', item.name);
    // TODO: Navigate to item detail screen
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
          icon="list"
          title="所有物品"
          subtitle="加载中..."
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
        title="所有物品"
        subtitle={`${items.length}个宝贝`}
        onSettingsPress={handleSettingsPress}
      />
      <Content>
        <SearchInput />
        <CategorySelector />
        <ListContainer>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ItemCard item={item} onPress={handleItemPress} />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: bottomPadding }}
          />
        </ListContainer>
      </Content>
    </Container>
  );
};

