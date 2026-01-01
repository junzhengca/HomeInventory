import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { TouchableOpacity, Alert, ScrollView, View, Text, Keyboard } from 'react-native';
import styled from 'styled-components/native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import type { StyledProps, StyledPropsWith } from '../utils/styledComponents';
import { Category, InventoryItem } from '../types/inventory';
import { locations } from '../data/locations';
import { getAllCategories } from '../services/CategoryService';
import { getItemById } from '../services/InventoryService';
import { useInventory, useCategory, useAppSelector } from '../store/hooks';
import { selectItemById } from '../store/slices/inventorySlice';
import { filterItemCategories } from '../utils/categoryUtils';
import { CategoryManagerBottomSheet } from './CategoryManagerBottomSheet';
import { BottomActionBar } from './BottomActionBar';
import { DatePicker } from './DatePicker';

const Backdrop = styled(BottomSheetBackdrop)`
  background-color: rgba(0, 0, 0, 0.5);
`;

const Header = styled(View)`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const HeaderLeft = styled(View)`
  flex: 1;
`;

const Title = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.xxl}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const Subtitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

const CloseButton = styled(TouchableOpacity)`
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  align-items: center;
  justify-content: center;
`;

const ContentContainer = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
`;

const FormContainer = styled(View)`
  flex-direction: column;
  gap: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const FormSection = styled(View)``;

const Label = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const Input = styled(BottomSheetTextInput)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.border};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const CategorySection = styled(View)``;

const CategoryHeader = styled(View)`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const ManageCategoriesButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
`;

const ManageCategoriesText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.primary};
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const CategoryGrid = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
`;

const CategoryButton = styled(TouchableOpacity)<{ isSelected: boolean }>`
  width: 30%;
  aspect-ratio: 1;
  margin-right: 3.33%;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  background-color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primaryLightest : theme.colors.surface};
  border-width: 1.5px;
  border-color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const AddCategoryButton = styled(CategoryButton)`
  border-style: dashed;
  border-color: ${({ theme }: StyledProps) => theme.colors.border};
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const CategoryIcon = styled(View)<{ color?: string }>`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const CategoryLabel = styled(Text)<{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.text};
  text-align: center;
`;

const LocationScrollView = styled(ScrollView)`
  flex-direction: row;
  margin: 0;
  padding: 0;
`;

const LocationButton = styled(TouchableOpacity)<{ isSelected: boolean }>`
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  background-color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.border};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const LocationText = styled(Text)<{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.surface : theme.colors.text};
`;

const Row = styled(View)`
  flex-direction: row;
  gap: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const HalfContainer = styled(View)`
  flex: 1;
`;

const HalfInput = styled(Input)`
  flex: 1;
`;

const TagsContainer = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const Tag = styled(View)`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryLightest};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.primary};
`;

const TagText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.primary};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const TagRemoveButton = styled(TouchableOpacity)`
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const TagInputContainer = styled(View)`
  flex-direction: row;
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const TagInput = styled(Input)`
  flex: 1;
`;

const AddTagButton = styled(TouchableOpacity)`
  background-color: ${({ theme }: StyledProps) => theme.colors.primary};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  align-items: center;
  justify-content: center;
`;

// Memoized input components to prevent re-renders that interrupt IME composition
const MemoizedNameInput = memo<{
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  placeholderTextColor: string;
}>(({ value, onChangeText, placeholder, placeholderTextColor }) => {
  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor={placeholderTextColor}
      autoCorrect={false}
      spellCheck={false}
      textContentType="none"
      autoComplete="off"
    />
  );
});

const MemoizedPriceInput = memo<{
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  placeholderTextColor: string;
}>(({ value, onChangeText, placeholder, placeholderTextColor }) => {
  return (
    <HalfInput
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      keyboardType="numeric"
      placeholderTextColor={placeholderTextColor}
      autoCorrect={false}
      spellCheck={false}
      textContentType="none"
      autoComplete="off"
    />
  );
});

const MemoizedDetailedLocationInput = memo<{
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  placeholderTextColor: string;
}>(({ value, onChangeText, placeholder, placeholderTextColor }) => {
  return (
    <HalfInput
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor={placeholderTextColor}
      autoCorrect={false}
      spellCheck={false}
      textContentType="none"
      autoComplete="off"
    />
  );
});

const MemoizedAmountInput = memo<{
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  placeholderTextColor: string;
}>(({ value, onChangeText, placeholder, placeholderTextColor }) => {
  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      keyboardType="numeric"
      placeholderTextColor={placeholderTextColor}
      autoCorrect={false}
      spellCheck={false}
      textContentType="none"
      autoComplete="off"
    />
  );
});

const MemoizedTagInput = memo<{
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
  placeholder: string;
  placeholderTextColor: string;
}>(({ value, onChangeText, onSubmitEditing, placeholder, placeholderTextColor }) => {
  return (
    <TagInput
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor={placeholderTextColor}
      onSubmitEditing={onSubmitEditing}
      autoCorrect={false}
      spellCheck={false}
      textContentType="none"
      autoComplete="off"
    />
  );
});

MemoizedNameInput.displayName = 'MemoizedNameInput';
MemoizedPriceInput.displayName = 'MemoizedPriceInput';
MemoizedDetailedLocationInput.displayName = 'MemoizedDetailedLocationInput';
MemoizedAmountInput.displayName = 'MemoizedAmountInput';
MemoizedTagInput.displayName = 'MemoizedTagInput';

interface EditItemBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  itemId: string;
  onItemUpdated?: () => void;
}

export const EditItemBottomSheet: React.FC<EditItemBottomSheetProps> = ({
  bottomSheetRef,
  itemId,
  onItemUpdated,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { updateItem, loading: itemsLoading, loadItems } = useInventory();
  const { refreshCategories, registerRefreshCallback } = useCategory();
  // Get item from Redux store
  const itemFromRedux = useAppSelector((state) => itemId ? selectItemById(state, itemId) : null);
  const [item, setItem] = useState<InventoryItem | null>(itemFromRedux);
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [price, setPrice] = useState('0');
  const [detailedLocation, setDetailedLocation] = useState('');
  const [amount, setAmount] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const categoryManagerRef = React.useRef<BottomSheetModal>(null);
  const isModalOpenRef = React.useRef<boolean>(false);

  // Filter to get only item-type categories (exclude location categories)
  const itemTypeCategories = useMemo(() => {
    return filterItemCategories(categories);
  }, [categories]);

  // Load item if not in Redux
  useEffect(() => {
    const loadItem = async () => {
      // If item is in Redux, use it
      if (itemFromRedux) {
        setItem(itemFromRedux);
        return;
      }

      // If items are still loading, wait
      if (itemsLoading) {
        return;
      }

      // Items are loaded but item not found, try loading from service
      try {
        const itemData = await getItemById(itemId);
        if (itemData) {
          setItem(itemData);
          // Trigger a reload of items to sync Redux
          loadItems();
        }
      } catch (error) {
        console.error('Error loading item:', error);
      }
    };

    loadItem();
  }, [itemFromRedux, itemId, itemsLoading, loadItems]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const allCategories = await getAllCategories();
        setCategories(allCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    loadCategories();
  }, []);

  const loadCategoriesCallback = useCallback(async () => {
    try {
      const allCategories = await getAllCategories();
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  const handleCategoriesChanged = useCallback(() => {
    loadCategoriesCallback();
  }, [loadCategoriesCallback]);

  // Initialize form fields when modal opens or when item loads initially
  // Don't update form when item changes while modal is already open (prevents sync refill)
  useEffect(() => {
    if (item && !isModalOpenRef.current) {
      // Only initialize form when modal is closed (initial load)
      setName(item.name);
      setSelectedCategory(item.category);
      setSelectedLocation(item.location);
      setPrice(item.price.toString());
      setDetailedLocation(item.detailedLocation || '');
      setAmount(item.amount?.toString() || '');
      setTags(item.tags || []);
      setPurchaseDate(item.purchaseDate ? new Date(item.purchaseDate) : null);
      setExpiryDate(item.expiryDate ? new Date(item.expiryDate) : null);
    }
  }, [item]);

  // Initialize form when modal opens
  const handleSheetChanges = useCallback((index: number) => {
    if (index === 0) {
      // Modal opened
      isModalOpenRef.current = true;
      // Initialize form from current item when modal opens
      if (item) {
        setName(item.name);
        setSelectedCategory(item.category);
        setSelectedLocation(item.location);
        setPrice(item.price.toString());
        setDetailedLocation(item.detailedLocation || '');
        setAmount(item.amount?.toString() || '');
        setTags(item.tags || []);
        setPurchaseDate(item.purchaseDate ? new Date(item.purchaseDate) : null);
        setExpiryDate(item.expiryDate ? new Date(item.expiryDate) : null);
      }
    } else if (index === -1) {
      // Modal closed
      isModalOpenRef.current = false;
    }
  }, [item]);

  // Track keyboard visibility to adjust footer padding
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener('keyboardWillShow', () => {
      setIsKeyboardVisible(true);
    });

    const keyboardWillHideListener = Keyboard.addListener('keyboardWillHide', () => {
      setIsKeyboardVisible(false);
    });

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    const unregister = registerRefreshCallback(loadCategoriesCallback);
    return unregister;
  }, [registerRefreshCallback, loadCategoriesCallback]);

  const snapPoints = useMemo(() => ['100%'], []);

  // Use 'extend' to prevent IME composition interruption
  const keyboardBehavior = useMemo(() => 'extend' as const, []);
  const keyboardBlurBehavior = useMemo(() => 'restore' as const, []);

  // Stable onChangeText handlers to prevent IME composition interruption
  const handleNameChange = useCallback((text: string) => {
    setName(text);
  }, []);

  const handlePriceChange = useCallback((text: string) => {
    setPrice(text);
  }, []);

  const handleDetailedLocationChange = useCallback((text: string) => {
    setDetailedLocation(text);
  }, []);

  const handleAmountChange = useCallback((text: string) => {
    setAmount(text);
  }, []);

  const handleNewTagChange = useCallback((text: string) => {
    setNewTag(text);
  }, []);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef]);

  const handleAddTag = useCallback(() => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag('');
    }
  }, [newTag, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  }, [tags]);

  const handleSubmit = useCallback(async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert(t('editItem.errors.title'), t('editItem.errors.enterName'));
      return;
    }
    if (!selectedCategory) {
      Alert.alert(t('editItem.errors.title'), t('editItem.errors.selectCategory'));
      return;
    }
    if (!selectedLocation) {
      Alert.alert(t('editItem.errors.title'), t('editItem.errors.selectLocation'));
      return;
    }

    setIsLoading(true);
    try {
      const category = categories.find((cat) => cat.id === selectedCategory);
      const priceNum = parseFloat(price) || 0;
      const amountNum = amount ? parseInt(amount, 10) : undefined;

      const updates = {
        name: name.trim(),
        category: selectedCategory,
        location: selectedLocation,
        detailedLocation: detailedLocation.trim(),
        price: priceNum,
        amount: amountNum,
        tags: tags,
        purchaseDate: purchaseDate ? purchaseDate.toISOString() : undefined,
        expiryDate: expiryDate ? expiryDate.toISOString() : undefined,
        icon: category?.icon || item?.icon || 'cube-outline',
        iconColor: category?.iconColor || item?.iconColor || theme.colors.textSecondary,
      };

      updateItem(itemId, updates);

      handleClose();
      // Refresh categories if category was changed
      if (selectedCategory !== item?.category) {
        refreshCategories();
      }
      if (onItemUpdated) {
        onItemUpdated();
      }
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert(t('editItem.errors.title'), t('editItem.errors.updateFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [
    name,
    selectedCategory,
    selectedLocation,
    price,
    detailedLocation,
    amount,
    tags,
    purchaseDate,
    expiryDate,
    categories,
    itemId,
    item,
    theme,
    handleClose,
    onItemUpdated,
    updateItem,
    refreshCategories,
    t,
  ]);

  const renderBackdrop = useCallback(
    (props: Parameters<typeof BottomSheetBackdrop>[0]) => <Backdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  const renderFooter = useCallback(
    () => (
      <BottomActionBar
        actions={[
          {
            label: t('editItem.submit'),
            onPress: handleSubmit,
            variant: 'filled',
            icon: <Ionicons name="checkmark" size={18} color={theme.colors.surface} />,
            disabled: isLoading,
          },
        ]}
        safeArea={!isKeyboardVisible}
        inBottomSheet={true}
      />
    ),
    [handleSubmit, isLoading, theme, t, isKeyboardVisible]
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
      enableContentPanningGesture={false}
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior={keyboardBlurBehavior}
      android_keyboardInputMode="adjustResize"
      enableHandlePanningGesture={false}
      topInset={insets.top}
      index={0}
      footerComponent={renderFooter}
      enableDynamicSizing={false}
      onChange={handleSheetChanges}
    >
      <ContentContainer>
        <BottomSheetScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.lg }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnPanDownToDismiss={false}
        >
          <Header>
            <HeaderLeft>
              <Title>{t('editItem.title')}</Title>
              <Subtitle>{t('editItem.subtitle')}</Subtitle>
            </HeaderLeft>
            <CloseButton onPress={handleClose}>
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </CloseButton>
          </Header>

          <FormContainer>
          <FormSection>
            <Label>{t('editItem.fields.name')}</Label>
            <MemoizedNameInput
              value={name}
              onChangeText={handleNameChange}
              placeholder={t('editItem.placeholders.name')}
              placeholderTextColor={theme.colors.textLight}
            />
          </FormSection>

          <FormSection>
            <CategorySection>
              <CategoryHeader>
                <Label>{t('editItem.fields.category')}</Label>
                <ManageCategoriesButton onPress={() => categoryManagerRef.current?.present()} activeOpacity={0.7}>
                  <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
                  <ManageCategoriesText>{t('editItem.manageCategories')}</ManageCategoriesText>
                </ManageCategoriesButton>
              </CategoryHeader>
              <CategoryGrid>
                {itemTypeCategories.map((category, index) => {
                  const totalItems = itemTypeCategories.length + 1;
                  const itemsInLastRow = totalItems % 3 || 3;
                  const lastRowStartIndex = totalItems - itemsInLastRow;
                  const isLastRow = index >= lastRowStartIndex;
                  // Remove margin-right from last item in each row (every 3rd item)
                  const isLastInRow = (index + 1) % 3 === 0;
                  return (
                    <CategoryButton
                      key={category.id}
                      isSelected={selectedCategory === category.id}
                      onPress={() => setSelectedCategory(category.id)}
                      activeOpacity={0.7}
                      style={{
                        ...(isLastInRow ? { marginRight: 0 } : {}),
                        ...(isLastRow ? { marginBottom: 0 } : {}),
                      }}
                    >
                      {category.icon && (
                        <CategoryIcon color={category.iconColor}>
                          <Ionicons
                            name={category.icon}
                            size={24}
                            color={category.iconColor || theme.colors.primary}
                          />
                        </CategoryIcon>
                      )}
                      <CategoryLabel isSelected={selectedCategory === category.id}>
                        {category.isCustom ? category.label : t(`categories.${category.name}`)}
                      </CategoryLabel>
                    </CategoryButton>
                  );
                })}
                <AddCategoryButton 
                  onPress={() => categoryManagerRef.current?.present()} 
                  activeOpacity={0.7}
                  style={{ marginBottom: 0, marginRight: 0 }}
                >
                  <Ionicons name="add" size={32} color={theme.colors.textLight} />
                  <CategoryLabel isSelected={false}>{t('editItem.add')}</CategoryLabel>
                </AddCategoryButton>
              </CategoryGrid>
            </CategorySection>
          </FormSection>

          <FormSection>
            <Label>{t('editItem.fields.location')}</Label>
            <LocationScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 0 }}
            >
              {locations.map((location) => (
                <LocationButton
                  key={location.id}
                  isSelected={selectedLocation === location.id}
                  onPress={() => setSelectedLocation(location.id)}
                  activeOpacity={0.7}
                >
                  <LocationText isSelected={selectedLocation === location.id}>
                    {t(`locations.${location.id}`)}
                  </LocationText>
                </LocationButton>
              ))}
            </LocationScrollView>
          </FormSection>

          <FormSection>
            <Row>
              <HalfContainer>
                <Label>{t('editItem.fields.price')}</Label>
                <MemoizedPriceInput
                  value={price}
                  onChangeText={handlePriceChange}
                  placeholder={t('editItem.placeholders.price')}
                  placeholderTextColor={theme.colors.textLight}
                />
              </HalfContainer>
              <HalfContainer>
                <Label>{t('editItem.fields.detailedLocation')}</Label>
                <MemoizedDetailedLocationInput
                  value={detailedLocation}
                  onChangeText={handleDetailedLocationChange}
                  placeholder={t('editItem.placeholders.detailedLocation')}
                  placeholderTextColor={theme.colors.textLight}
                />
              </HalfContainer>
            </Row>
          </FormSection>

          <FormSection>
            <Label>{t('editItem.fields.amount')}</Label>
            <MemoizedAmountInput
              value={amount}
              onChangeText={handleAmountChange}
              placeholder={t('editItem.placeholders.amount')}
              placeholderTextColor={theme.colors.textLight}
            />
          </FormSection>

          <FormSection>
            <Label>{t('editItem.fields.tags')}</Label>
            {tags.length > 0 && (
              <TagsContainer>
                {tags.map((tag, index) => (
                  <Tag key={index}>
                    <TagText>#{tag}</TagText>
                    <TagRemoveButton onPress={() => handleRemoveTag(tag)}>
                      <Ionicons name="close-circle" size={16} color={theme.colors.primary} />
                    </TagRemoveButton>
                  </Tag>
                ))}
              </TagsContainer>
            )}
            <TagInputContainer>
              <MemoizedTagInput
                value={newTag}
                onChangeText={handleNewTagChange}
                onSubmitEditing={handleAddTag}
                placeholder={t('editItem.placeholders.addTag')}
                placeholderTextColor={theme.colors.textLight}
              />
              <AddTagButton onPress={handleAddTag} activeOpacity={0.8}>
                <Ionicons name="add" size={20} color={theme.colors.surface} />
              </AddTagButton>
            </TagInputContainer>
          </FormSection>

          <FormSection>
            <Label>{t('editItem.fields.purchaseDate')}</Label>
            <DatePicker
              value={purchaseDate}
              onChange={setPurchaseDate}
              maximumDate={new Date()}
            />
          </FormSection>

          <FormSection>
            <Label>{t('editItem.fields.expiryDate')}</Label>
            <DatePicker
              value={expiryDate}
              onChange={setExpiryDate}
              minimumDate={new Date()}
            />
          </FormSection>
        </FormContainer>
        </BottomSheetScrollView>
      </ContentContainer>

      <CategoryManagerBottomSheet
        bottomSheetRef={categoryManagerRef}
        onCategoriesChanged={handleCategoriesChanged}
      />
    </BottomSheetModal>
  );
};

