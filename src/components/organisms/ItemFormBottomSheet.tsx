import React, { useCallback, useMemo, useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { Keyboard, Alert } from 'react-native';
import styled from 'styled-components/native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { InventoryItem } from '../../types/inventory';
import type { StyledProps } from '../../utils/styledComponents';
import { useTheme } from '../../theme/ThemeProvider';
import { useKeyboardVisibility } from '../../hooks/useKeyboardVisibility';
import { useUncontrolledItemForm, type UseUncontrolledItemFormOptions } from '../../hooks/useUncontrolledItemForm';
import { BottomSheetHeader, Button } from '../atoms';
import { ItemFormFields } from './ItemFormFields';

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

export type FormMode = 'create' | 'edit';

export interface ItemFormBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  mode: FormMode;
  initialData?: UseUncontrolledItemFormOptions['initialData'];
  onSubmit: (values: {
    name: string;
    location: string;
    detailedLocation: string;
    status: string;
    price: number;
    amount?: number;
    warningThreshold: number;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    purchaseDate?: string;
    expiryDate?: string;
  }) => void | Promise<void>;
  onSheetOpen?: () => void;
  onSheetClose?: () => void;
  onSuccess?: () => void;
  getErrorMessage?: (key: string) => string;
}

export interface ItemFormBottomSheetRef {
  populateForm: (data: Partial<InventoryItem>) => void;
}

/**
 * Shared bottom sheet component for item creation and editing.
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
}, ref) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isKeyboardVisible } = useKeyboardVisibility();

  const [isLoading, setIsLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  // Ref to track if we're showing a confirmation dialog (to prevent duplicate alerts)
  const isShowingConfirmationRef = useRef(false);

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
    purchaseDate,
    expiryDate,
    formKey,
    setSelectedIcon,
    setSelectedColor,
    setSelectedLocation,
    setSelectedStatus,
    setPurchaseDate,
    setExpiryDate,
    getFormValues,
    isFormDirty,
    resetForm,
    populateForm,
    handleNameChangeText,
    handlePriceChangeText,
    handleDetailedLocationChangeText,
    handleAmountChangeText,
    handleWarningThresholdChangeText,
    handleNameBlur,
    handlePriceBlur,
    handleDetailedLocationBlur,
    handleAmountBlur,
    handleWarningThresholdBlur,
  } = useUncontrolledItemForm({ initialData, onFormValidChange: handleFormValidChange });

  // Expose populateForm via imperative handle for parent to call synchronously
  useImperativeHandle(
    ref,
    () => ({ populateForm }),
    [populateForm]
  );

  // Handle sheet changes
  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        // Sheet closing - check for unsaved changes
        if (isFormDirty() && !isShowingConfirmationRef.current) {
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
                  bottomSheetRef.current?.dismiss();
                  onSheetClose?.();
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
        if (refs.nameInput.current) {
          refs.nameInput.current.focus();
        }
      }
    },
    [refs.nameInput, onSheetOpen, onSheetClose, isFormDirty, resetForm, bottomSheetRef, t]
  );

  // Handle close
  const handleClose = useCallback(() => {
    if (isFormDirty() && !isShowingConfirmationRef.current) {
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
              bottomSheetRef.current?.dismiss();
              onSheetClose?.();
            },
          },
        ],
        { cancelable: true }
      );
      return;
    }

    Keyboard.dismiss();
    bottomSheetRef.current?.dismiss();
  }, [isFormDirty, resetForm, bottomSheetRef, onSheetClose, t]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    const formValues = getFormValues();
    console.log('[ItemFormBottomSheet] handleSubmit formValues:', formValues);

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
      const priceNum = parseFloat(formValues.price) || 0;
      const amountNum = formValues.amount
        ? parseInt(formValues.amount, 10)
        : undefined;
      const warningThresholdNum =
        parseInt(formValues.warningThreshold, 10) || 0;

      console.log('[ItemFormBottomSheet] About to call onSubmit with icon:', formValues.icon, 'iconColor:', formValues.iconColor);
      await onSubmit({
        name: formValues.name.trim(),
        location: formValues.location,
        detailedLocation: formValues.detailedLocation.trim(),
        status: formValues.status,
        price: priceNum,
        amount: amountNum,
        warningThreshold: warningThresholdNum,
        icon: formValues.icon,
        iconColor: formValues.iconColor,
        purchaseDate: formValues.purchaseDate?.toISOString(),
        expiryDate: formValues.expiryDate?.toISOString(),
      });
      console.log('[ItemFormBottomSheet] onSubmit completed successfully');

      handleClose();
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error(`Error in ${mode} item:`, error);
      Alert.alert(
        t(`${mode}Item.errors.title`),
        getErrorMessage?.('failed') ??
          t(
            `${
              mode === 'create' ? 'createItem' : 'editItem'
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

  // Memoize translation keys
  const translations = useMemo(
    () => ({
      fields: {
        name: t(`${mode}Item.fields.name`),
        amount: t(`${mode}Item.fields.amount`),
        warningThreshold: t(`${mode}Item.fields.warningThreshold`),
        location: t(`${mode}Item.fields.location`),
        status: t(`${mode}Item.fields.status`),
        price: t(`${mode}Item.fields.price`),
        detailedLocation: t(`${mode}Item.fields.detailedLocation`),
        purchaseDate: t(`${mode}Item.fields.purchaseDate`),
        expiryDate: t(`${mode}Item.fields.expiryDate`),
      },
      placeholders: {
        name: t(`${mode}Item.placeholders.name`),
        price: t(`${mode}Item.placeholders.price`),
        detailedLocation: t(`${mode}Item.placeholders.detailedLocation`),
        amount: t(`${mode}Item.placeholders.amount`),
        warningThreshold: t(`${mode}Item.placeholders.warningThreshold`),
      },
    }),
    [mode, t]
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
            purchaseDate={purchaseDate}
            expiryDate={expiryDate}
            formKey={formKey}
            nameInputRef={refs.nameInput}
            priceInputRef={refs.priceInput}
            detailedLocationInputRef={refs.detailedLocationInput}
            amountInputRef={refs.amountInput}
            warningThresholdInputRef={refs.warningThresholdInput}
            defaultName={defaultValues.name}
            defaultPrice={defaultValues.price}
            defaultDetailedLocation={defaultValues.detailedLocation}
            defaultAmount={defaultValues.amount}
            defaultWarningThreshold={defaultValues.warningThreshold}
            onIconSelect={setSelectedIcon}
            onColorSelect={setSelectedColor}
            onLocationSelect={setSelectedLocation}
            onStatusSelect={setSelectedStatus}
            onPurchaseDateChange={setPurchaseDate}
            onExpiryDateChange={setExpiryDate}
            onNameChangeText={handleNameChangeText}
            onPriceChangeText={handlePriceChangeText}
            onDetailedLocationChangeText={handleDetailedLocationChangeText}
            onAmountChangeText={handleAmountChangeText}
            onWarningThresholdChangeText={handleWarningThresholdChangeText}
            onNameBlur={handleNameBlur}
            onPriceBlur={handlePriceBlur}
            onDetailedLocationBlur={handleDetailedLocationBlur}
            onAmountBlur={handleAmountBlur}
            onWarningThresholdBlur={handleWarningThresholdBlur}
            translations={translations}
          />
        </BottomSheetScrollView>
      </ContentContainer>
    </BottomSheetModal>
  );
});

ItemFormBottomSheet.displayName = 'ItemFormBottomSheet';
