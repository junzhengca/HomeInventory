import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { TouchableOpacity, Alert, View, ScrollView, Text, TextInput, Keyboard } from 'react-native';
import styled from 'styled-components/native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import type { StyledProps, StyledPropsWith } from '../utils/styledComponents';
import { Category } from '../types/inventory';
import { locations } from '../data/locations';
import { getAllCategories } from '../services/CategoryService';
import { useInventory, useCategory, useSelectedCategory } from '../store/hooks';
import { filterItemCategories } from '../utils/categoryUtils';
import { CategoryManagerBottomSheet } from './CategoryManagerBottomSheet';
import { BottomActionBar } from './BottomActionBar';
import { TabParamList } from '../navigation/types';

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

const CategoryIcon = styled(View)<{ color?: string }>`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const CategoryLabel = styled(Text)<{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.text};
  text-align: center;
`;

const AddCategoryButton = styled(CategoryButton)`
  border-style: dashed;
  border-color: ${({ theme }: StyledProps) => theme.colors.border};
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
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

const HalfInput = styled(Input)`
  flex: 1;
`;

// Uncontrolled input components to prevent IME composition interruption
// Using defaultValue and onChangeText to update refs, syncing to state on blur
const UncontrolledNameInput = memo(
  React.forwardRef<TextInput, {
    defaultValue: string;
    onChangeText: (text: string) => void;
    onBlur: () => void;
    placeholder: string;
    placeholderTextColor: string;
  }>(({ defaultValue, onChangeText, onBlur, placeholder, placeholderTextColor }, ref) => {
    return (
      <Input
        ref={ref}
        placeholder={placeholder}
        defaultValue={defaultValue}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholderTextColor={placeholderTextColor}
        autoCorrect={false}
        spellCheck={false}
        textContentType="none"
        autoComplete="off"
      />
    );
  })
);
UncontrolledNameInput.displayName = 'UncontrolledNameInput';

const UncontrolledPriceInput = memo(
  React.forwardRef<TextInput, {
    defaultValue: string;
    onChangeText: (text: string) => void;
    onBlur: () => void;
    placeholder: string;
    placeholderTextColor: string;
  }>(({ defaultValue, onChangeText, onBlur, placeholder, placeholderTextColor }, ref) => {
    return (
      <HalfInput
        ref={ref}
        placeholder={placeholder}
        defaultValue={defaultValue}
        onChangeText={onChangeText}
        onBlur={onBlur}
        keyboardType="numeric"
        placeholderTextColor={placeholderTextColor}
        autoCorrect={false}
        spellCheck={false}
        textContentType="none"
        autoComplete="off"
      />
    );
  })
);

const UncontrolledDetailedLocationInput = memo(
  React.forwardRef<TextInput, {
    defaultValue: string;
    onChangeText: (text: string) => void;
    onBlur: () => void;
    placeholder: string;
    placeholderTextColor: string;
  }>(({ defaultValue, onChangeText, onBlur, placeholder, placeholderTextColor }, ref) => {
    return (
      <HalfInput
        ref={ref}
        placeholder={placeholder}
        defaultValue={defaultValue}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholderTextColor={placeholderTextColor}
        autoCorrect={false}
        spellCheck={false}
        textContentType="none"
        autoComplete="off"
      />
    );
  })
);

UncontrolledPriceInput.displayName = 'UncontrolledPriceInput';
UncontrolledDetailedLocationInput.displayName = 'UncontrolledDetailedLocationInput';

interface CreateItemBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal>;
  onItemCreated?: () => void;
  activeTab?: keyof TabParamList;
}

export const CreateItemBottomSheet: React.FC<CreateItemBottomSheetProps> = ({
  bottomSheetRef,
  onItemCreated,
  activeTab,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { createItem } = useInventory();
  const { registerRefreshCallback } = useCategory();
  const { homeCategory, inventoryCategory } = useSelectedCategory();
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [price, setPrice] = useState('0');
  const [detailedLocation, setDetailedLocation] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const categoryManagerRef = React.useRef<BottomSheetModal>(null);
  const nameInputRef = React.useRef<TextInput>(null);
  const priceInputRef = React.useRef<TextInput>(null);
  const detailedLocationInputRef = React.useRef<TextInput>(null);
  // Refs to store current input values without causing re-renders
  const nameValueRef = React.useRef(name);
  const priceValueRef = React.useRef(price);
  const detailedLocationValueRef = React.useRef(detailedLocation);
  // Track if form was reset to update defaultValue via key prop
  const [formKey, setFormKey] = useState(0);

  // Filter to get only item-type categories (exclude location categories)
  const itemTypeCategories = useMemo(() => {
    return filterItemCategories(categories);
  }, [categories]);

  const loadCategories = useCallback(async () => {
    try {
      const allCategories = await getAllCategories();
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Categories will remain empty array if loading fails
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const unregister = registerRefreshCallback(loadCategories);
    return unregister;
  }, [registerRefreshCallback, loadCategories]);

  // Helper function to determine which category to select based on active tab
  const getCategoryToSelect = useCallback(() => {
    if (itemTypeCategories.length === 0) {
      return '';
    }
    
    let categoryToSelect = '';
    
    if (activeTab === 'HomeTab' && homeCategory && homeCategory !== 'all') {
      const categoryExists = itemTypeCategories.some((cat) => cat.id === homeCategory);
      if (categoryExists) {
        categoryToSelect = homeCategory;
      }
    } else if (activeTab === 'InventoryTab' && inventoryCategory && inventoryCategory !== 'all') {
      const categoryExists = itemTypeCategories.some((cat) => cat.id === inventoryCategory);
      if (categoryExists) {
        categoryToSelect = inventoryCategory;
      }
    }
    
    // If no category was selected from the active tab, fall back to "Other"
    if (!categoryToSelect) {
      const otherCategory = itemTypeCategories.find((cat) => cat.id === 'other');
      if (otherCategory) {
        categoryToSelect = otherCategory.id;
      }
    }
    
    return categoryToSelect;
  }, [itemTypeCategories, activeTab, homeCategory, inventoryCategory]);

  // Auto-select category based on active tab when categories load
  useEffect(() => {
    if (itemTypeCategories.length > 0 && !selectedCategory) {
      const categoryToSelect = getCategoryToSelect();
      if (categoryToSelect) {
        setSelectedCategory(categoryToSelect);
      }
    }
  }, [itemTypeCategories, selectedCategory, getCategoryToSelect]);

  // Auto-select first location when location is empty
  useEffect(() => {
    if (locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0].id);
    }
  }, [selectedLocation]);

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

  const handleCategoriesChanged = useCallback(() => {
    loadCategories();
  }, [loadCategories]);

  // Handlers to update refs during typing (no re-render)
  // This prevents IME composition interruption
  const handleNameChangeText = useCallback((text: string) => {
    nameValueRef.current = text;
  }, []);

  const handlePriceChangeText = useCallback((text: string) => {
    priceValueRef.current = text;
  }, []);

  const handleDetailedLocationChangeText = useCallback((text: string) => {
    detailedLocationValueRef.current = text;
  }, []);

  // Handlers to sync ref values to state on blur
  const handleNameBlur = useCallback(() => {
    setName(nameValueRef.current);
  }, []);

  const handlePriceBlur = useCallback(() => {
    setPrice(priceValueRef.current);
  }, []);

  const handleDetailedLocationBlur = useCallback(() => {
    setDetailedLocation(detailedLocationValueRef.current);
  }, []);

  const snapPoints = useMemo(() => ['100%'], []);

  // Handle keyboard behavior - use 'extend' to prevent IME composition interruption
  const keyboardBehavior = useMemo(() => 'extend' as const, []);
  const keyboardBlurBehavior = useMemo(() => 'restore' as const, []);

  // Memoize placeholder strings and colors to prevent re-renders
  const namePlaceholder = useMemo(() => t('createItem.placeholders.name'), [t]);
  const pricePlaceholder = useMemo(() => t('createItem.placeholders.price'), [t]);
  const detailedLocationPlaceholder = useMemo(() => t('createItem.placeholders.detailedLocation'), [t]);
  const placeholderTextColor = useMemo(() => theme.colors.textLight, [theme.colors.textLight]);


  const handleClose = useCallback(() => {
    // Dismiss keyboard immediately when closing starts
    Keyboard.dismiss();
    bottomSheetRef.current?.dismiss();
    // Reset form - increment key to reset uncontrolled inputs
    setName('');
    setSelectedCategory('');
    setSelectedLocation('');
    setPrice('0');
    setDetailedLocation('');
    nameValueRef.current = '';
    priceValueRef.current = '0';
    detailedLocationValueRef.current = '';
    setFormKey(prev => prev + 1);
  }, [bottomSheetRef]);

  const handleSubmit = useCallback(async () => {
    // Get current values from refs before validation
    const currentName = nameValueRef.current || name || '';
    const currentPrice = priceValueRef.current || price || '0';
    const currentDetailedLocation = detailedLocationValueRef.current || detailedLocation || '';
    
    // Sync to state
    setName(currentName);
    setPrice(currentPrice);
    setDetailedLocation(currentDetailedLocation);

    // Validation
    if (!currentName.trim()) {
      Alert.alert(t('createItem.errors.title'), t('createItem.errors.enterName'));
      return;
    }
    if (!selectedCategory) {
      Alert.alert(t('createItem.errors.title'), t('createItem.errors.selectCategory'));
      return;
    }
    if (!selectedLocation) {
      Alert.alert(t('createItem.errors.title'), t('createItem.errors.selectLocation'));
      return;
    }

    setIsLoading(true);
    try {
      const category = categories.find((cat) => cat.id === selectedCategory);
      const priceNum = parseFloat(currentPrice) || 0;

      createItem({
        name: currentName.trim(),
        category: selectedCategory,
        location: selectedLocation,
        detailedLocation: currentDetailedLocation.trim(),
        price: priceNum,
        icon: category?.icon || 'cube-outline',
        iconColor: category?.iconColor || theme.colors.textSecondary,
        tags: [],
      });

      handleClose();
      if (onItemCreated) {
        onItemCreated();
      }
    } catch (error) {
      console.error('Error creating item:', error);
      Alert.alert(t('createItem.errors.title'), t('createItem.errors.createFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [name, selectedCategory, selectedLocation, price, detailedLocation, categories, theme, handleClose, onItemCreated, createItem, t]);

  const renderBackdrop = useCallback(
    (props: Parameters<typeof BottomSheetBackdrop>[0]) => <Backdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  const handleSheetChange = useCallback((index: number) => {
    // Dismiss keyboard immediately when sheet starts closing
    if (index === -1) {
      Keyboard.dismiss();
      return;
    }
    // When sheet opens (index 0), set category based on active tab
    if (index === 0) {
      const categoryToSelect = getCategoryToSelect();
      if (categoryToSelect) {
        setSelectedCategory(categoryToSelect);
      }
      
      // Focus the name input immediately when sheet opens
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }
  }, [getCategoryToSelect]);

  const handleSheetAnimate = useCallback((fromIndex: number, toIndex: number) => {
    // Set category and focus input while sheet is animating to open (transitioning from -1 to 0)
    // This happens immediately as the sheet starts opening, before it's fully visible
    if (fromIndex === -1 && toIndex === 0) {
      const categoryToSelect = getCategoryToSelect();
      if (categoryToSelect) {
        setSelectedCategory(categoryToSelect);
      }
      
      // Focus input while sheet is animating to open
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }
    // Dismiss keyboard while sheet is animating to close (transitioning from 0 to -1)
    if (fromIndex === 0 && toIndex === -1) {
      Keyboard.dismiss();
    }
  }, [getCategoryToSelect]);

  const renderFooter = useCallback(
    () => (
      <BottomActionBar
        actions={[
          {
            label: t('createItem.submit'),
            onPress: handleSubmit,
            variant: 'filled',
            icon: <Ionicons name="add" size={18} color={theme.colors.surface} />,
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
      onChange={handleSheetChange}
      onAnimate={handleSheetAnimate}
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
                <Title>{t('createItem.title')}</Title>
                <Subtitle>{t('createItem.subtitle')}</Subtitle>
              </HeaderLeft>
              <CloseButton onPress={handleClose}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </CloseButton>
            </Header>

            <FormContainer key={formKey}>
              <FormSection>
                <Label>{t('createItem.fields.name')}</Label>
                <UncontrolledNameInput
                  ref={nameInputRef}
                  defaultValue={name}
                  onChangeText={handleNameChangeText}
                  onBlur={handleNameBlur}
                  placeholder={namePlaceholder}
                  placeholderTextColor={placeholderTextColor}
                />
              </FormSection>

              <FormSection>
                <CategorySection>
                  <CategoryHeader>
                    <Label>{t('createItem.fields.category')}</Label>
                    <ManageCategoriesButton onPress={() => categoryManagerRef.current?.present()} activeOpacity={0.7}>
                      <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
                      <ManageCategoriesText>{t('createItem.manageCategories')}</ManageCategoriesText>
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
                      <CategoryLabel isSelected={false}>{t('createItem.add')}</CategoryLabel>
                    </AddCategoryButton>
                  </CategoryGrid>
                </CategorySection>
              </FormSection>

              <FormSection>
                <Label>{t('createItem.fields.location')}</Label>
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
                  <View style={{ flex: 1 }}>
                    <Label>{t('createItem.fields.price')}</Label>
                    <UncontrolledPriceInput
                      ref={priceInputRef}
                      defaultValue={price}
                      onChangeText={handlePriceChangeText}
                      onBlur={handlePriceBlur}
                      placeholder={pricePlaceholder}
                      placeholderTextColor={placeholderTextColor}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Label>{t('createItem.fields.detailedLocation')}</Label>
                    <UncontrolledDetailedLocationInput
                      ref={detailedLocationInputRef}
                      defaultValue={detailedLocation}
                      onChangeText={handleDetailedLocationChangeText}
                      onBlur={handleDetailedLocationBlur}
                      placeholder={detailedLocationPlaceholder}
                      placeholderTextColor={placeholderTextColor}
                    />
                  </View>
                </Row>
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

