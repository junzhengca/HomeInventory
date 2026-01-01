import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, ActivityIndicator, ScrollView, View, Text } from 'react-native';
import styled from 'styled-components/native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import { useInventory, useSettings, useAppSelector } from '../store/hooks';
import { selectItemById } from '../store/slices/inventorySlice';
import { RootStackParamList } from '../navigation/types';
import { Category, InventoryItem } from '../types/inventory';
import { getCategoryById } from '../services/CategoryService';
import { getItemById } from '../services/InventoryService';
import { locations } from '../data/locations';
import { getCurrencySymbol } from '../components/CurrencySelector';
import { EditItemBottomSheet } from '../components/EditItemBottomSheet';
import { PageHeader } from '../components/PageHeader';
import { BottomActionBar } from '../components/BottomActionBar';
import { formatDate, formatPrice } from '../utils/formatters';
import { getLightColor } from '../utils/colors';
import { calculateBottomActionBarPadding } from '../utils/layout';
import type { Theme } from '../theme/types';
import type { StyledProps } from '../utils/styledComponents';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProp = {
  key: string;
  name: 'ItemDetails';
  params: { itemId: string };
};

const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const ScrollContainer = styled(View)`
  flex: 1;
  overflow: hidden;
`;

const Content = styled(ScrollView)`
  padding: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const IconContainer = styled(View)<{ backgroundColor: string }>`
  width: 100px;
  height: 100px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  background-color: ${({ backgroundColor }: { backgroundColor: string }) => backgroundColor};
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.1;
  shadow-radius: 8px;
  elevation: 4;
`;

const HeaderSection = styled(View)`
  align-items: center;
  padding: 0 ${({ theme }: StyledProps) => theme.spacing.lg}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const CategoryText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textLight};
  text-align: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const Section = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.lg}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.border};
`;

const SectionTitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const PropertyRow = styled(View)`
  flex-direction: row;
  align-items: center;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  border-bottom-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
`;

const PropertyRowLast = styled(View)`
  flex-direction: row;
  align-items: center;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const PropertyIcon = styled(View)`
  width: 36px;
  height: 36px;
  border-radius: 18px;
  background-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const PropertyContent = styled(View)`
  flex: 1;
`;

const PropertyLabel = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.textLight};
  margin-bottom: 2px;
`;

const PropertyValue = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const TagsContainer = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const Tag = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const TagText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
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
  const { deleteItem, loading: itemsLoading, loadItems } = useInventory();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { itemId } = route.params;
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  // Get item from Redux store
  const itemFromRedux = useAppSelector((state) => selectItemById(state, itemId));
  const [item, setItem] = useState<InventoryItem | null>(itemFromRedux);
  const [isLoading, setIsLoading] = useState(!itemFromRedux && itemsLoading);
  const [locationName, setLocationName] = useState<string>('');
  const [category, setCategory] = useState<Category | null>(null);
  const editBottomSheetRef = useRef<BottomSheetModal | null>(null);

  const currencySymbol = getCurrencySymbol(settings.currency);

  const getLocale = useCallback(() => {
    return i18n.language === 'zh' ? 'zh-CN' : 'en-US';
  }, [i18n.language]);

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
        const itemData = await getItemById(itemId);
        if (itemData) {
          setItem(itemData);
          // Trigger a reload of items to sync Redux
          loadItems();
        } else {
          Alert.alert(t('itemDetails.error.title'), t('itemDetails.error.itemNotFound'));
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error loading item:', error);
        Alert.alert(t('itemDetails.error.title'), t('itemDetails.error.loadFailed'));
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    };

    loadItem();
  }, [itemFromRedux, itemId, itemsLoading, loadItems, navigation, t]);

  // Load location and category when item changes
  useEffect(() => {
    if (item) {
      const location = locations.find((loc) => loc.id === item.location);
      // Use i18n translation for location name
      setLocationName(location ? t(`locations.${location.id}`) : item.location);

      // Load category
      getCategoryById(item.category).then((categoryData) => {
        setCategory(categoryData);
      }).catch((error) => {
        console.error('Error loading category:', error);
      });
    }
  }, [item, t]);

  const handleDelete = () => {
    Alert.alert(
      t('itemDetails.delete.title'),
      t('itemDetails.delete.message'),
      [
        {
          text: t('itemDetails.delete.cancel'),
          style: 'cancel',
        },
        {
          text: t('itemDetails.delete.confirm'),
          style: 'destructive',
          onPress: () => {
            deleteItem(itemId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleModify = () => {
    editBottomSheetRef.current?.present();
  };

  const handleItemUpdated = () => {
    // Item will be updated in Redux, no need to reload
  };

  const handleClose = () => {
    navigation.goBack();
  };

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
        <HeaderSection>
          <IconContainer backgroundColor={getLightColor(item.iconColor)}>
            <Ionicons name={item.icon} size={48} color={item.iconColor} />
          </IconContainer>
          <CategoryText>
            {category ? (category.isCustom ? category.label : t(`categories.${category.name}`)) : t('categories.other')}
          </CategoryText>
        </HeaderSection>

        {/* Value Information Section */}
        <Section>
          <SectionTitle>{t('itemDetails.sections.value')}</SectionTitle>
          <PropertyRow>
            <PropertyIcon>
              <Ionicons name="pricetag" size={18} color={theme.colors.textSecondary} />
            </PropertyIcon>
            <PropertyContent>
              <PropertyLabel>{t('itemDetails.fields.valuation')}</PropertyLabel>
              <PropertyValue>{formatPrice(item.price, currencySymbol)}</PropertyValue>
            </PropertyContent>
          </PropertyRow>
          <PropertyRowLast>
            <PropertyIcon>
              <Ionicons name="calendar" size={18} color={theme.colors.textSecondary} />
            </PropertyIcon>
            <PropertyContent>
              <PropertyLabel>{t('itemDetails.fields.purchaseDate')}</PropertyLabel>
              <PropertyValue>{formatDate(item.purchaseDate, getLocale(), t)}</PropertyValue>
            </PropertyContent>
          </PropertyRowLast>
        </Section>

        {/* Location Information Section */}
        <Section>
          <SectionTitle>{t('itemDetails.sections.location')}</SectionTitle>
          <PropertyRow>
            <PropertyIcon>
              <Ionicons name="home" size={18} color={theme.colors.textSecondary} />
            </PropertyIcon>
            <PropertyContent>
              <PropertyLabel>{t('itemDetails.fields.location')}</PropertyLabel>
              <PropertyValue>{locationName}</PropertyValue>
            </PropertyContent>
          </PropertyRow>
          <PropertyRowLast>
            <PropertyIcon>
              <Ionicons name="location" size={18} color={theme.colors.textSecondary} />
            </PropertyIcon>
            <PropertyContent>
              <PropertyLabel>{t('itemDetails.fields.detailedLocation')}</PropertyLabel>
              <PropertyValue>{item.detailedLocation || t('itemDetails.notSet')}</PropertyValue>
            </PropertyContent>
          </PropertyRowLast>
        </Section>

        {/* Quantity Information Section */}
        <Section>
          <SectionTitle>{t('itemDetails.sections.quantity')}</SectionTitle>
          <PropertyRowLast>
            <PropertyIcon>
              <Ionicons name="cube" size={18} color={theme.colors.textSecondary} />
            </PropertyIcon>
            <PropertyContent>
              <PropertyLabel>{t('itemDetails.fields.quantity')}</PropertyLabel>
              <PropertyValue>{item.amount || 1}</PropertyValue>
            </PropertyContent>
          </PropertyRowLast>
        </Section>

        {/* Expiry Date Section */}
        {item.expiryDate && (
          <Section>
            <SectionTitle>{t('itemDetails.sections.expiry')}</SectionTitle>
            <PropertyRowLast>
              <PropertyIcon>
                <Ionicons name="hourglass" size={18} color={theme.colors.textSecondary} />
              </PropertyIcon>
              <PropertyContent>
                <PropertyLabel>{t('itemDetails.fields.expiryDate')}</PropertyLabel>
                <PropertyValue>{formatDate(item.expiryDate, getLocale(), t)}</PropertyValue>
              </PropertyContent>
            </PropertyRowLast>
          </Section>
        )}

        {/* Tags Section */}
        {item.tags && item.tags.length > 0 && (
          <Section>
            <SectionTitle>{t('itemDetails.sections.tags')}</SectionTitle>
            <TagsContainer>
              {item.tags.map((tag, index) => (
                <Tag key={index}>
                  <TagText>#{tag}</TagText>
                </Tag>
              ))}
            </TagsContainer>
          </Section>
        )}
      </Content>
      </ScrollContainer>

      {/* Fixed Bottom Bar */}
      <BottomActionBar
        actions={[
          {
            label: t('itemDetails.actions.delete'),
            onPress: handleDelete,
            variant: 'danger',
            icon: <Ionicons name="trash-outline" size={18} color={theme.colors.error} />,
          },
          {
            label: t('itemDetails.actions.modify'),
            onPress: handleModify,
            variant: 'filled',
            icon: <Ionicons name="create-outline" size={18} color={theme.colors.surface} />,
          },
        ]}
      />

      <EditItemBottomSheet
        bottomSheetRef={editBottomSheetRef}
        itemId={itemId}
        onItemUpdated={handleItemUpdated}
      />
    </Container>
  );
};

