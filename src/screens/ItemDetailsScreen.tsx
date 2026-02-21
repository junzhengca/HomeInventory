import React, { useState, useEffect, useRef } from 'react';
import { Alert, ActivityIndicator, ScrollView, View, Text } from 'react-native';
import styled from 'styled-components/native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import { useInventory, useSettings, useAppSelector, useInventoryCategories, useLocations } from '../store/hooks';
import { selectItemById } from '../store/slices/inventorySlice';
import { RootStackParamList } from '../navigation/types';
import { InventoryItem } from '../types/inventory';
import { inventoryService } from '../services/InventoryService';
import {
  getCurrencySymbol,
  EditItemBottomSheet,
  type EditItemBottomSheetRef,
  PageHeader,
  BottomActionBar,
  BatchItemCard,
  Button,
  AddBatchBottomSheet,
} from '../components';
import { useItemActions } from '../hooks/useItemActions';
import { useHome } from '../hooks/useHome';

import { calculateBottomActionBarPadding } from '../utils/layout';
import { getTotalAmount } from '../utils/batchUtils';
import { getLocationDisplayName } from '../utils/locationI18n';
import { getInventoryCategoryDisplayName } from '../utils/inventoryCategoryI18n';
import type { StyledProps } from '../utils/styledComponents';
import { uiLogger } from '../utils/Logger';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProp = {
  key: string;
  name: 'ItemDetails';
  params: { itemId: string };
};

const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const ScrollContainer = styled(View)`
  flex: 1;
  overflow: hidden;
`;

const Content = styled(ScrollView)`
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;


const EmptyBatchText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.textLight};
  text-align: center;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const HeaderCard = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.lg}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const ItemName = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const BadgesContainer = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

const BadgesAndQuantityRow = styled(View)`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const Badge = styled(View) <{ color?: string }>`
  background-color: ${({ color, theme }: StyledProps & { color?: string }) => color || theme.colors.primary};
  padding-horizontal: 12px;
  padding-vertical: 4px;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
`;

const BadgeText = styled(Text)`
  color: white;
  font-size: 12px;
  font-weight: 600;
`;

const TotalAmountRow = styled(View)`
  flex-direction: row;
  align-items: baseline;
`;

const TotalAmountLabel = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-right: 4px;
`;

const TotalAmountValue = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;


const Section = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const SectionTitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const LoadingContainer = styled(View)`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const ErrorContainer = styled(View)`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  padding-bottom: 120px;
`;

const ErrorText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  text-align: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;


export const ItemDetailsScreen: React.FC = () => {
  const theme = useTheme();
  const { settings } = useSettings();
  const { confirmDelete } = useItemActions();
  const { currentHomeId } = useHome();
  const { categories } = useInventoryCategories();
  const { locations, refreshLocations } = useLocations();
  const { loading: itemsLoading, loadItems } = useInventory();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { itemId } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Get item from Redux store
  const itemFromRedux = useAppSelector((state) => selectItemById(state, itemId));
  const [item, setItem] = useState<InventoryItem | null>(itemFromRedux);
  const [isLoading, setIsLoading] = useState(!itemFromRedux && itemsLoading);
  const [locationName, setLocationName] = useState<string>('');
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryColor, setCategoryColor] = useState<string | undefined>(undefined);
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const addBatchBottomSheetRef = useRef<BottomSheetModal>(null);
  const editBottomSheetRef = useRef<EditItemBottomSheetRef>(null);

  const currencySymbol = getCurrencySymbol(settings.currency);

  // Load item if not in Redux
  useEffect(() => {
    const loadItem = async () => {
      // If item is in Redux, use it
      if (itemFromRedux) {
        setItem(itemFromRedux);
        setIsLoading(false);
        return;
      }

      // If items are still loading, wait
      if (itemsLoading) {
        return;
      }

      // Items are loaded but item not found, try loading from service
      setIsLoading(true);
      try {
        if (!currentHomeId) {
          setIsLoading(false);
          Alert.alert(t('itemDetails.error.title'), t('itemDetails.error.noHome'));
          navigation.goBack();
          return;
        }
        const itemData = inventoryService.getItemById(currentHomeId, itemId);
        if (itemData) {
          setItem(itemData);
          // Trigger a reload of items to sync Redux
          loadItems();
        } else {
          Alert.alert(t('itemDetails.error.title'), t('itemDetails.error.itemNotFound'));
          navigation.goBack();
        }
      } catch (error) {
        uiLogger.error('Error loading item', error);
        Alert.alert(t('itemDetails.error.title'), t('itemDetails.error.loadFailed'));
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    };

    loadItem();
  }, [itemFromRedux, currentHomeId, itemId, itemsLoading, loadItems, navigation, t]);

  // Load locations on mount
  useEffect(() => {
    refreshLocations();
  }, [refreshLocations]);

  // Load location and status when item changes
  useEffect(() => {
    if (item) {
      const location = locations.find((loc) => loc.id === item.location);
      setLocationName(location ? getLocationDisplayName(location, t) : item.location);

      // Load category if exists
      if (item.categoryId) {
        const category = categories.find(c => c.id === item.categoryId);
        if (category) {
          setCategoryName(getInventoryCategoryDisplayName(category, t));
          setCategoryColor(category.color);
        } else {
          setCategoryName('');
          setCategoryColor(undefined);
        }
      } else {
        setCategoryName('');
        setCategoryColor(undefined);
      }
    }
  }, [item, t, categories, locations]);

  const handleDelete = () => {
    confirmDelete(itemId, () => {
      navigation.goBack();
    });
  };

  const handleModify = () => {
    editBottomSheetRef.current?.present(itemId);
  };

  const handleItemUpdated = () => {
    // Item will be updated in Redux, no need to reload
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleAddBatch = () => {
    addBatchBottomSheetRef.current?.present();
  };

  const handleBatchAdded = () => {
    // Item will be updated in Redux
  };

  const totalAmount = item ? getTotalAmount(item.batches || []) : 0;

  // Calculate bottom padding for action bar
  const bottomPadding = calculateBottomActionBarPadding(insets.bottom);

  if (isLoading || !item) {
    return (
      <Container>
        <PageHeader
          icon="cube"
          title={t('itemDetails.title')}
          subtitle={t('itemDetails.loading')}
          showBackButton={true}
          onBackPress={handleClose}
          showRightButtons={false}
        />
        <LoadingContainer>
          <ActivityIndicator size="large" />
        </LoadingContainer>
      </Container>
    );
  }

  if (!item) {
    return (
      <Container>
        <PageHeader
          icon="cube"
          title={t('itemDetails.title')}
          subtitle={t('itemDetails.itemNotFound')}
          showBackButton={true}
          onBackPress={handleClose}
          showRightButtons={false}
        />
        <ErrorContainer>
          <ErrorText>{t('itemDetails.itemNotFound')}</ErrorText>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader
        icon={item.icon}
        title={item.name}
        subtitle={locationName}
        showBackButton={true}
        onBackPress={handleClose}
        showRightButtons={false}
      />

      <ScrollContainer>
        <Content contentContainerStyle={{ paddingBottom: bottomPadding }}>

          {/* Item Header Card */}
          <HeaderCard>
            <ItemName>{item.name}</ItemName>

            <BadgesAndQuantityRow>
              <BadgesContainer>
                {locationName ? (
                  <Badge color={theme.colors.primary}>
                    <BadgeText>{t('common.location')}: {locationName}</BadgeText>
                  </Badge>
                ) : null}
                {categoryName ? (
                  <Badge color={categoryColor || theme.colors.secondary}>
                    <BadgeText>{t('common.category')}: {categoryName}</BadgeText>
                  </Badge>
                ) : null}
              </BadgesContainer>

              <TotalAmountRow>
                <TotalAmountLabel>{t('itemDetails.fields.quantity')} : </TotalAmountLabel>
                <TotalAmountValue>
                  {totalAmount}{item.batches && item.batches.length > 0 && item.batches[0].unit ? ` ${item.batches[0].unit}` : ''}
                </TotalAmountValue>
              </TotalAmountRow>
            </BadgesAndQuantityRow>
          </HeaderCard>



          {/* Batches Section */}
          <Section>
            <SectionTitle>{t('itemDetails.sections.batches')}</SectionTitle>
            <View style={{ marginBottom: 12 }}>
              <Button
                label={t('itemDetails.batch.addBatch')}
                onPress={handleAddBatch}
                variant="secondary"
                icon="add"
              />
            </View>
            {(item.batches || []).length > 0 ? (
              (item.batches || []).map((batch, index) => (
                <BatchItemCard
                  key={batch.id || index}
                  batch={batch}
                  currencySymbol={currencySymbol}
                />
              ))
            ) : (
              <EmptyBatchText>{t('itemDetails.noBatches')}</EmptyBatchText>
            )}
          </Section>
        </Content>
      </ScrollContainer>

      {/* Fixed Bottom Bar */}
      <BottomActionBar
        actions={[
          {
            label: t('itemDetails.actions.delete'),
            onPress: handleDelete,
            variant: 'danger',
            iconName: 'trash-outline',
          },
          {
            label: t('itemDetails.actions.modify'),
            onPress: handleModify,
            variant: 'filled',
            iconName: 'create-outline',
          },
        ]}
      />

      <EditItemBottomSheet
        ref={editBottomSheetRef}
        bottomSheetRef={bottomSheetModalRef}
        onItemUpdated={handleItemUpdated}
      />

      {item && (
        <AddBatchBottomSheet
          bottomSheetRef={addBatchBottomSheetRef}
          item={item}
          onBatchAdded={handleBatchAdded}
        />
      )}
    </Container>
  );
};

