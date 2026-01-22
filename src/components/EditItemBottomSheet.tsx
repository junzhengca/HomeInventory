import React, { useRef, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
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
import { useInventory } from '../store/hooks';
import { useItemForm, useKeyboardVisibility } from '../hooks';
import { BottomSheetHeader, FormSection, MemoizedInput, NumberInput } from './ui';
import { LocationField, StatusField } from './form';
import { IconColorPicker } from './IconColorPicker';
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
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const Row = styled.View`
  flex-direction: row;
  gap: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const NameRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const HalfContainer = styled.View`
  flex: 1;
`;

const HalfInput = styled(MemoizedInput)`
  flex: 1;
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
  const { isKeyboardVisible, dismissKeyboard } = useKeyboardVisibility();

  const isModalOpenRef = useRef<boolean>(false);

  const {
    item,
    formData,
    isLoading,
    updateField,
    validate,
    initializeFromItem,
  } = useItemForm({
    itemId,
    onItemLoaded: (_loadedItem) => {
      // Mark as initialized when item is loaded
      isModalOpenRef.current = false;
    },
  });

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
      const priceNum = parseFloat(formData.price) || 0;
      const amountNum = formData.amount
        ? parseInt(formData.amount, 10)
        : undefined;
      const warningThresholdNum = parseInt(formData.warningThreshold, 10) || 0;

      const updates = {
        name: formData.name.trim(),
        location: formData.locationId,
        detailedLocation: formData.detailedLocation.trim(),
        status: formData.status,
        price: priceNum,
        amount: amountNum,
        warningThreshold: warningThresholdNum,
        purchaseDate: formData.purchaseDate?.toISOString(),
        expiryDate: formData.expiryDate?.toISOString(),
        icon: formData.icon,
        iconColor: formData.iconColor,
      };

      updateItem(itemId, updates);

      handleClose();
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
    itemId,
    validate,
    updateItem,
    handleClose,
    onItemUpdated,
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
      handleComponent={null}
      topInset={insets.top}
      index={0}
      footerComponent={renderFooter}
      enableDynamicSizing={false}
      onChange={handleSheetChanges}
    >
      <ContentContainer>
        <BottomSheetHeader
          title={t('editItem.title')}
          subtitle={t('editItem.subtitle')}
          onClose={handleClose}
        />
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnPanDownToDismiss={false}
        >
          <FormContainer>
            <FormSection label={t('editItem.fields.name')}>
              <NameRow>
                <IconColorPicker
                  icon={formData.icon}
                  color={formData.iconColor}
                  onIconSelect={(icon) => updateField('icon', icon)}
                  onColorSelect={(color) => updateField('iconColor', color)}
                />
                <MemoizedInput
                  value={formData.name}
                  onChangeText={(text) => updateField('name', text)}
                  placeholder={t('editItem.placeholders.name')}
                  placeholderTextColor={theme.colors.textLight}
                  style={{ flex: 1 }}
                />
              </NameRow>
            </FormSection>

            <FormSection label={t('editItem.fields.location')}>
              <LocationField
                selectedId={formData.locationId}
                onSelect={(id) => updateField('locationId', id)}
              />
            </FormSection>

            <FormSection label={t('editItem.fields.status')}>
              <StatusField
                selectedId={formData.status}
                onSelect={(id) => updateField('status', id)}
              />
            </FormSection>

            <Row>
              <HalfContainer>
                <FormSection
                  label={t('editItem.fields.price')}
                  style={{ marginBottom: theme.spacing.sm }}
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
                  style={{ marginBottom: theme.spacing.sm }}
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

            <Row>
              <HalfContainer>
                <FormSection
                  label={t('editItem.fields.amount')}
                  style={{ marginBottom: theme.spacing.sm }}
                >
                  <NumberInput
                    value={formData.amount}
                    onChangeText={(text) => updateField('amount', text)}
                    placeholder={t('editItem.placeholders.amount')}
                    placeholderTextColor={theme.colors.textLight}
                    keyboardType="numeric"
                    min={0}
                  />
                </FormSection>
              </HalfContainer>
              <HalfContainer>
                <FormSection
                  label={t('editItem.fields.warningThreshold')}
                  style={{ marginBottom: theme.spacing.sm }}
                >
                  <NumberInput
                    value={formData.warningThreshold}
                    onChangeText={(text) => updateField('warningThreshold', text)}
                    placeholder={t('editItem.placeholders.warningThreshold')}
                    placeholderTextColor={theme.colors.textLight}
                    keyboardType="numeric"
                    min={0}
                  />
                </FormSection>
              </HalfContainer>
            </Row>

            <Row>
              <HalfContainer>
                <FormSection
                  label={t('editItem.fields.purchaseDate')}
                  style={{ marginBottom: theme.spacing.sm }}
                >
                  <DatePicker
                    value={formData.purchaseDate}
                    onChange={(date) => updateField('purchaseDate', date)}
                    maximumDate={new Date()}
                  />
                </FormSection>
              </HalfContainer>
              <HalfContainer>
                <FormSection
                  label={t('editItem.fields.expiryDate')}
                  style={{ marginBottom: theme.spacing.sm }}
                >
                  <DatePicker
                    value={formData.expiryDate}
                    onChange={(date) => updateField('expiryDate', date)}
                    minimumDate={new Date()}
                  />
                </FormSection>
              </HalfContainer>
            </Row>
          </FormContainer>
        </BottomSheetScrollView>
      </ContentContainer>
    </BottomSheetModal>
  );
};
