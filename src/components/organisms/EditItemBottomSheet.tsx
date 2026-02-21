import React, { useRef, useCallback, useImperativeHandle, forwardRef, useState, useMemo, useEffect } from 'react';
import { Keyboard, Alert } from 'react-native';
import styled from 'styled-components/native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useStore } from 'react-redux';

import type { InventoryItem } from '../../types/inventory';
import { useAppDispatch } from '../../store/hooks';
import type { RootState } from '../../store';
import { uiLogger } from '../../utils/Logger';

import type { StyledProps } from '../../utils/styledComponents';
import { useTheme } from '../../theme/ThemeProvider';
import { useKeyboardVisibility } from '../../hooks/useKeyboardVisibility';
import { BottomSheetHeader, GlassButton } from '../atoms';
import { EditItemFormFields } from './EditItemFormFields';
import { useEditItemForm } from '../../hooks/useEditItemForm';

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
// Types
// ---------------------------------------------------------------------------

export interface EditItemBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  onItemUpdated?: () => void;
}

export interface EditItemBottomSheetRef {
  present: (itemId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Self-contained bottom sheet for editing an existing inventory item.
 *
 * Shows a simplified form similar to CreateItemBottomSheet, but populated with
 * existing item data.
 *
 * Excludes batch information (quantity, price, expiry, etc.) which are managed
 * separately.
 */
export const EditItemBottomSheet = forwardRef<
  EditItemBottomSheetRef,
  EditItemBottomSheetProps
>(({ bottomSheetRef, onItemUpdated }, ref) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const store = useStore();
  const { isKeyboardVisible } = useKeyboardVisibility();

  // Track which item ID is currently being edited
  const currentItemIdRef = useRef<string | null>(null);
  // State for initial data (triggers form population in hook's useEffect)
  const [initialData, setInitialData] = useState<Partial<InventoryItem> | null>(null);

  // --- Form hook ---------------------------------------------------------

  const [isLoading, setIsLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const handleFormValidChange = useCallback((isValid: boolean) => {
    setIsFormValid(isValid);
  }, []);

  const {
    nameInputRef,
    detailedLocationInputRef,
    warningThresholdInputRef,
    defaultName,
    defaultDetailedLocation,
    defaultWarningThreshold,
    selectedLocation,
    selectedCategoryId,
    selectedStatusId,
    selectedIcon,
    selectedColor,
    formKey,
    setSelectedLocation,
    setSelectedCategoryId,
    setSelectedStatusId,
    setSelectedIcon,
    setSelectedColor,
    getFormValues,
    isFormDirty,
    resetForm,
    handleNameChangeText,
    handleNameBlur,
    handleDetailedLocationChange,
    handleDetailedLocationBlur,
    handleWarningThresholdChange,
    handleWarningThresholdBlur,
  } = useEditItemForm({
    initialData,
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

  // --- Translations (memoised) -------------------------------------------

  const translations = useMemo(
    () => ({
      fields: {
        name: t('editItem.fields.name'),
        location: t('editItem.fields.location'),
        category: t('editItem.fields.category'),
        advanced: t('editItem.fields.advanced'),
        detailedLocation: t('editItem.fields.detailedLocation'),
        status: t('editItem.fields.status'),
        warningThreshold: t('editItem.fields.warningThreshold'),
      },
      placeholders: {
        name: t('editItem.placeholders.name'),
        detailedLocation: t('editItem.placeholders.detailedLocation'),
        warningThreshold: t('editItem.placeholders.warningThreshold'),
      },
    }),
    [t],
  );

  // --- Constants ---------------------------------------------------------

  const snapPoints = useMemo(() => ['100%'], []);
  const keyboardBehavior = useMemo(() => 'extend' as const, []);
  const keyboardBlurBehavior = useMemo(() => 'restore' as const, []);

  // --- Sheet handlers ----------------------------------------------------

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        if (isClosingIntentionallyRef.current) {
          isClosingIntentionallyRef.current = false;
          Keyboard.dismiss();
          // Reset initial data when sheet closes to avoid stale data next time
          setInitialData(null);
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
                  setInitialData(null);
                },
              },
            ],
            { cancelable: true },
          );
          return;
        }

        Keyboard.dismiss();
        setInitialData(null);
        return;
      }
    },
    [bottomSheetRef, resetForm, t],
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
    [bottomSheetRef, resetForm, t],
  );

  // --- Submit ------------------------------------------------------------

  const handleSubmit = useCallback(async () => {
    const formValues = getFormValues();
    uiLogger.info('EditItemBottomSheet handleSubmit', formValues);

    const itemId = currentItemIdRef.current;
    if (!itemId) {
      uiLogger.error('No itemId found for update');
      return;
    }

    if (!formValues.name.trim()) {
      Alert.alert(
        t('editItem.errors.title'),
        t('editItem.errors.enterName'),
      );
      return;
    }
    if (!formValues.location) {
      Alert.alert(
        t('editItem.errors.title'),
        t('editItem.errors.selectLocation'),
      );
      return;
    }

    setIsLoading(true);
    try {
      const parsedWarningThreshold = parseInt(formValues.warningThreshold, 10);

      const updateValues = {
        name: formValues.name.trim(),
        location: formValues.location,
        detailedLocation: formValues.detailedLocation.trim(),
        status: formValues.status,
        categoryId: formValues.categoryId,
        warningThreshold: isNaN(parsedWarningThreshold) ? 0 : parsedWarningThreshold,
        icon: formValues.icon,
        iconColor: formValues.iconColor,
      };

      dispatch({ type: 'inventory/UPDATE_ITEM', payload: { id: itemId, updates: updateValues } });

      handleClose(true);
      resetForm();
      onItemUpdated?.();
    } catch (error) {
      uiLogger.error('Error updating item', error);
      Alert.alert(
        t('editItem.errors.title'),
        t('editItem.errors.updateFailed'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [getFormValues, dispatch, handleClose, resetForm, onItemUpdated, t]);

  // --- Expose present method ---------------------------------------------

  useImperativeHandle(
    ref,
    () => ({
      present: (itemId: string) => {
        uiLogger.info('present called with itemId', itemId);
        const state = store.getState() as RootState;
        const items = state.inventory.items;

        const item = items.find((i) => i.id === itemId);
        if (!item) {
          uiLogger.info('Item not found!');
          return;
        }

        // Store the current item ID
        currentItemIdRef.current = itemId;

        // Set initialData - this triggers form population
        setInitialData(item);

        // Present the bottom sheet immediately
        setTimeout(() => {
          bottomSheetRef.current?.present();
        }, 0);
      },
    }),
    [store, bottomSheetRef]
  );

  // --- Render helpers ----------------------------------------------------

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
          text={t('editItem.submit')}
          onPress={handleSubmit}
          icon="checkmark"
          tintColor={theme.colors.primary}
          textColor={theme.colors.surface}
          disabled={!isFormValid || isLoading}
          style={{ width: '100%' }}
        />
      </FooterContainer>
    ),
    [handleSubmit, isLoading, isFormValid, isKeyboardVisible, insets.bottom, t, theme],
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
      backgroundStyle={{ backgroundColor: theme.colors.background }}
    >
      <ContentContainer>
        <BottomSheetHeader
          title={t('editItem.title')}
          subtitle={t('editItem.subtitle')}
          onClose={() => handleClose()}
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
          <EditItemFormFields
            selectedLocation={selectedLocation}
            selectedCategoryId={selectedCategoryId}
            selectedStatusId={selectedStatusId}
            selectedIcon={selectedIcon}
            selectedColor={selectedColor}
            formKey={formKey}
            nameInputRef={nameInputRef}
            detailedLocationInputRef={detailedLocationInputRef}
            warningThresholdInputRef={warningThresholdInputRef}
            defaultName={defaultName}
            defaultDetailedLocation={defaultDetailedLocation}
            defaultWarningThreshold={defaultWarningThreshold}
            onLocationSelect={setSelectedLocation}
            onCategorySelect={setSelectedCategoryId}
            onStatusSelect={setSelectedStatusId}
            onIconSelect={setSelectedIcon}
            onColorSelect={setSelectedColor}
            onNameChangeText={handleNameChangeText}
            onNameBlur={handleNameBlur}
            onDetailedLocationChange={handleDetailedLocationChange}
            onDetailedLocationBlur={handleDetailedLocationBlur}
            onWarningThresholdChange={handleWarningThresholdChange}
            onWarningThresholdBlur={handleWarningThresholdBlur}
            onOpeningNestedModal={(isOpening) => {
              isOpeningNestedModalRef.current = isOpening;
            }}
            translations={translations}
          />
        </BottomSheetScrollView>
      </ContentContainer>
    </BottomSheetModal>
  );
});

EditItemBottomSheet.displayName = 'EditItemBottomSheet';
