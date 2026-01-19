import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FlatList, ActivityIndicator, View, Dimensions } from 'react-native';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { StyledProps } from '../utils/styledComponents';

import { PageHeader } from '../components/PageHeader';
import { SearchInput } from '../components/SearchInput';
import { ItemCard } from '../components/ItemCard';
import { EmptyState } from '../components/EmptyState';
import { LoginBottomSheet } from '../components/LoginBottomSheet';
import { SignupBottomSheet } from '../components/SignupBottomSheet';
import { EnableSyncBottomSheet } from '../components/EnableSyncBottomSheet';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { CreateItemBottomSheet } from '../components/CreateItemBottomSheet';
import { InventoryItem } from '../types/inventory';
import { RootStackParamList } from '../navigation/types';
import { useInventory, useSync, useAuth } from '../store/hooks';
import { calculateBottomPadding } from '../utils/layout';
import * as SecureStore from 'expo-secure-store';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const Content = styled(View)`
  flex: 1;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const ListContainer = styled(View)`
  flex: 1;
`;

const LoadingContainer = styled(View)`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

export const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { items, loading: isLoading, loadItems } = useInventory();
  const { isSyncEnabled } = useSync();
  const { user } = useAuth();
  const loginBottomSheetRef = useRef<BottomSheetModal>(null);
  const signupBottomSheetRef = useRef<BottomSheetModal>(null);
  const enableSyncBottomSheetRef = useRef<BottomSheetModal>(null);
  const createItemBottomSheetRef = useRef<BottomSheetModal>(null);

  // Calculate card width for 2-column grid to prevent the "last row single item" expansion issue
  const cardWidth = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const contentPadding = 16 * 2; // theme.spacing.md on each side
    const gap = 12;
    return (screenWidth - contentPadding - gap) / 2;
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleLoginSuccess = async () => {
    // Always show the enable sync prompt after login
    enableSyncBottomSheetRef.current?.present();
  };

  const handleSignupSuccess = async () => {
    // Check if we should show the enable sync prompt
    if (isSyncEnabled) {
      return;
    }

    // Check if we've already shown the prompt
    const hasShownPrompt = await SecureStore.getItemAsync('has_shown_sync_prompt');
    if (hasShownPrompt === 'true') {
      return;
    }

    // Show the enable sync prompt
    enableSyncBottomSheetRef.current?.present();
  };

  const handleSyncPromptSkip = async () => {
    // Mark that we've shown the prompt
    await SecureStore.setItemAsync('has_shown_sync_prompt', 'true');
  };

  const handleSyncPromptEnable = async () => {
    // Mark that we've shown the prompt
    await SecureStore.setItemAsync('has_shown_sync_prompt', 'true');
  };

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    let filtered = items;

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
  }, [searchQuery, items]);

  const handleItemPress = (item: InventoryItem) => {
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('ItemDetails', { itemId: item.id });
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

  const handleManualAdd = () => {
    createItemBottomSheetRef.current?.present();
  };

  const handleAIAutomatic = () => {
    console.log('AI automatic button pressed');
    // TODO: Implement AI automatic functionality
  };

  const handleAvatarPress = () => {
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('Profile');
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
          showRightButtons={true}
          avatarUrl={user?.avatarUrl}
          onAvatarPress={handleAvatarPress}
        />
        <LoadingContainer>
          <ActivityIndicator size="large" />
        </LoadingContainer>
        <LoginBottomSheet
          bottomSheetRef={loginBottomSheetRef}
          onSignupPress={handleSignupPress}
          onLoginSuccess={handleLoginSuccess}
        />
        <SignupBottomSheet
          bottomSheetRef={signupBottomSheetRef}
          onLoginPress={handleLoginPress}
          onSignupSuccess={handleSignupSuccess}
        />
        <EnableSyncBottomSheet
          bottomSheetRef={enableSyncBottomSheetRef}
          onSkip={handleSyncPromptSkip}
          onEnableSync={handleSyncPromptEnable}
        />
        <CreateItemBottomSheet bottomSheetRef={createItemBottomSheetRef} />
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader
        icon="list"
        title={t('inventory.title')}
        subtitle={t('inventory.itemsCount', { count: filteredItems.length })}
        showRightButtons={true}
        avatarUrl={user?.avatarUrl}
        onAvatarPress={handleAvatarPress}
      />
      <Content>
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ListContainer>
          {filteredItems.length === 0 ? (
            <EmptyState
              icon="list-outline"
              title={t('inventory.empty.title')}
              description={searchQuery.trim()
                ? t('inventory.empty.filtered')
                : t('inventory.empty.description')}
            />
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={{ width: cardWidth }}>
                  <ItemCard item={item} onPress={handleItemPress} />
                </View>
              )}
              numColumns={2}
              columnWrapperStyle={{
                gap: 12,
                marginBottom: 12,
              }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ 
                paddingBottom: bottomPadding,
              }}
            />
          )}
        </ListContainer>
      </Content>
      <LoginBottomSheet
        bottomSheetRef={loginBottomSheetRef}
        onSignupPress={handleSignupPress}
        onLoginSuccess={handleLoginSuccess}
      />
      <SignupBottomSheet
        bottomSheetRef={signupBottomSheetRef}
        onLoginPress={handleLoginPress}
        onSignupSuccess={handleSignupSuccess}
      />
      <EnableSyncBottomSheet
        bottomSheetRef={enableSyncBottomSheetRef}
        onSkip={handleSyncPromptSkip}
        onEnableSync={handleSyncPromptEnable}
      />
      <CreateItemBottomSheet bottomSheetRef={createItemBottomSheetRef} />
      <FloatingActionButton
        onManualAdd={handleManualAdd}
        onAIAutomatic={handleAIAutomatic}
      />
    </Container>
  );
};

