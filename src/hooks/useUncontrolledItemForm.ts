import React, { useRef, useCallback, useEffect, useState } from 'react';
import { TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { locations } from '../data/locations';
import type { InventoryItem } from '../types/inventory';

export interface ItemFormValues {
  name: string;
  price: string;
  detailedLocation: string;
  amount: string;
  warningThreshold: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  location: string;
  status: string;
  purchaseDate: Date | null;
  expiryDate: Date | null;
}

export interface ItemFormRefs {
  nameInput: React.RefObject<TextInput | null>;
  priceInput: React.RefObject<TextInput | null>;
  detailedLocationInput: React.RefObject<TextInput | null>;
  amountInput: React.RefObject<TextInput | null>;
  warningThresholdInput: React.RefObject<TextInput | null>;
}

export interface UseUncontrolledItemFormOptions {
  initialData?: Partial<InventoryItem> | null;
  onFormValidChange?: (isValid: boolean) => void;
}

interface FormInitialValues {
  name: string;
  price: string;
  detailedLocation: string;
  amount: string;
  warningThreshold: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  location: string;
  status: string;
  purchaseDate: Date | null;
  expiryDate: Date | null;
}

const DEFAULT_ICON: keyof typeof Ionicons.glyphMap = 'cube-outline';
const DEFAULT_COLOR = '#95A5A6';
const DEFAULT_STATUS = 'using';
const DEFAULT_LOCATION = locations.length > 0 ? locations[0].id : '';

/**
 * Custom hook for managing item form state using uncontrolled inputs.
 * Uses refs for text input values to prevent IME composition interruption
 * for Chinese/Japanese input methods.
 *
 * @see .cursor/rules/pinyin-input-pattern.mdc
 */
export const useUncontrolledItemForm = (
  options: UseUncontrolledItemFormOptions = {}
) => {
  const { initialData, onFormValidChange } = options;

  // Input refs
  const nameInputRef = useRef<TextInput>(null);
  const priceInputRef = useRef<TextInput>(null);
  const detailedLocationInputRef = useRef<TextInput>(null);
  const amountInputRef = useRef<TextInput>(null);
  const warningThresholdInputRef = useRef<TextInput>(null);

  // Value refs (for uncontrolled inputs - prevents IME interruption)
  const nameValueRef = useRef('');
  const priceValueRef = useRef('0');
  const detailedLocationValueRef = useRef('');
  const amountValueRef = useRef('1');
  const warningThresholdValueRef = useRef('0');

  // Initial values ref (for dirty state tracking)
  const initialValuesRef = useRef<FormInitialValues>({
    name: '',
    price: '0',
    detailedLocation: '',
    amount: '1',
    warningThreshold: '0',
    icon: DEFAULT_ICON,
    iconColor: DEFAULT_COLOR,
    location: DEFAULT_LOCATION,
    status: DEFAULT_STATUS,
    purchaseDate: null,
    expiryDate: null,
  });

  // Default value states (for defaultValue prop on uncontrolled inputs)
  const [defaultName, setDefaultName] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('0');
  const [defaultDetailedLocation, setDefaultDetailedLocation] = useState('');
  const [defaultAmount, setDefaultAmount] = useState('1');
  const [defaultWarningThreshold, setDefaultWarningThreshold] = useState('0');

  // Force re-render when validity changes (for button state)
  const [formKey, setFormKey] = useState(0);
  const [, setValidityTick] = useState(0);

  // Regular state for non-text fields (doesn't affect IME)
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof Ionicons.glyphMap>(
    DEFAULT_ICON
  );
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);
  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_LOCATION);
  const [selectedStatus, setSelectedStatus] = useState(DEFAULT_STATUS);
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);

  // Computed validation
  const getIsFormValid = useCallback(() => {
    const hasName = nameValueRef.current.trim().length > 0;
    const hasLocation = selectedLocation.length > 0;
    return hasName && hasLocation;
  }, [selectedLocation]);

  // Trigger re-render when location changes (affects validity)
  useEffect(() => {
    setValidityTick((t) => t + 1);
    onFormValidChange?.(getIsFormValid());
  }, [selectedLocation, getIsFormValid, onFormValidChange]);

  // Initialize form from initialData
  useEffect(() => {
    if (initialData) {
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

      // Store initial values for dirty state tracking
      initialValuesRef.current = {
        name,
        price,
        detailedLocation,
        amount,
        warningThreshold,
        icon: initialData.icon ?? DEFAULT_ICON,
        iconColor: initialData.iconColor ?? DEFAULT_COLOR,
        location: initialData.location ?? DEFAULT_LOCATION,
        status: initialData.status ?? DEFAULT_STATUS,
        purchaseDate: initialData.purchaseDate
          ? new Date(initialData.purchaseDate)
          : null,
        expiryDate: initialData.expiryDate
          ? new Date(initialData.expiryDate)
          : null,
      };

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

      if (initialData.icon) setSelectedIcon(initialData.icon);
      if (initialData.iconColor) setSelectedColor(initialData.iconColor);
      if (initialData.location) setSelectedLocation(initialData.location);
      if (initialData.status) setSelectedStatus(initialData.status);
      if (initialData.purchaseDate)
        setPurchaseDate(new Date(initialData.purchaseDate));
      if (initialData.expiryDate)
        setExpiryDate(new Date(initialData.expiryDate));

      setFormKey((prev) => prev + 1);

      // Notify parent of validity state after initialization
      // Check if form is valid after populating
      const hasName = name.trim().length > 0;
      const hasLocation = initialData.location
        ? initialData.location.length > 0
        : false;
      onFormValidChange?.(hasName && hasLocation);
    }
  }, [initialData, onFormValidChange]);

  // Reset form to defaults
  const resetForm = useCallback(() => {
    // Reset initial values to defaults
    initialValuesRef.current = {
      name: '',
      price: '0',
      detailedLocation: '',
      amount: '1',
      warningThreshold: '0',
      icon: DEFAULT_ICON,
      iconColor: DEFAULT_COLOR,
      location: DEFAULT_LOCATION,
      status: DEFAULT_STATUS,
      purchaseDate: null,
      expiryDate: null,
    };

    // Reset refs
    nameValueRef.current = '';
    priceValueRef.current = '0';
    detailedLocationValueRef.current = '';
    amountValueRef.current = '1';
    warningThresholdValueRef.current = '0';

    // Reset default values
    setDefaultName('');
    setDefaultPrice('0');
    setDefaultDetailedLocation('');
    setDefaultAmount('1');
    setDefaultWarningThreshold('0');

    // Reset other state
    setSelectedIcon(DEFAULT_ICON);
    setSelectedColor(DEFAULT_COLOR);
    setSelectedLocation(DEFAULT_LOCATION);
    setSelectedStatus(DEFAULT_STATUS);
    setPurchaseDate(null);
    setExpiryDate(null);
    setFormKey((prev) => prev + 1);
  }, []);

  // Get current form values for submission
  const getFormValues = useCallback((): ItemFormValues => {
    return {
      name: nameValueRef.current,
      price: priceValueRef.current,
      detailedLocation: detailedLocationValueRef.current,
      amount: amountValueRef.current,
      warningThreshold: warningThresholdValueRef.current,
      icon: selectedIcon,
      iconColor: selectedColor,
      location: selectedLocation,
      status: selectedStatus,
      purchaseDate,
      expiryDate,
    };
  }, [
    selectedIcon,
    selectedColor,
    selectedLocation,
    selectedStatus,
    purchaseDate,
    expiryDate,
  ]);

  // Input change handlers
  const handleNameChangeText = useCallback(
    (text: string) => {
      const wasValid = getIsFormValid();
      nameValueRef.current = text;
      const isValid = getIsFormValid();
      if (wasValid !== isValid) {
        setValidityTick((t) => t + 1);
        onFormValidChange?.(isValid);
      }
    },
    [getIsFormValid, onFormValidChange]
  );

  const handlePriceChangeText = useCallback((text: string) => {
    priceValueRef.current = text;
  }, []);

  const handleDetailedLocationChangeText = useCallback((text: string) => {
    detailedLocationValueRef.current = text;
  }, []);

  const handleAmountChangeText = useCallback((text: string) => {
    amountValueRef.current = text;
  }, []);

  const handleWarningThresholdChangeText = useCallback((text: string) => {
    warningThresholdValueRef.current = text;
  }, []);

  // Blur handlers (no-op for uncontrolled pattern, but kept for consistency)
  const handleNameBlur = useCallback(() => undefined, []);
  const handlePriceBlur = useCallback(() => undefined, []);
  const handleDetailedLocationBlur = useCallback(() => undefined, []);
  const handleAmountBlur = useCallback(() => undefined, []);
  const handleWarningThresholdBlur = useCallback(() => undefined, []);

  // Direct form population method (bypasses initialData prop/state)
  const populateForm = useCallback(
    (data: Partial<InventoryItem>) => {
      const name = data.name ?? '';
      const price = data.price?.toString() ?? '0';
      const detailedLocation = data.detailedLocation ?? '';
      const amount =
        data.amount !== undefined && data.amount !== null
          ? data.amount.toString()
          : '1';
      const warningThreshold =
        data.warningThreshold !== undefined && data.warningThreshold !== null
          ? data.warningThreshold.toString()
          : '0';

      // Store initial values for dirty state tracking
      initialValuesRef.current = {
        name,
        price,
        detailedLocation,
        amount,
        warningThreshold,
        icon: data.icon ?? DEFAULT_ICON,
        iconColor: data.iconColor ?? DEFAULT_COLOR,
        location: data.location ?? DEFAULT_LOCATION,
        status: data.status ?? DEFAULT_STATUS,
        purchaseDate: data.purchaseDate
          ? new Date(data.purchaseDate)
          : null,
        expiryDate: data.expiryDate
          ? new Date(data.expiryDate)
          : null,
      };

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

      if (data.icon) setSelectedIcon(data.icon);
      if (data.iconColor) setSelectedColor(data.iconColor);
      if (data.location) setSelectedLocation(data.location);
      if (data.status) setSelectedStatus(data.status);
      if (data.purchaseDate)
        setPurchaseDate(new Date(data.purchaseDate));
      if (data.expiryDate) setExpiryDate(new Date(data.expiryDate));

      setFormKey((prev) => prev + 1);

      // Notify parent of validity state
      const hasName = name.trim().length > 0;
      const hasLocation = data.location ? data.location.length > 0 : false;
      onFormValidChange?.(hasName && hasLocation);
    },
    [onFormValidChange]
  );

  // Check if form has unsaved changes
  const isFormDirty = useCallback((): boolean => {
    const initial = initialValuesRef.current;
    const currentValues = {
      name: nameValueRef.current,
      price: priceValueRef.current,
      detailedLocation: detailedLocationValueRef.current,
      amount: amountValueRef.current,
      warningThreshold: warningThresholdValueRef.current,
      icon: selectedIcon,
      iconColor: selectedColor,
      location: selectedLocation,
      status: selectedStatus,
      purchaseDate,
      expiryDate,
    };

    // Compare dates properly (need to compare time for Date objects)
    const datesEqual = (d1: Date | null, d2: Date | null): boolean => {
      if (d1 === null && d2 === null) return true;
      if (d1 === null || d2 === null) return false;
      return d1.getTime() === d2.getTime();
    };

    return (
      currentValues.name !== initial.name ||
      currentValues.price !== initial.price ||
      currentValues.detailedLocation !== initial.detailedLocation ||
      currentValues.amount !== initial.amount ||
      currentValues.warningThreshold !== initial.warningThreshold ||
      currentValues.icon !== initial.icon ||
      currentValues.iconColor !== initial.iconColor ||
      currentValues.location !== initial.location ||
      currentValues.status !== initial.status ||
      !datesEqual(currentValues.purchaseDate, initial.purchaseDate) ||
      !datesEqual(currentValues.expiryDate, initial.expiryDate)
    );
  }, [selectedIcon, selectedColor, selectedLocation, selectedStatus, purchaseDate, expiryDate]);

  return {
    // Refs
    refs: {
      nameInput: nameInputRef,
      priceInput: priceInputRef,
      detailedLocationInput: detailedLocationInputRef,
      amountInput: amountInputRef,
      warningThresholdInput: warningThresholdInputRef,
    },
    // Default values for uncontrolled inputs
    defaultValues: {
      name: defaultName,
      price: defaultPrice,
      detailedLocation: defaultDetailedLocation,
      amount: defaultAmount,
      warningThreshold: defaultWarningThreshold,
    },
    // State values
    selectedIcon,
    selectedColor,
    selectedLocation,
    selectedStatus,
    purchaseDate,
    expiryDate,
    formKey,
    // Setters
    setSelectedIcon,
    setSelectedColor,
    setSelectedLocation,
    setSelectedStatus,
    setPurchaseDate,
    setExpiryDate,
    // Methods
    getIsFormValid,
    getFormValues,
    isFormDirty,
    resetForm,
    populateForm,
    // Input handlers
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
  };
};
