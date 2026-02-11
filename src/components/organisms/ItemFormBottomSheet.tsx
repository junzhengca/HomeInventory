import React, { useCallback, useEffect, useMemo, useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { Keyboard, Alert, View, Text } from 'react-native';
import styled from 'styled-components/native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { InventoryItem, ItemBatch } from '../../types/inventory';
import type { StyledProps } from '../../utils/styledComponents';
import { useTheme } from '../../theme/ThemeProvider';
import { useKeyboardVisibility } from '../../hooks/useKeyboardVisibility';
import { useUncontrolledItemForm, type UseUncontrolledItemFormOptions } from '../../hooks/useUncontrolledItemForm';
import { BottomSheetHeader, Button } from '../atoms';
import { ItemFormFields } from './ItemFormFields';
import { BatchFormFields } from './BatchFormFields';
import { uiLogger } from '../../utils/Logger';
import { generateItemId } from '../../utils/idGenerator';

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
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  padding-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-bottom: ${({ bottomInset, showSafeArea, theme }: StyledProps & {
  bottomInset: number;
  showSafeArea: boolean;
}) => (showSafeArea ? bottomInset + theme.spacing.md : theme.spacing.md)}px;
  shadow-color: #000;
  shadow-offset: 0px -2px;
  shadow-opacity: 0.03;
  shadow-radius: 4px;
  elevation: 2;
`;

const SectionDivider = styled.View`
  height: 1px;
  background-color: ${({ theme }: StyledProps) => theme.colors.border};
  margin-vertical: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const SectionHeader = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

export type FormMode = 'create' | 'edit';

export interface ItemFormSubmitValues {
  name: string;
  location: string;
  detailedLocation: string;
  status: string;
  categoryId: string | null;
  warningThreshold: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  batches?: ItemBatch[];
}

export interface ItemFormBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  mode: FormMode;
  initialData?: UseUncontrolledItemFormOptions['initialData'];
  onSubmit: (values: ItemFormSubmitValues) => void | Promise<void>;
  onSheetOpen?: () => void;
  onSheetClose?: () => void;
  onSuccess?: () => void;
  getErrorMessage?: (key: string) => string;
  shouldAutoFocus?: boolean;
}

export interface ItemFormBottomSheetRef {
  populateForm: (data: Partial<InventoryItem>) => void;
  setOpeningNestedModal: (isOpening: boolean) => void;
}

/**
 * Shared bottom sheet component for item creation and editing.
 * In 'create' mode, shows both item info and batch fields.
 * In 'edit' mode, shows only item info fields.
 * Uses uncontrolled inputs with refs to prevent IME composition interruption.
 */
export const ItemFormBottomSheet = forwardRef<
  ItemFormBottomSheetRef,
  ItemFormBottomSheetProps
>(({
  bottomSheetRef,
  mode,
  initialData,
  onSubmit,
  onSheetOpen,
  onSheetClose,
  onSuccess,
  getErrorMessage,
  shouldAutoFocus = true,
}, ref) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isKeyboardVisible } = useKeyboardVisibility();

  const [isLoading, setIsLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  // Ref to track if we're showing a confirmation dialog (to prevent duplicate alerts)
  const isShowingConfirmationRef = useRef(false);
  // Ref to track if we're intentionally closing the sheet (to prevent dirty check in onChange)
  const isClosingIntentionallyRef = useRef(false);
  // Ref to track if we're opening a nested modal (to skip dirty check)
  const isOpeningNestedModalRef = useRef(false);

  // Callback for form validity changes from the hook
  const handleFormValidChange = useCallback((isValid: boolean) => {
    setIsFormValid(isValid);
  }, []);

  // Form hook
  const {
    refs,
    defaultValues,
    selectedIcon,
    selectedColor,
    selectedLocation,
    selectedStatus,
    selectedCategoryId,
    purchaseDate,
    expiryDate,
    formKey,
    setSelectedIcon,
    setSelectedColor,
    setSelectedLocation,
    setSelectedStatus,
    setSelectedCategoryId,
    setPurchaseDate,
    setExpiryDate,
    getFormValues,
    isFormDirty,
    resetForm,
    populateForm,
    handleNameChangeText,
    handleDetailedLocationChangeText,
    handleWarningThresholdChangeText,
    handleNameBlur,
    handleDetailedLocationBlur,
    handleWarningThresholdBlur,
    // Batch handlers
    handleAmountChangeText,
    handleUnitChangeText,
    handlePriceChangeText,
    handleVendorChangeText,
    handleNoteChangeText,
    handleAmountBlur,
    handleUnitBlur,
    handlePriceBlur,
    handleVendorBlur,
    handleNoteBlur,
  } = useUncontrolledItemForm({ initialData, onFormValidChange: handleFormValidChange, mode });

  // Ref for isFormDirty to avoid stale closure in handleSheetChange
  const isFormDirtyRef = useRef(isFormDirty);

  // Keep the ref up-to-date whenever isFormDirty changes
  useEffect(() => {
    isFormDirtyRef.current = isFormDirty;
  }, [isFormDirty]);

  // Expose populateForm and setOpeningNestedModal via imperative handle
  useImperativeHandle(
    ref,
    () => ({
      populateForm,
      setOpeningNestedModal: (isOpening: boolean) => {
        isOpeningNestedModalRef.current = isOpening;
      },
    }),
    [populateForm]
  );

  // Handle sheet changes
  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        // If closing intentionally (after save or discard), just clean up and skip dirty check
        if (isClosingIntentionallyRef.current) {
          isClosingIntentionallyRef.current = false;
          Keyboard.dismiss();
          onSheetClose?.();
          return;
        }

        // If opening a nested modal, skip dirty check
        // The flag will be reset when the nested modal closes
        if (isOpeningNestedModalRef.current) {
          return;
        }

        // Sheet closing - check for unsaved changes
        if (isFormDirtyRef.current() && !isShowingConfirmationRef.current) {
          // Prevent the sheet from closing and show confirmation
          isShowingConfirmationRef.current = true;
          // Snap back to open state immediately
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
                  isClosingIntentionallyRef.current = true; // Mark as intentional close
                  bottomSheetRef.current?.dismiss();
                },
              },
            ],
            { cancelable: true }
          );
          return;
        }

        // Sheet closing without unsaved changes or after discarding
        Keyboard.dismiss();
        onSheetClose?.();
        return;
      }

      if (index === 0) {
        // Sheet opening
        onSheetOpen?.();
        if (shouldAutoFocus && refs.nameInput.current) {
          refs.nameInput.current.focus();
        }
      }
    },
    [refs.nameInput, onSheetOpen, onSheetClose, resetForm, bottomSheetRef, t, shouldAutoFocus]
  );

  // Handle close
  const handleClose = useCallback((skipDirtyCheck?: boolean | Event) => {
    // The onClose handler may be called with an event object from TouchableOpacity
    // We need to check if skipDirtyCheck is actually a boolean
    const shouldSkipCheck = typeof skipDirtyCheck === 'boolean' ? skipDirtyCheck : false;
    const dirty = isFormDirtyRef.current();

    if (!shouldSkipCheck && dirty && !isShowingConfirmationRef.current) {
      // Show confirmation for unsaved changes (X button or manual close)
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
              isClosingIntentionallyRef.current = true; // Mark as intentional close after discard
              bottomSheetRef.current?.dismiss();
            },
          },
        ],
        { cancelable: true }
      );
      return;
    }

    // Close without confirmation (after successful save, or form is clean)
    Keyboard.dismiss();
    isClosingIntentionallyRef.current = true; // Mark as intentional close
    bottomSheetRef.current?.dismiss();
  }, [resetForm, bottomSheetRef, t]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    const formValues = getFormValues();
    uiLogger.info('handleSubmit formValues', formValues);

    // Validation
    if (!formValues.name.trim()) {
      Alert.alert(
        t(`${mode}Item.errors.title`),
        getErrorMessage?.('enterName') ?? t(`${mode}Item.errors.enterName`)
      );
      return;
    }
    if (!formValues.location) {
      Alert.alert(
        t(`${mode}Item.errors.title`),
        getErrorMessage?.('selectLocation') ??
        t(`${mode}Item.errors.selectLocation`)
      );
      return;
    }

    setIsLoading(true);
    try {
      const warningThresholdNum =
        parseInt(formValues.warningThreshold, 10) || 0;

      const submitValues: ItemFormSubmitValues = {
        name: formValues.name.trim(),
        location: formValues.location,
        detailedLocation: formValues.detailedLocation.trim(),
        status: formValues.status,
        categoryId: formValues.categoryId,
        warningThreshold: warningThresholdNum,
        icon: formValues.icon,
        iconColor: formValues.iconColor,
      };

      // In create mode, build the first batch
      if (mode === 'create') {
        const amountNum = parseInt(formValues.amount, 10) || 1;
        const priceNum = parseFloat(formValues.price) || 0;
        const now = new Date().toISOString();

        const firstBatch: ItemBatch = {
          id: generateItemId(),
          amount: amountNum,
          unit: formValues.unit?.trim() || undefined,
          price: priceNum || undefined,
          vendor: formValues.vendor?.trim() || undefined,
          note: formValues.note?.trim() || undefined,
          purchaseDate: formValues.purchaseDate?.toISOString(),
          expiryDate: formValues.expiryDate?.toISOString(),
          createdAt: now,
        };

        submitValues.batches = [firstBatch];
      }

      uiLogger.info(`About to call onSubmit with icon: ${formValues.icon}, iconColor: ${formValues.iconColor}`);
      await onSubmit(submitValues);
      uiLogger.info('onSubmit completed successfully');

      handleClose(true); // Skip dirty check since we just saved successfully
      resetForm();
      onSuccess?.();
    } catch (error) {
      uiLogger.error(`Error in ${mode} item`, error);
      Alert.alert(
        t(`${mode}Item.errors.title`),
        getErrorMessage?.('failed') ??
        t(
          `${mode === 'create' ? 'createItem' : 'editItem'
          }.errors.${mode === 'create' ? 'createFailed' : 'updateFailed'}`
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    getFormValues,
    onSubmit,
    handleClose,
    resetForm,
    onSuccess,
    mode,
    t,
    getErrorMessage,
  ]);

  // Memoize translation keys for item info fields
  const itemTranslations = useMemo(
    () => ({
      fields: {
        name: t(`${mode}Item.fields.name`),
        warningThreshold: t(`${mode}Item.fields.warningThreshold`),
        location: t(`${mode}Item.fields.location`),
        status: t(`${mode}Item.fields.status`),
        detailedLocation: t(`${mode}Item.fields.detailedLocation`),
        category: t(`${mode}Item.fields.category`),
      },
      placeholders: {
        name: t(`${mode}Item.placeholders.name`),
        detailedLocation: t(`${mode}Item.placeholders.detailedLocation`),
        warningThreshold: t(`${mode}Item.placeholders.warningThreshold`),
      },
    }),
    [mode, t]
  );

  // Memoize translation keys for batch fields (create mode only)
  const batchTranslations = useMemo(
    () => ({
      fields: {
        amount: t('createItem.fields.amount'),
        unit: t('createItem.fields.unit'),
        price: t('createItem.fields.price'),
        vendor: t('createItem.fields.vendor'),
        note: t('createItem.fields.note'),
        purchaseDate: t('createItem.fields.purchaseDate'),
        expiryDate: t('createItem.fields.expiryDate'),
      },
      placeholders: {
        amount: t('createItem.placeholders.amount'),
        unit: t('createItem.placeholders.unit'),
        price: t('createItem.placeholders.price'),
        vendor: t('createItem.placeholders.vendor'),
        note: t('createItem.placeholders.note'),
      },
    }),
    [t]
  );

  const snapPoints = useMemo(() => ['100%'], []);
  const keyboardBehavior = useMemo(() => ('extend' as const), []);
  const keyboardBlurBehavior = useMemo(() => ('restore' as const), []);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <Backdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const renderFooter = useCallback(
    () => (
      <FooterContainer
        bottomInset={insets.bottom}
        showSafeArea={!isKeyboardVisible}
      >
        <Button
          label={t(`${mode}Item.submit`)}
          onPress={handleSubmit}
          variant="primary"
          icon={mode === 'create' ? 'add' : 'checkmark'}
          disabled={!isFormValid || isLoading}
        />
      </FooterContainer>
    ),
    [
      handleSubmit,
      isLoading,
      isFormValid,
      isKeyboardVisible,
      insets.bottom,
      mode,
      t,
    ]
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
      handleComponent={null}
      topInset={insets.top}
      index={0}
      footerComponent={renderFooter}
      enableDynamicSizing={false}
      onChange={handleSheetChange}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
    >
      <ContentContainer>
        <BottomSheetHeader
          title={t(`${mode}Item.title`)}
          subtitle={t(`${mode}Item.subtitle`)}
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
          <ItemFormFields
            selectedIcon={selectedIcon}
            selectedColor={selectedColor}
            selectedLocation={selectedLocation}
            selectedStatus={selectedStatus}
            selectedCategoryId={selectedCategoryId}
            formKey={formKey}
            nameInputRef={refs.nameInput}
            detailedLocationInputRef={refs.detailedLocationInput}
            warningThresholdInputRef={refs.warningThresholdInput}
            defaultName={defaultValues.name}
            defaultDetailedLocation={defaultValues.detailedLocation}
            defaultWarningThreshold={defaultValues.warningThreshold}
            onIconSelect={setSelectedIcon}
            onColorSelect={setSelectedColor}
            onLocationSelect={setSelectedLocation}
            onStatusSelect={setSelectedStatus}
            onCategorySelect={setSelectedCategoryId}
            onNameChangeText={handleNameChangeText}
            onDetailedLocationChangeText={handleDetailedLocationChangeText}
            onWarningThresholdChangeText={handleWarningThresholdChangeText}
            onNameBlur={handleNameBlur}
            onDetailedLocationBlur={handleDetailedLocationBlur}
            onWarningThresholdBlur={handleWarningThresholdBlur}
            onOpeningNestedModal={(isOpening) => {
              isOpeningNestedModalRef.current = isOpening;
            }}
            translations={itemTranslations}
          />

          {/* Batch form fields (create mode only) */}
          {mode === 'create' && (
            <>
              <SectionDivider />
              <SectionHeader>{t('createItem.batchSection')}</SectionHeader>
              <BatchFormFields
                formKey={formKey}
                purchaseDate={purchaseDate}
                expiryDate={expiryDate}
                amountInputRef={refs.amountInput}
                unitInputRef={refs.unitInput}
                priceInputRef={refs.priceInput}
                vendorInputRef={refs.vendorInput}
                noteInputRef={refs.noteInput}
                defaultAmount={defaultValues.amount}
                defaultUnit={defaultValues.unit}
                defaultPrice={defaultValues.price}
                defaultVendor={defaultValues.vendor}
                defaultNote={defaultValues.note}
                onPurchaseDateChange={setPurchaseDate}
                onExpiryDateChange={setExpiryDate}
                onAmountChangeText={handleAmountChangeText}
                onUnitChangeText={handleUnitChangeText}
                onPriceChangeText={handlePriceChangeText}
                onVendorChangeText={handleVendorChangeText}
                onNoteChangeText={handleNoteChangeText}
                onAmountBlur={handleAmountBlur}
                onUnitBlur={handleUnitBlur}
                onPriceBlur={handlePriceBlur}
                onVendorBlur={handleVendorBlur}
                onNoteBlur={handleNoteBlur}
                translations={batchTranslations}
              />
            </>
          )}
        </BottomSheetScrollView>
      </ContentContainer>
    </BottomSheetModal>
  );
});

ItemFormBottomSheet.displayName = 'ItemFormBottomSheet';
