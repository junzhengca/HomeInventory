import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FlatList, ActivityIndicator, View } from 'react-native';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { StyledProps } from '../utils/styledComponents';

import { PageHeader } from '../components/PageHeader';
import { SearchInput } from '../components/SearchInput';
import { CategorySelector } from '../components/CategorySelector';
import { ItemCard } from '../components/ItemCard';
import { EmptyState } from '../components/EmptyState';
import { LoginBottomSheet } from '../components/LoginBottomSheet';
import { SignupBottomSheet } from '../components/SignupBottomSheet';
import { InventoryItem } from '../types/inventory';
import { RootStackParamList } from '../navigation/types';
import { useInventory, useSelectedCategory, useAuth } from '../store/hooks';
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { items, loading: isLoading, loadItems } = useInventory();
  const { inventoryCategory, setInventoryCategory } = useSelectedCategory();
  const { user, isAuthenticated } = useAuth();
  const loginBottomSheetRef = useRef<BottomSheetModal>(null);
  const signupBottomSheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Initialize and sync selectedCategory from context
  useEffect(() => {
    if (inventoryCategory) {
      setSelectedCategory(inventoryCategory);
    }
  }, [inventoryCategory]);

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

  const handleAvatarPress = () => {
    if (isAuthenticated) {
      const rootNavigation = navigation.getParent();
      if (rootNavigation) {
        rootNavigation.navigate('Profile');
      }
    } else {
      loginBottomSheetRef.current?.present();
    }
  };

  const handleSignupPress = () => {
    loginBottomSheetRef.current?.dismiss();
    signupBottomSheetRef.current?.present();
  };

  const handleLoginPress = () => {
    signupBottomSheetRef.current?.dismiss();
    loginBottomSheetRef.current?.present();
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
          avatarUrl={user?.avatarUrl}
          onSettingsPress={handleSettingsPress}
          onAvatarPress={handleAvatarPress}
        />
        <LoadingContainer>
          <ActivityIndicator size="large" />
        </LoadingContainer>
        <LoginBottomSheet
          bottomSheetRef={loginBottomSheetRef}
          onSignupPress={handleSignupPress}
        />
        <SignupBottomSheet
          bottomSheetRef={signupBottomSheetRef}
          onLoginPress={handleLoginPress}
        />
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader
        icon="list"
        title={t('inventory.title')}
        subtitle={t('inventory.itemsCount', { count: filteredItems.length })}
        avatarUrl={user?.avatarUrl}
        onSettingsPress={handleSettingsPress}
        onAvatarPress={handleAvatarPress}
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
      <LoginBottomSheet
        bottomSheetRef={loginBottomSheetRef}
        onSignupPress={handleSignupPress}
      />
      <SignupBottomSheet
        bottomSheetRef={signupBottomSheetRef}
        onLoginPress={handleLoginPress}
      />
    </Container>
  );
};

