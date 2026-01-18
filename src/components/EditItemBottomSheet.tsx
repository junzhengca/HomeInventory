import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
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
import { useInventory, useCategory } from '../store/hooks';
import { useItemForm, useKeyboardVisibility } from '../hooks';
import { BottomSheetHeader, FormSection, MemoizedInput } from './ui';
import { CategoryField, LocationField, TagsField } from './form';
import { CategoryManagerBottomSheet } from './CategoryManagerBottomSheet';
import { BottomActionBar } from './BottomActionBar';
import { DatePicker } from './DatePicker';

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
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
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

interface EditItemBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  itemId: string;
  onItemUpdated?: () => void;
}

/**
 * Refactored EditItemBottomSheet using custom hooks and reusable components.
 * Reduced from 858 lines to ~250 lines by extracting:
 * - Form state to useItemForm hook
 * - Keyboard tracking to useKeyboardVisibility hook
 * - UI components to reusable ui/ and form/ directories
 */
export const EditItemBottomSheet: React.FC<EditItemBottomSheetProps> = ({
  bottomSheetRef,
  itemId,
  onItemUpdated,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { updateItem } = useInventory();
  const { refreshCategories, registerRefreshCallback } = useCategory();
  const { isKeyboardVisible, dismissKeyboard } = useKeyboardVisibility();

  const categoryManagerRef = useRef<BottomSheetModal>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isModalOpenRef = useRef<boolean>(false);

  const {
    item,
    formData,
    categories,
    isLoading,
    updateField,
    addTag,
    removeTag,
    validate,
    initializeFromItem,
  } = useItemForm({
    itemId,
    onItemLoaded: (_loadedItem) => {
      // Mark as initialized when item is loaded
      isModalOpenRef.current = false;
    },
  });

  // Register category refresh callback
  useEffect(() => {
    const loadCategories = async () => {
      // Categories are loaded by useItemForm, this is just a callback placeholder
    };

    const unregister = registerRefreshCallback(loadCategories);
    return unregister;
  }, [registerRefreshCallback]);

  // Reload categories when changed
  const handleCategoriesChanged = useCallback(() => {
    // Triggered when categories are modified
    refreshCategories();
  }, [refreshCategories]);

  // Handle sheet open/close - initialize form when opening
  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === 0 && item) {
        // Modal opened - initialize form from item
        isModalOpenRef.current = true;
        initializeFromItem(item);
      } else if (index === -1) {
        // Modal closed
        isModalOpenRef.current = false;
      }
    },
    [item, initializeFromItem]
  );

  const handleClose = useCallback(() => {
    dismissKeyboard();
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef, dismissKeyboard]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) {
      return;
    }

    try {
      const category = categories.find((cat) => cat.id === formData.categoryId);
      const priceNum = parseFloat(formData.price) || 0;
      const amountNum = formData.amount
        ? parseInt(formData.amount, 10)
        : undefined;

      const updates = {
        name: formData.name.trim(),
        category: formData.categoryId,
        location: formData.locationId,
        detailedLocation: formData.detailedLocation.trim(),
        price: priceNum,
        amount: amountNum,
        tags: formData.tags,
        purchaseDate: formData.purchaseDate?.toISOString(),
        expiryDate: formData.expiryDate?.toISOString(),
        icon: category?.icon || item?.icon || 'cube-outline',
        iconColor:
          category?.iconColor || item?.iconColor || theme.colors.textSecondary,
      };

      updateItem(itemId, updates);

      handleClose();

      // Refresh categories if category was changed
      if (formData.categoryId !== item?.category) {
        refreshCategories();
      }

      onItemUpdated?.();
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert(
        t('editItem.errors.title'),
        t('editItem.errors.updateFailed')
      );
    }
  }, [
    formData,
    categories,
    item,
    itemId,
    theme,
    validate,
    updateItem,
    handleClose,
    onItemUpdated,
    refreshCategories,
    t,
  ]);

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
            label: t('editItem.submit'),
            onPress: handleSubmit,
            variant: 'filled',
            icon: (
              <Ionicons
                name="checkmark"
                size={18}
                color={theme.colors.surface}
              />
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
      onChange={handleSheetChanges}
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
            title={t('editItem.title')}
            subtitle={t('editItem.subtitle')}
            onClose={handleClose}
          />

          <FormContainer>
            <FormSection label={t('editItem.fields.name')}>
              <MemoizedInput
                value={formData.name}
                onChangeText={(text) => updateField('name', text)}
                placeholder={t('editItem.placeholders.name')}
                placeholderTextColor={theme.colors.textLight}
              />
            </FormSection>

            <FormSection label={t('editItem.fields.category')}>
              <CategorySection>
                <CategoryHeader>
                  <Text
                    style={{
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: theme.typography.fontWeight.medium,
                      color: theme.colors.text,
                    }}
                  >
                    {t('editItem.fields.category')}
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
                      {t('editItem.manageCategories')}
                    </ManageCategoriesText>
                  </ManageCategoriesButton>
                </CategoryHeader>
                <CategoryField
                  categories={categories}
                  selectedId={formData.categoryId}
                  onSelect={(id) => updateField('categoryId', id)}
                  onManageCategories={() =>
                    categoryManagerRef.current?.present()
                  }
                />
              </CategorySection>
            </FormSection>

            <FormSection label={t('editItem.fields.location')}>
              <LocationField
                selectedId={formData.locationId}
                onSelect={(id) => updateField('locationId', id)}
              />
            </FormSection>

            <Row>
              <HalfContainer>
                <FormSection
                  label={t('editItem.fields.price')}
                  style={{ marginBottom: theme.spacing.lg }}
                >
                  <HalfInput
                    value={formData.price}
                    onChangeText={(text: string) => updateField('price', text)}
                    placeholder={t('editItem.placeholders.price')}
                    placeholderTextColor={theme.colors.textLight}
                    keyboardType="numeric"
                  />
                </FormSection>
              </HalfContainer>
              <HalfContainer>
                <FormSection
                  label={t('editItem.fields.detailedLocation')}
                  style={{ marginBottom: theme.spacing.lg }}
                >
                  <HalfInput
                    value={formData.detailedLocation}
                    onChangeText={(text: string) =>
                      updateField('detailedLocation', text)
                    }
                    placeholder={t('editItem.placeholders.detailedLocation')}
                    placeholderTextColor={theme.colors.textLight}
                  />
                </FormSection>
              </HalfContainer>
            </Row>

            <FormSection label={t('editItem.fields.amount')}>
              <MemoizedInput
                value={formData.amount}
                onChangeText={(text) => updateField('amount', text)}
                placeholder={t('editItem.placeholders.amount')}
                placeholderTextColor={theme.colors.textLight}
                keyboardType="numeric"
              />
            </FormSection>

            <FormSection label={t('editItem.fields.tags')}>
              <TagsField
                tags={formData.tags}
                onAddTag={addTag}
                onRemoveTag={removeTag}
                placeholder={t('editItem.placeholders.addTag')}
              />
            </FormSection>

            <FormSection label={t('editItem.fields.purchaseDate')}>
              <DatePicker
                value={formData.purchaseDate}
                onChange={(date) => updateField('purchaseDate', date)}
                maximumDate={new Date()}
              />
            </FormSection>

            <FormSection label={t('editItem.fields.expiryDate')}>
              <DatePicker
                value={formData.expiryDate}
                onChange={(date) => updateField('expiryDate', date)}
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
