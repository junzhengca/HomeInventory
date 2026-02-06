import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  FlatList,
  ActivityIndicator,
  View,
  Dimensions,
  TouchableOpacity,
  Text,
  Alert,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../theme/ThemeProvider';
import type { StyledProps } from '../utils/styledComponents';

import {
  PageHeader,
  LocationFilter,
  StatusFilter,
  CategoryFilter,
  ItemCard,
  EmptyState,
  LoginBottomSheet,
  SignupBottomSheet,
  FloatingActionButton,
  CreateItemBottomSheet,
  EditItemBottomSheet,
  type EditItemBottomSheetRef,
  ContextMenu,
  HomeSwitcher,
} from '../components';
import { useItemActions } from '../hooks/useItemActions';
import { InventoryItem } from '../types/inventory';
import { RootStackParamList } from '../navigation/types';
import { useInventory, useAuth, useTodos } from '../store/hooks';
import { useHome } from '../hooks/useHome';
import { calculateBottomPadding } from '../utils/layout';
import { useToast } from '../hooks/useToast';

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

const FilterRow = styled(View)`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const FilterToggleBtn = styled(TouchableOpacity)`
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.border};
`;

const FilterToggleText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  font-weight: ${({ theme }: StyledProps) =>
    theme.typography.fontWeight.medium};
`;

const VerticalDivider = styled(View)`
  width: 1px;
  height: 34px;
  background-color: ${({ theme }: StyledProps) => theme.colors.border};
  margin-horizontal: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const LoadingContainer = styled(View)`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

export const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null
  );
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'location' | 'status'>(
    'location'
  );
  const [isAIRecognizing, setIsAIRecognizing] = useState(false);
  const [recognizedItemData, setRecognizedItemData] =
    useState<Partial<InventoryItem> | null>(null);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { items, loading: isLoading, loadItems, updateItem: updateInventoryItem } = useInventory();
  const { user, getApiClient } = useAuth();
  const { currentHome } = useHome();
  const theme = useTheme();
  const loginBottomSheetRef = useRef<BottomSheetModal | null>(null);
  const signupBottomSheetRef = useRef<BottomSheetModal | null>(null);
  const createItemBottomSheetRef = useRef<BottomSheetModal | null>(null);
  const editBottomSheetRef = useRef<EditItemBottomSheetRef>(null);
  const editBottomSheetModalRef = useRef<BottomSheetModal>(null);

  const { confirmDelete } = useItemActions();
  const { addTodo } = useTodos();
  const { showToast } = useToast();

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

  // Calculate counts for locations and statuses
  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      counts[item.location] = (counts[item.location] || 0) + 1;
    });
    return counts;
  }, [items]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
    });
    return counts;
  }, [items]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      if (item.categoryId) {
        counts[item.categoryId] = (counts[item.categoryId] || 0) + 1;
      }
    });
    return counts;
  }, [items]);

  // Filter items based on location and search query
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Filter by location first
    if (selectedLocationId !== null) {
      filtered = filtered.filter(
        (item) => item.location === selectedLocationId
      );
    }

    // Filter by status
    if (selectedStatusId !== null) {
      filtered = filtered.filter((item) => item.status === selectedStatusId);
    }

    // Filter by category
    if (selectedCategoryId !== null) {
      filtered = filtered.filter((item) => item.categoryId === selectedCategoryId);
    }

    return filtered;
  }, [selectedLocationId, selectedStatusId, selectedCategoryId, items]);

  const canAccessInventory = useMemo(() => {
    if (!currentHome) return true; // Default to true if no home context (local only)
    if (currentHome.role === 'owner') return true;
    return currentHome.settings?.canShareInventory ?? true;
  }, [currentHome]);

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
    setRecognizedItemData({
      location: selectedLocationId || undefined,
      status: selectedStatusId || undefined,
    });
    createItemBottomSheetRef.current?.present();
  };

  const handleItemCreated = () => {
    setRecognizedItemData(null);
  };

  const handleLoginSuccess = useCallback(async () => {
    // User will be automatically updated via auth state
  }, []);

  const handleSignupSuccess = useCallback(async () => {
    // User will be automatically updated via auth state
  }, []);

  const handleAIAutomatic = useCallback(async () => {
    try {
      setIsAIRecognizing(true);
      let result;

      // Try to use camera first (if not on web)
      if (Platform.OS !== 'web') {
        try {
          // Request camera permissions
          const cameraPermission =
            await ImagePicker.requestCameraPermissionsAsync();

          if (cameraPermission.granted) {
            // Try to launch camera
            result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: 0.8,
            });
          } else {
            // Permission denied, use image picker
            throw new Error('Camera permission denied');
          }
        } catch {
          // Camera not available or failed (e.g., on simulator), use image picker
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
          });
        }
      } else {
        // On web, use image picker
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.8,
        });
      }

      if (result.canceled) {
        setIsAIRecognizing(false);
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        setIsAIRecognizing(false);
        return;
      }

      const imageUri = result.assets[0].uri;
      // Get original dimensions, default to reasonable values if not available
      const originalWidth = result.assets[0].width || 1920;
      const originalHeight = result.assets[0].height || 1080;

      // Calculate dimensions to maintain aspect ratio with max 720p (1280x720)
      let targetWidth = originalWidth;
      let targetHeight = originalHeight;
      const maxWidth = 1280;
      const maxHeight = 720;

      if (originalWidth > maxWidth || originalHeight > maxHeight) {
        const aspectRatio = originalWidth / originalHeight;

        if (originalWidth > originalHeight) {
          // Landscape: constrain by width
          targetWidth = maxWidth;
          targetHeight = Math.round(maxWidth / aspectRatio);
        } else if (originalHeight > originalWidth) {
          // Portrait: constrain by height
          targetHeight = maxHeight;
          targetWidth = Math.round(maxHeight * aspectRatio);
        } else {
          // Square: use max dimension
          targetWidth = Math.min(maxWidth, maxHeight);
          targetHeight = targetWidth;
        }
      }

      // Resize image to max 720p
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: targetWidth, height: targetHeight } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Convert resized image to base64
      const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
        encoding: 'base64',
      });

      // Call AI recognition API
      const apiClient = getApiClient();
      if (!apiClient) {
        throw new Error('API client not available');
      }

      const recognizedItem = await apiClient.recognizeItem(base64);

      setRecognizedItemData(recognizedItem);

      createItemBottomSheetRef.current?.present();
    } catch (error) {
      console.error('AI automatic image capture error:', error);
      Alert.alert(
        t('createItem.errors.title'),
        error instanceof Error
          ? error.message
          : 'Failed to capture image. Please try again.'
      );
    } finally {
      setIsAIRecognizing(false);
    }
  }, [t, getApiClient]);

  const handleAvatarPress = () => {
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('Profile');
    }
  };

  // Calculate bottom padding for scrollable content
  const bottomPadding = calculateBottomPadding(insets.bottom);

  const headerSubtitle = isLoading
    ? t('inventory.loading')
    : t('inventory.itemsCount', { count: filteredItems.length });

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <Container>
        <PageHeader
          icon="home"
          titleComponent={<HomeSwitcher />}
          subtitle={headerSubtitle}
          showRightButtons={true}
          avatarUrl={user?.avatarUrl}
          ownerAvatarUrl={currentHome?.owner?.avatarUrl}
          onAvatarPress={handleAvatarPress}
        />
        {/* Check if user has access to item library */}
        {!canAccessInventory ? (
          <EmptyState
            icon="lock-closed"
            title={t('accessControl.itemLibrary.title')}
            description={t('accessControl.itemLibrary.description')}
          />
        ) : isLoading ? (
          <LoadingContainer>
            <ActivityIndicator size="large" />
          </LoadingContainer>
        ) : (
          <Content>
            <CategoryFilter
              selectedCategoryId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
              counts={categoryCounts}
            />
            <FilterRow>
              <FilterToggleBtn
                onPress={() => {
                  setFilterMode((prev) =>
                    prev === 'location' ? 'status' : 'location'
                  );
                  setSelectedLocationId(null);
                  setSelectedStatusId(null);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={
                    filterMode === 'location'
                      ? 'location-outline'
                      : 'pricetag-outline'
                  }
                  size={18}
                  color={theme.colors.primary}
                />
                <FilterToggleText>
                  {t(`inventory.filterType.${filterMode}`)}
                </FilterToggleText>
              </FilterToggleBtn>
              <VerticalDivider />
              {filterMode === 'location' ? (
                <LocationFilter
                  selectedLocationId={selectedLocationId}
                  onSelect={setSelectedLocationId}
                  counts={locationCounts}
                />
              ) : (
                <StatusFilter
                  selectedStatusId={selectedStatusId}
                  onSelect={setSelectedStatusId}
                  counts={statusCounts}
                />
              )}
            </FilterRow>
            <ListContainer>
              {filteredItems.length === 0 ? (
                <EmptyState
                  icon="list-outline"
                  title={t('inventory.empty.title')}
                  description={
                    selectedLocationId !== null ||
                      selectedStatusId !== null ||
                      selectedCategoryId !== null
                      ? t('inventory.empty.filtered')
                      : t('inventory.empty.description')
                  }
                />
              ) : (
                <FlatList
                  data={filteredItems}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const menuItems = [
                      {
                        id: 'plus',
                        label: t('inventory.actions.plusOne'),
                        icon: 'plus',
                        onPress: () => {
                          updateInventoryItem(item.id, { amount: (item.amount || 0) + 1 });
                        },
                      },
                      {
                        id: 'minus',
                        label: t('inventory.actions.minusOne'),
                        icon: 'minus',
                        onPress: () => {
                          updateInventoryItem(item.id, { amount: Math.max(0, (item.amount || 0) - 1) });
                        },
                      },
                      {
                        id: 'add-to-todo',
                        label: t('inventory.actions.addToTodo'),
                        icon: 'playlist-plus',
                        onPress: () => {
                          addTodo(item.name);
                          showToast(t('toast.addToTodoSuccess'));
                        },
                      },
                      {
                        id: 'edit',
                        label: t('itemDetails.actions.modify'),
                        icon: 'pencil-outline',
                        onPress: () => {
                          editBottomSheetRef.current?.present(item.id);
                        },
                      },
                      {
                        id: 'delete',
                        label: t('itemDetails.actions.delete'),
                        icon: 'trash-can-outline',
                        onPress: () => {
                          confirmDelete(item.id);
                        },
                        isDestructive: true,
                      },
                    ];

                    return (
                      <View style={{ width: cardWidth }}>
                        <ContextMenu items={menuItems}>
                          <ItemCard item={item} onPress={handleItemPress} />
                        </ContextMenu>
                      </View>
                    );
                  }}
                  numColumns={2}
                  columnWrapperStyle={{
                    gap: 12,
                    marginBottom: 12,
                  }}
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingBottom: bottomPadding,
                  }}
                />
              )}
            </ListContainer>
          </Content>
        )}
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
        <CreateItemBottomSheet
          bottomSheetRef={createItemBottomSheetRef}
          initialData={recognizedItemData}
          onItemCreated={handleItemCreated}
          onSheetClose={() => setRecognizedItemData(null)}
        />
        <EditItemBottomSheet
          ref={editBottomSheetRef}
          bottomSheetRef={editBottomSheetModalRef}
        />
        {canAccessInventory && (
          <FloatingActionButton
            onManualAdd={handleManualAdd}
            onAIAutomatic={handleAIAutomatic}
            isAIRecognizing={isAIRecognizing}
          />
        )}
      </Container>
    </TouchableWithoutFeedback>
  );
};
