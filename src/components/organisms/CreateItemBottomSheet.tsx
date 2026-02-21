import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Alert } from 'react-native';
import styled from 'styled-components/native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { InventoryItem, ItemBatch } from '../../types/inventory';
import type { StyledProps } from '../../utils/styledComponents';
import { useTheme } from '../../theme/ThemeProvider';
import { useKeyboardVisibility } from '../../hooks/useKeyboardVisibility';
import { useCreateItemForm } from '../../hooks/useCreateItemForm';
import { useAppDispatch } from '../../store/hooks';
import { BottomSheetHeader, GlassButton } from '../atoms';
import { CreateItemFormFields } from './CreateItemFormFields';
import { uiLogger } from '../../utils/Logger';
import { generateItemId } from '../../utils/idGenerator';
import type { ItemFormSubmitValues } from './ItemFormBottomSheet';

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const Backdrop = styled(BottomSheetBackdrop)`
  background-color: rgba(0, 0, 0, 0.5);
`;

const ContentContainer = styled.View`
  flex: 1;
  border-top-left-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  border-top-right-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  overflow: hidden;
`;

const FooterContainer = styled.View<{
  bottomInset: number;
  showSafeArea: boolean;
}>`
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  padding-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-bottom: ${({
  bottomInset,
  showSafeArea,
  theme,
}: StyledProps & { bottomInset: number; showSafeArea: boolean }) =>
    showSafeArea ? bottomInset + theme.spacing.md : theme.spacing.md}px;
  shadow-color: #000;
  shadow-offset: 0px -2px;
  shadow-opacity: 0.03;
  shadow-radius: 4px;
  elevation: 2;
`;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY_LOCATION = 'LAST_CREATED_ITEM_LOCATION';

/** Sensible defaults for fields the create-item form no longer exposes. */
const DEFAULT_ICON = 'cube-outline' as const;
const DEFAULT_COLOR = '#95A5A6';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CreateItemBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  onItemCreated?: () => void;
  initialData?: Partial<InventoryItem> | null;
  onSheetClose?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Self-contained bottom sheet for creating a new inventory item.
 *
 * Shows a simplified form with three fields:
 *  1. Name
 *  2. Location picker
 *  3. Category picker
 *
 * This component manages its own `BottomSheetModal` instead of delegating to
 * the shared `ItemFormBottomSheet`, so its field list can evolve
 * independently from the edit-item flow.
 */
export const CreateItemBottomSheet: React.FC<CreateItemBottomSheetProps> = ({
  bottomSheetRef,
  onItemCreated,
  initialData,
  onSheetClose,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { isKeyboardVisible } = useKeyboardVisibility();

  // --- Persisted last-used location --------------------------------------

  const [lastLocation, setLastLocation] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_LOCATION);
        if (stored) setLastLocation(stored);
      } catch (error) {
        uiLogger.error('Failed to load last created item location', error);
      }
    })();
  }, []);

  const resolvedInitialLocation = initialData?.location ?? lastLocation;

  // --- Form hook ---------------------------------------------------------

  const [isLoading, setIsLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const handleFormValidChange = useCallback((isValid: boolean) => {
    setIsFormValid(isValid);
  }, []);

  const {
    nameInputRef,
    priceInputRef,
    amountInputRef,
    unitInputRef,
    vendorInputRef,
    defaultName,
    defaultPrice,
    defaultAmount,
    defaultUnit,
    defaultVendor,
    selectedLocation,
    selectedCategoryId,
    expiryDate,
    formKey,
    setSelectedLocation,
    setSelectedCategoryId,
    setExpiryDate,
    getFormValues,
    isFormDirty,
    resetForm,
    handleNameChangeText,
    handleNameBlur,
    handlePriceChange,
    handlePriceBlur,
    handleAmountChange,
    handleAmountBlur,
    handleUnitChange,
    handleUnitBlur,
    handleVendorChange,
    handleVendorBlur,
    detailedLocationInputRef,
    warningThresholdInputRef,
    defaultDetailedLocation,
    defaultWarningThreshold,
    selectedStatusId,
    handleDetailedLocationChange,
    handleDetailedLocationBlur,
    handleWarningThresholdChange,
    handleWarningThresholdBlur,
    setSelectedStatusId,
  } = useCreateItemForm({
    initialLocation: resolvedInitialLocation,
    initialCategoryId: initialData?.categoryId ?? null,
    onFormValidChange: handleFormValidChange,
  });

  // --- Refs for sheet behaviour ------------------------------------------

  const isShowingConfirmationRef = useRef(false);
  const isClosingIntentionallyRef = useRef(false);
  const isOpeningNestedModalRef = useRef(false);
  const isFormDirtyRef = useRef(isFormDirty);

  useEffect(() => {
    isFormDirtyRef.current = isFormDirty;
  }, [isFormDirty]);

  // --- Sheet handlers ----------------------------------------------------

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        if (isClosingIntentionallyRef.current) {
          isClosingIntentionallyRef.current = false;
          Keyboard.dismiss();
          onSheetClose?.();
          return;
        }

        if (isOpeningNestedModalRef.current) {
          return;
        }

        if (isFormDirtyRef.current() && !isShowingConfirmationRef.current) {
          isShowingConfirmationRef.current = true;
          bottomSheetRef.current?.snapToIndex(0);

          Alert.alert(
            t('common.confirmation'),
            t('common.discardChanges'),
            [
              {
                text: t('common.keepEditing'),
                style: 'cancel',
                onPress: () => {
                  isShowingConfirmationRef.current = false;
                },
              },
              {
                text: t('common.discard'),
                style: 'destructive',
                onPress: () => {
                  isShowingConfirmationRef.current = false;
                  Keyboard.dismiss();
                  resetForm();
                  isClosingIntentionallyRef.current = true;
                  bottomSheetRef.current?.dismiss();
                },
              },
            ],
            { cancelable: true },
          );
          return;
        }

        Keyboard.dismiss();
        onSheetClose?.();
        return;
      }

      if (index === 0) {
        // Sheet opening — auto-focus name input
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }
    },
    [nameInputRef, onSheetClose, resetForm, bottomSheetRef, t],
  );

  const handleClose = useCallback(
    (skipDirtyCheck?: boolean | Event) => {
      const shouldSkipCheck =
        typeof skipDirtyCheck === 'boolean' ? skipDirtyCheck : false;

      if (
        !shouldSkipCheck &&
        isFormDirtyRef.current() &&
        !isShowingConfirmationRef.current
      ) {
        isShowingConfirmationRef.current = true;
        Alert.alert(
          t('common.confirmation'),
          t('common.discardChanges'),
          [
            {
              text: t('common.keepEditing'),
              style: 'cancel',
              onPress: () => {
                isShowingConfirmationRef.current = false;
              },
            },
            {
              text: t('common.discard'),
              style: 'destructive',
              onPress: () => {
                isShowingConfirmationRef.current = false;
                Keyboard.dismiss();
                resetForm();
                isClosingIntentionallyRef.current = true;
                bottomSheetRef.current?.dismiss();
              },
            },
          ],
          { cancelable: true },
        );
        return;
      }

      Keyboard.dismiss();
      isClosingIntentionallyRef.current = true;
      bottomSheetRef.current?.dismiss();
    },
    [resetForm, bottomSheetRef, t],
  );

  // --- Submit ------------------------------------------------------------

  const handleSubmit = useCallback(async () => {
    const formValues = getFormValues();
    uiLogger.info('CreateItemBottomSheet handleSubmit', formValues);

    if (!formValues.name.trim()) {
      Alert.alert(
        t('createItem.errors.title'),
        t('createItem.errors.enterName'),
      );
      return;
    }
    if (!formValues.location) {
      Alert.alert(
        t('createItem.errors.title'),
        t('createItem.errors.selectLocation'),
      );
      return;
    }

    setIsLoading(true);
    try {
      const now = new Date().toISOString();

      // Build the first batch from user-entered values
      const parsedAmount = parseInt(formValues.amount || '1', 10);
      const parsedPrice = parseFloat(formValues.price);

      const firstBatch: ItemBatch = {
        id: generateItemId(),
        amount: isNaN(parsedAmount) || parsedAmount < 1 ? 1 : parsedAmount,
        price: isNaN(parsedPrice) ? undefined : parsedPrice,
        unit: formValues.unit.trim() || undefined,
        vendor: formValues.vendor.trim() || undefined,
        expiryDate: formValues.expiryDate?.toISOString(),
        createdAt: now,
      };

      const parsedWarningThreshold = parseInt(formValues.warningThreshold, 10);

      const submitValues: ItemFormSubmitValues = {
        name: formValues.name.trim(),
        location: formValues.location,
        detailedLocation: formValues.detailedLocation.trim(),
        status: formValues.status,
        categoryId: formValues.categoryId,
        warningThreshold: isNaN(parsedWarningThreshold) ? 0 : parsedWarningThreshold,
        icon: DEFAULT_ICON,
        iconColor: DEFAULT_COLOR,
        batches: [firstBatch],
      };

      dispatch({ type: 'inventory/CREATE_ITEM', payload: submitValues });

      // Persist last-used location
      try {
        await AsyncStorage.setItem(STORAGE_KEY_LOCATION, formValues.location);
        setLastLocation(formValues.location);
      } catch (error) {
        uiLogger.error('Failed to save last created item location', error);
      }

      handleClose(true);
      resetForm();
      onItemCreated?.();
    } catch (error) {
      uiLogger.error('Error creating item', error);
      Alert.alert(
        t('createItem.errors.title'),
        t('createItem.errors.createFailed'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [getFormValues, dispatch, handleClose, resetForm, onItemCreated, t]);

  // --- Translations (memoised) -------------------------------------------

  const translations = useMemo(
    () => ({
      fields: {
        name: t('createItem.fields.name'),
        location: t('createItem.fields.location'),
        category: t('createItem.fields.category'),
        expiryDate: t('createItem.fields.expiryDate'),
        advanced: t('createItem.fields.advanced'),
        detailedLocation: t('createItem.fields.detailedLocation'),
        status: t('createItem.fields.status'),
        warningThreshold: t('createItem.fields.warningThreshold'),
      },
      placeholders: {
        name: t('createItem.placeholders.name'),
        detailedLocation: t('createItem.placeholders.detailedLocation'),
        warningThreshold: t('createItem.placeholders.warningThreshold'),
      },
    }),
    [t],
  );

  // --- Bottom sheet config (memoised) ------------------------------------

  const snapPoints = useMemo(() => ['100%'], []);
  const keyboardBehavior = useMemo(() => 'extend' as const, []);
  const keyboardBlurBehavior = useMemo(() => 'restore' as const, []);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <Backdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  const renderFooter = useCallback(
    () => (
      <FooterContainer
        bottomInset={insets.bottom}
        showSafeArea={!isKeyboardVisible}
      >
        <GlassButton
          text={t('createItem.submit')}
          onPress={handleSubmit}
          icon="add"
          tintColor={theme.colors.primary}
          textColor={theme.colors.surface}
          disabled={!isFormValid || isLoading}
          style={{ width: '100%' }}
        />
      </FooterContainer>
    ),
    [handleSubmit, isLoading, isFormValid, isKeyboardVisible, insets.bottom, t, theme],
  );

  // --- Render ------------------------------------------------------------

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
      handleComponent={null}
      topInset={insets.top}
      index={0}
      footerComponent={renderFooter}
      enableDynamicSizing={false}
      onChange={handleSheetChange}
      backgroundStyle={{ backgroundColor: theme.colors.background }}
    >
      <ContentContainer>
        <BottomSheetHeader
          title={t('createItem.title')}
          subtitle={t('createItem.subtitle')}
          onClose={handleClose}
        />
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.md,
            paddingBottom: theme.spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnPanDownToDismiss={false}
        >
          <CreateItemFormFields
            selectedLocation={selectedLocation}
            selectedCategoryId={selectedCategoryId}
            formKey={formKey}
            nameInputRef={nameInputRef}
            priceInputRef={priceInputRef}
            amountInputRef={amountInputRef}
            unitInputRef={unitInputRef}
            vendorInputRef={vendorInputRef}
            defaultName={defaultName}
            defaultPrice={defaultPrice}
            defaultAmount={defaultAmount}
            defaultUnit={defaultUnit}
            defaultVendor={defaultVendor}
            onLocationSelect={setSelectedLocation}
            onCategorySelect={setSelectedCategoryId}
            onNameChangeText={handleNameChangeText}
            onNameBlur={handleNameBlur}
            onPriceChange={handlePriceChange}
            onPriceBlur={handlePriceBlur}
            onAmountChange={handleAmountChange}
            onAmountBlur={handleAmountBlur}
            onUnitChange={handleUnitChange}
            onUnitBlur={handleUnitBlur}
            onVendorChange={handleVendorChange}
            onVendorBlur={handleVendorBlur}
            expiryDate={expiryDate}
            onExpiryDateChange={setExpiryDate}
            translations={translations}
            detailedLocationInputRef={detailedLocationInputRef}
            warningThresholdInputRef={warningThresholdInputRef}
            defaultDetailedLocation={defaultDetailedLocation}
            defaultWarningThreshold={defaultWarningThreshold}
            selectedStatusId={selectedStatusId}
            onDetailedLocationChange={handleDetailedLocationChange}
            onDetailedLocationBlur={handleDetailedLocationBlur}
            onWarningThresholdChange={handleWarningThresholdChange}
            onWarningThresholdBlur={handleWarningThresholdBlur}
            onStatusSelect={setSelectedStatusId}
            onOpeningNestedModal={(isOpening) => {
              isOpeningNestedModalRef.current = isOpening;
            }}
          />
        </BottomSheetScrollView>
      </ContentContainer>
    </BottomSheetModal>
  );
};
