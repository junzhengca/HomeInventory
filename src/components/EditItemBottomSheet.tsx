import React, {
  useRef,
  useCallback,
  useMemo,
  useEffect,
  useState,
} from 'react';
import { Alert, TextInput } from 'react-native';
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

interface EditItemBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  itemId: string;
  onItemUpdated?: () => void;
}

/**
 * EditItemBottomSheet using uncontrolled inputs for Pinyin/IME support.
 * Follows the same pattern as CreateItemBottomSheet.
 */
export const EditItemBottomSheet: React.FC<EditItemBottomSheetProps> = ({
  bottomSheetRef,
  itemId,
  onItemUpdated,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { updateItem, items } = useInventory();
  const { isKeyboardVisible, dismissKeyboard } = useKeyboardVisibility();

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

  // Use a ref for items to always get fresh data (prevents stale closure after sync)
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Track which itemId we've initialized to prevent re-initialization on data changes
  const initializedItemIdRef = useRef<string | null>(null);

  // Handle sheet open/close - initialize form when opening
  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === 0) {
        // Modal opened - initialize form if we haven't for this itemId
        if (itemId && itemId !== initializedItemIdRef.current) {
          // Read from ref to get fresh items after sync
          const foundItem = itemsRef.current.find((i) => i.id === itemId);
          if (foundItem) {
            initializedItemIdRef.current = itemId;

            // Update both refs and state
            const name = foundItem.name ?? '';
            const price = foundItem.price?.toString() ?? '0';
            const detailedLocation = foundItem.detailedLocation ?? '';
            const amount =
              foundItem.amount !== undefined && foundItem.amount !== null
                ? foundItem.amount.toString()
                : '1';
            const warningThreshold =
              foundItem.warningThreshold !== undefined &&
              foundItem.warningThreshold !== null
                ? foundItem.warningThreshold.toString()
                : '0';

            // Update refs for form submission
            nameValueRef.current = name;
            priceValueRef.current = price;
            detailedLocationValueRef.current = detailedLocation;
            amountValueRef.current = amount;
            warningThresholdValueRef.current = warningThreshold;

            // Update state for defaultValue props
            setDefaultName(name);
            setDefaultPrice(price);
            setDefaultDetailedLocation(detailedLocation);
            setDefaultAmount(amount);
            setDefaultWarningThreshold(warningThreshold);

            if (foundItem.icon) setSelectedIcon(foundItem.icon);
            if (foundItem.iconColor) setSelectedColor(foundItem.iconColor);
            if (foundItem.location) setSelectedLocation(foundItem.location);
            if (foundItem.status) setSelectedStatus(foundItem.status);
            if (foundItem.purchaseDate)
              setPurchaseDate(new Date(foundItem.purchaseDate));
            if (foundItem.expiryDate)
              setExpiryDate(new Date(foundItem.expiryDate));

            setFormKey((prev) => prev + 1);
          }
        }
      } else if (index === -1) {
        // Modal closed - reset initialization tracking
        initializedItemIdRef.current = null;
      }
    },
    [itemId]
  );

  // Compute form validity synchronously from ref and location
  const getIsFormValid = useCallback(() => {
    const hasName = nameValueRef.current.trim().length > 0;
    const hasLocation = selectedLocation.length > 0;
    return hasName && hasLocation;
  }, [selectedLocation]);

  // Trigger re-render when location changes (affects validity)
  useEffect(() => {
    setValidityTick((t) => t + 1);
  }, [selectedLocation]);

  const handleClose = useCallback(() => {
    dismissKeyboard();
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef, dismissKeyboard]);

  const handleSubmit = useCallback(async () => {
    const currentName = nameValueRef.current;
    const currentPrice = priceValueRef.current;
    const currentDetailedLocation = detailedLocationValueRef.current;
    const currentAmount = amountValueRef.current;
    const currentWarningThreshold = warningThresholdValueRef.current;

    // Validation
    if (!currentName.trim()) {
      Alert.alert(
        t('editItem.errors.title'),
        t('editItem.errors.enterName')
      );
      return;
    }
    if (!selectedLocation) {
      Alert.alert(
        t('editItem.errors.title'),
        t('editItem.errors.selectLocation')
      );
      return;
    }

    setIsLoading(true);
    try {
      const priceNum = parseFloat(currentPrice) || 0;
      const amountNum = currentAmount
        ? parseInt(currentAmount, 10)
        : undefined;
      const warningThresholdNum = parseInt(currentWarningThreshold, 10) || 0;

      const updates = {
        name: currentName.trim(),
        location: selectedLocation,
        detailedLocation: currentDetailedLocation.trim(),
        status: selectedStatus,
        price: priceNum,
        amount: amountNum,
        warningThreshold: warningThresholdNum,
        purchaseDate: purchaseDate?.toISOString(),
        expiryDate: expiryDate?.toISOString(),
        icon: selectedIcon,
        iconColor: selectedColor,
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
    onItemUpdated,
    updateItem,
    itemId,
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
          label={t('editItem.submit')}
          onPress={handleSubmit}
          variant="primary"
          icon="checkmark"
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
      setValidityTick((t) => t + 1);
    }
  }, [getIsFormValid]);

  const handlePriceChangeText = useCallback((text: string) => {
    priceValueRef.current = text;
  }, []);

  const handleDetailedLocationChangeText = useCallback((text: string) => {
    detailedLocationValueRef.current = text;
  }, []);

  const handleNameBlur = useCallback(() => {
    // Validation is computed via getIsFormValid
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
  const namePlaceholder = useMemo(() => t('editItem.placeholders.name'), [t]);
  const pricePlaceholder = useMemo(
    () => t('editItem.placeholders.price'),
    [t]
  );
  const detailedLocationPlaceholder = useMemo(
    () => t('editItem.placeholders.detailedLocation'),
    [t]
  );
  const amountPlaceholder = useMemo(
    () => t('editItem.placeholders.amount'),
    [t]
  );
  const warningThresholdPlaceholder = useMemo(
    () => t('editItem.placeholders.warningThreshold'),
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
            paddingHorizontal: theme.spacing.md,
            paddingBottom: theme.spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnPanDownToDismiss={false}
        >
          <FormContainer key={formKey}>
            <FormSection label={t('editItem.fields.name')}>
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
                <FormSection label={t('editItem.fields.amount')}>
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
                <FormSection label={t('editItem.fields.warningThreshold')}>
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

            <FormSection label={t('editItem.fields.location')}>
              <LocationField
                selectedId={selectedLocation}
                onSelect={setSelectedLocation}
              />
            </FormSection>

            <FormSection label={t('editItem.fields.status')}>
              <StatusField
                selectedId={selectedStatus}
                onSelect={setSelectedStatus}
              />
            </FormSection>

            <Row>
              <HalfContainer>
                <FormSection label={t('editItem.fields.price')}>
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
                <FormSection label={t('editItem.fields.detailedLocation')}>
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
                <FormSection label={t('editItem.fields.purchaseDate')}>
                  <DatePicker
                    value={purchaseDate}
                    onChange={setPurchaseDate}
                    maximumDate={new Date()}
                  />
                </FormSection>
              </HalfContainer>
              <HalfContainer>
                <FormSection label={t('editItem.fields.expiryDate')}>
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
