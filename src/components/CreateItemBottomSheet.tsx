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
import { InventoryItem } from '../types/inventory';
import { useInventory } from '../store/hooks';
import { useKeyboardVisibility } from '../hooks';
import {
  BottomSheetHeader,
  FormSection,
  UncontrolledInput,
  NumberInput,
  Button,
} from './ui';
import { LocationField, StatusField } from './form';
import { IconColorPicker } from './IconColorPicker';
import { DatePicker } from './DatePicker';

const Backdrop = styled(BottomSheetBackdrop)`
  background-color: rgba(0, 0, 0, 0.5);
`;

const ContentContainer = styled.View`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  overflow: hidden;
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

const FooterContainer = styled.View<{ bottomInset: number; showSafeArea: boolean }>`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  padding-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-bottom: ${({ bottomInset, showSafeArea, theme }: StyledProps & { bottomInset: number; showSafeArea: boolean }) =>
    showSafeArea ? bottomInset + theme.spacing.md : theme.spacing.md}px;
  shadow-color: #000;
  shadow-offset: 0px -2px;
  shadow-opacity: 0.03;
  shadow-radius: 4px;
  elevation: 2;
`;

interface CreateItemBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal>;
  onItemCreated?: () => void;
  initialData?: Partial<InventoryItem> | null;
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
  initialData,
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

  // Form state using refs to prevent IME interruption during typing
  const nameValueRef = useRef('');
  const priceValueRef = useRef('0');
  const detailedLocationValueRef = useRef('');
  const amountValueRef = useRef('1');
  const warningThresholdValueRef = useRef('0');

  // State for initial/default values (used for defaultValue prop on uncontrolled inputs)
  const [defaultName, setDefaultName] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('0');
  const [defaultDetailedLocation, setDefaultDetailedLocation] = useState('');
  const [defaultAmount, setDefaultAmount] = useState('1');
  const [defaultWarningThreshold, setDefaultWarningThreshold] = useState('0');

  // Force re-render when validity changes (for button state)
  const [, setValidityTick] = useState(0);

  // Regular state for icon/color/location/status/dates (doesn't affect IME)
  const [selectedIcon, setSelectedIcon] =
    useState<keyof typeof Ionicons.glyphMap>('cube-outline');
  const [selectedColor, setSelectedColor] = useState<string>('#95A5A6');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('using');
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formKey, setFormKey] = useState(0); // Force remount on reset

  // Compute form validity synchronously from ref and location
  const getIsFormValid = useCallback(() => {
    const hasName = nameValueRef.current.trim().length > 0;
    const hasLocation = selectedLocation.length > 0;
    return hasName && hasLocation;
  }, [selectedLocation]);

  // Auto-select icon/color when sheet opens
  const handleSheetChange = useCallback((index: number) => {
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
  }, []);

  // Auto-select first location if none selected
  useEffect(() => {
    if (!selectedLocation) {
      if (locations.length > 0) {
        setSelectedLocation(locations[0].id);
      }
    }
  }, [selectedLocation]);

  // Trigger re-render when location changes (affects validity)
  useEffect(() => {
    setValidityTick(t => t + 1);
  }, [selectedLocation]);

  useEffect(() => {
    if (initialData) {
      // Update both refs (for submit) and state (for defaultValue)
      const name = initialData.name ?? '';
      const price = initialData.price?.toString() ?? '0';
      const detailedLocation = initialData.detailedLocation ?? '';
      const amount =
        initialData.amount !== undefined && initialData.amount !== null
          ? initialData.amount.toString()
          : '1';
      const warningThreshold =
        initialData.warningThreshold !== undefined &&
        initialData.warningThreshold !== null
          ? initialData.warningThreshold.toString()
          : '0';

      // Update refs for form submission
      nameValueRef.current = name;
      priceValueRef.current = price;
      detailedLocationValueRef.current = detailedLocation;
      amountValueRef.current = amount;
      warningThresholdValueRef.current = warningThreshold;

      // Update state for defaultValue props (triggers re-render with correct values)
      setDefaultName(name);
      setDefaultPrice(price);
      setDefaultDetailedLocation(detailedLocation);
      setDefaultAmount(amount);
      setDefaultWarningThreshold(warningThreshold);

      if (initialData.icon) setSelectedIcon(initialData.icon);
      if (initialData.iconColor) setSelectedColor(initialData.iconColor);
      if (initialData.location) setSelectedLocation(initialData.location);
      if (initialData.status) setSelectedStatus(initialData.status);
      if (initialData.purchaseDate)
        setPurchaseDate(new Date(initialData.purchaseDate));
      if (initialData.expiryDate)
        setExpiryDate(new Date(initialData.expiryDate));

      setFormKey((prev) => prev + 1);
    }
  }, [initialData]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    bottomSheetRef.current?.dismiss();

    // Reset refs
    nameValueRef.current = '';
    priceValueRef.current = '0';
    detailedLocationValueRef.current = '';
    amountValueRef.current = '1';
    warningThresholdValueRef.current = '0';

    // Reset state for defaultValue props
    setDefaultName('');
    setDefaultPrice('0');
    setDefaultDetailedLocation('');
    setDefaultAmount('1');
    setDefaultWarningThreshold('0');

    // Reset other state
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
      <FooterContainer bottomInset={insets.bottom} showSafeArea={!isKeyboardVisible}>
        <Button
          label={t('createItem.submit')}
          onPress={handleSubmit}
          variant="primary"
          icon="add"
          disabled={!getIsFormValid() || isLoading}
        />
      </FooterContainer>
    ),
    [handleSubmit, isLoading, t, isKeyboardVisible, insets.bottom, getIsFormValid]
  );

  // Uncontrolled input handlers (update refs, no re-render)
  const handleNameChangeText = useCallback((text: string) => {
    const wasValid = getIsFormValid();
    nameValueRef.current = text;
    const isValid = getIsFormValid();
    // Force re-render if validity changed
    if (wasValid !== isValid) {
      setValidityTick(t => t + 1);
    }
  }, [getIsFormValid]);

  const handlePriceChangeText = useCallback((text: string) => {
    priceValueRef.current = text;
  }, []);

  const handleDetailedLocationChangeText = useCallback((text: string) => {
    detailedLocationValueRef.current = text;
  }, []);

  // onBlur handlers (sync refs if needed, though we're not using state here)
  const handleNameBlur = useCallback(() => {
    // Validation is computed via useMemo
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
  const namePlaceholder = useMemo(() => t('createItem.placeholders.name'), [t]);
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
            paddingHorizontal: theme.spacing.md,
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
                  defaultValue={defaultName}
                  onChangeText={handleNameChangeText}
                  onBlur={handleNameBlur}
                  placeholder={namePlaceholder}
                  placeholderTextColor={theme.colors.textLight}
                  style={{ flex: 1 }}
                />
              </NameRow>
            </FormSection>

            <Row>
              <HalfContainer>
                <FormSection label={t('createItem.fields.amount')}>
                  <NumberInput
                    ref={amountInputRef}
                    defaultValue={defaultAmount}
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
                <FormSection label={t('createItem.fields.warningThreshold')}>
                  <NumberInput
                    ref={warningThresholdInputRef}
                    defaultValue={defaultWarningThreshold}
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
                <FormSection label={t('createItem.fields.price')}>
                  <HalfInput
                    ref={priceInputRef}
                    defaultValue={defaultPrice}
                    onChangeText={handlePriceChangeText}
                    onBlur={handlePriceBlur}
                    placeholder={pricePlaceholder}
                    placeholderTextColor={theme.colors.textLight}
                    keyboardType="numeric"
                  />
                </FormSection>
              </HalfContainer>
              <HalfContainer>
                <FormSection label={t('createItem.fields.detailedLocation')}>
                  <HalfInput
                    ref={detailedLocationInputRef}
                    defaultValue={defaultDetailedLocation}
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
