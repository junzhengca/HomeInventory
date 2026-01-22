import React, {
  useRef,
  useCallback,
  useMemo,
  useEffect,
  useState,
} from 'react';
import { Alert, TextInput, Keyboard } from 'react-native';
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
import { useInventory } from '../store/hooks';
import { useKeyboardVisibility } from '../hooks';
import { BottomSheetHeader, FormSection, UncontrolledInput, NumberInput } from './ui';
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

const HalfInput = styled(UncontrolledInput)`
  flex: 1;
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
  const { isKeyboardVisible } = useKeyboardVisibility();

  const nameInputRef = useRef<TextInput>(null);
  const priceInputRef = useRef<TextInput>(null);
  const detailedLocationInputRef = useRef<TextInput>(null);
  const amountInputRef = useRef<TextInput>(null);
  const warningThresholdInputRef = useRef<TextInput>(null);

  // Form state using refs to prevent IME interruption
  const nameValueRef = useRef('');
  const priceValueRef = useRef('0');
  const detailedLocationValueRef = useRef('');
  const amountValueRef = useRef('1');
  const warningThresholdValueRef = useRef('0');

  // Regular state for icon/color/location/status/dates (doesn't affect IME)
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof Ionicons.glyphMap>('cube-outline');
  const [selectedColor, setSelectedColor] = useState<string>('#95A5A6');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('using');
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formKey, setFormKey] = useState(0); // Force remount on reset

  // Auto-select icon/color when sheet opens
  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        Keyboard.dismiss();
        return;
      }

      if (index === 0) {
        // Focus name input
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }
    },
    []
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
    amountValueRef.current = '1';
    warningThresholdValueRef.current = '0';
    setSelectedIcon('cube-outline');
    setSelectedColor('#95A5A6');
    setSelectedStatus('using');
    setPurchaseDate(null);
    setExpiryDate(null);
    setFormKey((prev) => prev + 1);
  }, [bottomSheetRef]);

  const handleSubmit = useCallback(async () => {
    const currentName = nameValueRef.current;
    const currentPrice = priceValueRef.current;
    const currentDetailedLocation = detailedLocationValueRef.current;
    const currentAmount = amountValueRef.current;
    const currentWarningThreshold = warningThresholdValueRef.current;

    // Validation
    if (!currentName.trim()) {
      Alert.alert(
        t('createItem.errors.title'),
        t('createItem.errors.enterName')
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
      const priceNum = parseFloat(currentPrice) || 0;
      const amountNum = currentAmount ? parseInt(currentAmount, 10) : undefined;
      const warningThresholdNum = parseInt(currentWarningThreshold, 10) || 0;

      createItem({
        name: currentName.trim(),
        location: selectedLocation,
        detailedLocation: currentDetailedLocation.trim(),
        status: selectedStatus,
        price: priceNum,
        amount: amountNum,
        warningThreshold: warningThresholdNum,
        icon: selectedIcon,
        iconColor: selectedColor,
        purchaseDate: purchaseDate?.toISOString(),
        expiryDate: expiryDate?.toISOString(),
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
    selectedIcon,
    selectedColor,
    selectedLocation,
    selectedStatus,
    purchaseDate,
    expiryDate,
    handleClose,
    onItemCreated,
    createItem,
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

  // onBlur handlers (sync refs if needed, though we're not using state here)
  const handleNameBlur = useCallback(() => {
    // No state to sync, ref is already updated
  }, []);

  const handlePriceBlur = useCallback(() => {
    // No state to sync, ref is already updated
  }, []);

  const handleDetailedLocationBlur = useCallback(() => {
    // No state to sync, ref is already updated
  }, []);

  const handleAmountChangeText = useCallback((text: string) => {
    amountValueRef.current = text;
  }, []);

  const handleAmountBlur = useCallback(() => {
    // No state to sync, ref is already updated
  }, []);

  const handleWarningThresholdChangeText = useCallback((text: string) => {
    warningThresholdValueRef.current = text;
  }, []);

  const handleWarningThresholdBlur = useCallback(() => {
    // No state to sync, ref is already updated
  }, []);

  // Memoize placeholder strings to prevent re-renders
  const namePlaceholder = useMemo(
    () => t('createItem.placeholders.name'),
    [t]
  );
  const pricePlaceholder = useMemo(
    () => t('createItem.placeholders.price'),
    [t]
  );
  const detailedLocationPlaceholder = useMemo(
    () => t('createItem.placeholders.detailedLocation'),
    [t]
  );
  const amountPlaceholder = useMemo(
    () => t('createItem.placeholders.amount'),
    [t]
  );
  const warningThresholdPlaceholder = useMemo(
    () => t('createItem.placeholders.warningThreshold'),
    [t]
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
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnPanDownToDismiss={false}
        >
          <FormContainer key={formKey}>
            <FormSection label={t('createItem.fields.name')}>
              <NameRow>
                <IconColorPicker
                  icon={selectedIcon}
                  color={selectedColor}
                  onIconSelect={setSelectedIcon}
                  onColorSelect={setSelectedColor}
                />
                <UncontrolledInput
                  ref={nameInputRef}
                  defaultValue={nameValueRef.current}
                  onChangeText={handleNameChangeText}
                  onBlur={handleNameBlur}
                  placeholder={namePlaceholder}
                  placeholderTextColor={theme.colors.textLight}
                  style={{ flex: 1 }}
                />
              </NameRow>
            </FormSection>

            <FormSection label={t('createItem.fields.location')}>
              <LocationField
                selectedId={selectedLocation}
                onSelect={setSelectedLocation}
              />
            </FormSection>

            <FormSection label={t('createItem.fields.status')}>
              <StatusField
                selectedId={selectedStatus}
                onSelect={setSelectedStatus}
              />
            </FormSection>

            <Row>
              <HalfContainer>
                <FormSection
                  label={t('createItem.fields.price')}
                  style={{ marginBottom: theme.spacing.sm }}
                >
                  <HalfInput
                    ref={priceInputRef}
                    defaultValue={priceValueRef.current}
                    onChangeText={handlePriceChangeText}
                    onBlur={handlePriceBlur}
                    placeholder={pricePlaceholder}
                    placeholderTextColor={theme.colors.textLight}
                    keyboardType="numeric"
                  />
                </FormSection>
              </HalfContainer>
              <HalfContainer>
                <FormSection
                  label={t('createItem.fields.detailedLocation')}
                  style={{ marginBottom: theme.spacing.sm }}
                >
                  <HalfInput
                    ref={detailedLocationInputRef}
                    defaultValue={detailedLocationValueRef.current}
                    onChangeText={handleDetailedLocationChangeText}
                    onBlur={handleDetailedLocationBlur}
                    placeholder={detailedLocationPlaceholder}
                    placeholderTextColor={theme.colors.textLight}
                  />
                </FormSection>
              </HalfContainer>
            </Row>

            <Row>
              <HalfContainer>
                <FormSection
                  label={t('createItem.fields.amount')}
                  style={{ marginBottom: theme.spacing.sm }}
                >
                  <NumberInput
                    ref={amountInputRef}
                    defaultValue={amountValueRef.current}
                    onChangeText={handleAmountChangeText}
                    onBlur={handleAmountBlur}
                    placeholder={amountPlaceholder}
                    placeholderTextColor={theme.colors.textLight}
                    keyboardType="numeric"
                    min={0}
                  />
                </FormSection>
              </HalfContainer>
              <HalfContainer>
                <FormSection
                  label={t('createItem.fields.warningThreshold')}
                  style={{ marginBottom: theme.spacing.sm }}
                >
                  <NumberInput
                    ref={warningThresholdInputRef}
                    defaultValue={warningThresholdValueRef.current}
                    onChangeText={handleWarningThresholdChangeText}
                    onBlur={handleWarningThresholdBlur}
                    placeholder={warningThresholdPlaceholder}
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
                  label={t('createItem.fields.purchaseDate')}
                  style={{ marginBottom: theme.spacing.sm }}
                >
                  <DatePicker
                    value={purchaseDate}
                    onChange={setPurchaseDate}
                    maximumDate={new Date()}
                  />
                </FormSection>
              </HalfContainer>
              <HalfContainer>
                <FormSection
                  label={t('createItem.fields.expiryDate')}
                  style={{ marginBottom: theme.spacing.sm }}
                >
                  <DatePicker
                    value={expiryDate}
                    onChange={setExpiryDate}
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
