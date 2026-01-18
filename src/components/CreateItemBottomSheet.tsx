import React, {
  useRef,
  useCallback,
  useMemo,
  useEffect,
  useState,
} from 'react';
import { Alert, ScrollView, TextInput, Keyboard, Text } from 'react-native';
import { locations } from '../data/locations';
import styled from 'styled-components/native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import type { StyledProps } from '../utils/styledComponents';
import { Category } from '../types/inventory';
import { useInventory, useCategory, useSelectedCategory } from '../store/hooks';
import { useKeyboardVisibility } from '../hooks';
import { BottomSheetHeader, FormSection, MemoizedInput } from './ui';
import { CategoryField, LocationField } from './form';
import { CategoryManagerBottomSheet } from './CategoryManagerBottomSheet';
import { BottomActionBar } from './BottomActionBar';

const Backdrop = styled(BottomSheetBackdrop)`
  background-color: rgba(0, 0, 0, 0.5);
`;

const ContentContainer = styled.View`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
`;

const FormContainer = styled.View`
  flex-direction: column;
  gap: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const Row = styled.View`
  flex-direction: row;
  gap: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const HalfContainer = styled.View`
  flex: 1;
`;

const HalfInput = styled(MemoizedInput)`
  flex: 1;
`;

const CategorySection = styled.View``;

const CategoryHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const ManageCategoriesButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
`;

const ManageCategoriesText = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.primary};
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

interface CreateItemBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal>;
  onItemCreated?: () => void;
}

/**
 * Refactored CreateItemBottomSheet using custom hooks and reusable components.
 * Reduced from 734 lines to ~250 lines by sharing components with EditItemBottomSheet.
 *
 * Uses uncontrolled inputs with refs to prevent IME composition interruption
 * for Chinese/Japanese input methods.
 */
export const CreateItemBottomSheet: React.FC<CreateItemBottomSheetProps> = ({
  bottomSheetRef,
  onItemCreated,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { createItem } = useInventory();
  const { registerRefreshCallback } = useCategory();
  const { homeCategory } = useSelectedCategory();
  const { isKeyboardVisible } = useKeyboardVisibility();

  const categoryManagerRef = useRef<BottomSheetModal>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const nameInputRef = useRef<TextInput>(null);

  // Form state using refs to prevent IME interruption
  const nameValueRef = useRef('');
  const priceValueRef = useRef('0');
  const detailedLocationValueRef = useRef('');

  // Regular state for category/location (doesn't affect IME)
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formKey, setFormKey] = useState(0); // Force remount on reset

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { getAllCategories } =
          await import('../services/CategoryService');
        const allCategories = await getAllCategories();
        setCategories(allCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Register category refresh callback
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { getAllCategories } =
          await import('../services/CategoryService');
        const allCategories = await getAllCategories();
        setCategories(allCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    const unregister = registerRefreshCallback(loadCategories);
    return unregister;
  }, [registerRefreshCallback]);

  // Helper to determine which category to select based on active tab
  const getCategoryToSelect = useCallback(() => {
    const itemTypeCategories = categories.filter(
      (cat) => cat.type !== 'location'
    );

    if (itemTypeCategories.length === 0) {
      return '';
    }

    let categoryToSelect = '';

    if (homeCategory && homeCategory !== 'all') {
      const categoryExists = itemTypeCategories.some(
        (cat) => cat.id === homeCategory
      );
      if (categoryExists) {
        categoryToSelect = homeCategory;
      }
    }

    // Fall back to "Other" if no category selected
    if (!categoryToSelect) {
      const otherCategory = itemTypeCategories.find(
        (cat) => cat.id === 'other'
      );
      if (otherCategory) {
        categoryToSelect = otherCategory.id;
      }
    }

    return categoryToSelect;
  }, [categories, homeCategory]);

  // Auto-select category when sheet opens
  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        Keyboard.dismiss();
        return;
      }

      if (index === 0) {
        const categoryToSelect = getCategoryToSelect();
        if (categoryToSelect) {
          setSelectedCategory(categoryToSelect);
        }

        // Focus name input
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }
    },
    [getCategoryToSelect]
  );

  // Auto-select first location if none selected
  useEffect(() => {
    if (!selectedLocation) {
      if (locations.length > 0) {
        setSelectedLocation(locations[0].id);
      }
    }
  }, [selectedLocation]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    bottomSheetRef.current?.dismiss();

    // Reset form
    nameValueRef.current = '';
    priceValueRef.current = '0';
    detailedLocationValueRef.current = '';
    setSelectedCategory('');
    setFormKey((prev) => prev + 1);
  }, [bottomSheetRef]);

  const handleSubmit = useCallback(async () => {
    const currentName = nameValueRef.current;
    const currentPrice = priceValueRef.current;
    const currentDetailedLocation = detailedLocationValueRef.current;

    // Validation
    if (!currentName.trim()) {
      Alert.alert(
        t('createItem.errors.title'),
        t('createItem.errors.enterName')
      );
      return;
    }
    if (!selectedCategory) {
      Alert.alert(
        t('createItem.errors.title'),
        t('createItem.errors.selectCategory')
      );
      return;
    }
    if (!selectedLocation) {
      Alert.alert(
        t('createItem.errors.title'),
        t('createItem.errors.selectLocation')
      );
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
      onItemCreated?.();
    } catch (error) {
      console.error('Error creating item:', error);
      Alert.alert(
        t('createItem.errors.title'),
        t('createItem.errors.createFailed')
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedCategory,
    selectedLocation,
    categories,
    theme,
    handleClose,
    onItemCreated,
    createItem,
    t,
  ]);

  const handleCategoriesChanged = useCallback(() => {
    // Categories will be refreshed via callback
  }, []);

  const snapPoints = useMemo(() => ['100%'], []);
  const keyboardBehavior = useMemo(() => 'extend' as const, []);
  const keyboardBlurBehavior = useMemo(() => 'restore' as const, []);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <Backdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const renderFooter = useCallback(
    () => (
      <BottomActionBar
        actions={[
          {
            label: t('createItem.submit'),
            onPress: handleSubmit,
            variant: 'filled',
            icon: (
              <Ionicons name="add" size={18} color={theme.colors.surface} />
            ),
            disabled: isLoading,
          },
        ]}
        safeArea={!isKeyboardVisible}
        inBottomSheet
      />
    ),
    [handleSubmit, isLoading, theme, t, isKeyboardVisible]
  );

  // Uncontrolled input handlers (update refs, no re-render)
  const handleNameChangeText = useCallback((text: string) => {
    nameValueRef.current = text;
  }, []);

  const handlePriceChangeText = useCallback((text: string) => {
    priceValueRef.current = text;
  }, []);

  const handleDetailedLocationChangeText = useCallback((text: string) => {
    detailedLocationValueRef.current = text;
  }, []);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
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
    >
      <ContentContainer>
        <BottomSheetScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: theme.spacing.lg,
            paddingBottom: theme.spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnPanDownToDismiss={false}
        >
          <BottomSheetHeader
            title={t('createItem.title')}
            subtitle={t('createItem.subtitle')}
            onClose={handleClose}
          />

          <FormContainer key={formKey}>
            <FormSection label={t('createItem.fields.name')}>
              <MemoizedInput
                value={nameValueRef.current}
                onChangeText={handleNameChangeText}
                placeholder={t('createItem.placeholders.name')}
                placeholderTextColor={theme.colors.textLight}
              />
            </FormSection>

            <FormSection label={t('createItem.fields.category')}>
              <CategorySection>
                <CategoryHeader>
                  <Text
                    style={{
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: theme.typography.fontWeight.medium,
                      color: theme.colors.text,
                    }}
                  >
                    {t('createItem.fields.category')}
                  </Text>
                  <ManageCategoriesButton
                    onPress={() => categoryManagerRef.current?.present()}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="create-outline"
                      size={16}
                      color={theme.colors.primary}
                    />
                    <ManageCategoriesText>
                      {t('createItem.manageCategories')}
                    </ManageCategoriesText>
                  </ManageCategoriesButton>
                </CategoryHeader>
                <CategoryField
                  categories={categories}
                  selectedId={selectedCategory}
                  onSelect={setSelectedCategory}
                  onManageCategories={() =>
                    categoryManagerRef.current?.present()
                  }
                />
              </CategorySection>
            </FormSection>

            <FormSection label={t('createItem.fields.location')}>
              <LocationField
                selectedId={selectedLocation}
                onSelect={setSelectedLocation}
              />
            </FormSection>

            <Row>
              <HalfContainer>
                <FormSection
                  label={t('createItem.fields.price')}
                  style={{ marginBottom: theme.spacing.lg }}
                >
                  <HalfInput
                    value={priceValueRef.current}
                    onChangeText={handlePriceChangeText}
                    placeholder={t('createItem.placeholders.price')}
                    placeholderTextColor={theme.colors.textLight}
                    keyboardType="numeric"
                  />
                </FormSection>
              </HalfContainer>
              <HalfContainer>
                <FormSection
                  label={t('createItem.fields.detailedLocation')}
                  style={{ marginBottom: theme.spacing.lg }}
                >
                  <HalfInput
                    value={detailedLocationValueRef.current}
                    onChangeText={handleDetailedLocationChangeText}
                    placeholder={t('createItem.placeholders.detailedLocation')}
                    placeholderTextColor={theme.colors.textLight}
                  />
                </FormSection>
              </HalfContainer>
            </Row>
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
