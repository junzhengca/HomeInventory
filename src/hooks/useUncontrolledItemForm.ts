import React, { useRef, useCallback, useEffect, useState } from 'react';
import { TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { locations } from '../data/locations';
import type { InventoryItem, ItemBatch } from '../types/inventory';
import { getTotalAmount, getEarliestExpiry, getLatestPurchase } from '../utils/batchUtils';

export interface ItemFormValues {
  name: string;
  detailedLocation: string;
  warningThreshold: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  location: string;
  status: string;
  categoryId: string | null;
  // Batch fields (used only in create mode)
  amount: string;
  unit: string;
  price: string;
  vendor: string;
  note: string;
  purchaseDate: Date | null;
  expiryDate: Date | null;
}

export interface ItemFormRefs {
  nameInput: React.RefObject<TextInput | null>;
  detailedLocationInput: React.RefObject<TextInput | null>;
  warningThresholdInput: React.RefObject<TextInput | null>;
  // Batch refs
  amountInput: React.RefObject<TextInput | null>;
  unitInput: React.RefObject<TextInput | null>;
  priceInput: React.RefObject<TextInput | null>;
  vendorInput: React.RefObject<TextInput | null>;
  noteInput: React.RefObject<TextInput | null>;
}

export interface UseUncontrolledItemFormOptions {
  initialData?: Partial<InventoryItem> | null;
  onFormValidChange?: (isValid: boolean) => void;
  mode?: 'create' | 'edit';
}

interface FormInitialValues {
  name: string;
  detailedLocation: string;
  warningThreshold: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  location: string;
  status: string;
  categoryId: string | null;
  // Batch fields
  amount: string;
  unit: string;
  price: string;
  vendor: string;
  note: string;
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
 * In 'create' mode, manages both item info and first batch fields.
 * In 'edit' mode, manages only item info fields (batch fields are ignored).
 *
 * @see .cursor/rules/pinyin-input-pattern.mdc
 */
export const useUncontrolledItemForm = (
  options: UseUncontrolledItemFormOptions = {}
) => {
  const { initialData, onFormValidChange, mode = 'create' } = options;

  // Input refs - item info
  const nameInputRef = useRef<TextInput>(null);
  const detailedLocationInputRef = useRef<TextInput>(null);
  const warningThresholdInputRef = useRef<TextInput>(null);

  // Input refs - batch
  const amountInputRef = useRef<TextInput>(null);
  const unitInputRef = useRef<TextInput>(null);
  const priceInputRef = useRef<TextInput>(null);
  const vendorInputRef = useRef<TextInput>(null);
  const noteInputRef = useRef<TextInput>(null);

  // Value refs (for uncontrolled inputs - prevents IME interruption)
  const nameValueRef = useRef('');
  const detailedLocationValueRef = useRef('');
  const warningThresholdValueRef = useRef('0');

  // Batch value refs
  const amountValueRef = useRef('1');
  const unitValueRef = useRef('');
  const priceValueRef = useRef('0');
  const vendorValueRef = useRef('');
  const noteValueRef = useRef('');

  // Initial values ref (for dirty state tracking)
  const initialValuesRef = useRef<FormInitialValues>({
    name: '',
    detailedLocation: '',
    warningThreshold: '0',
    icon: DEFAULT_ICON,
    iconColor: DEFAULT_COLOR,
    location: DEFAULT_LOCATION,
    status: DEFAULT_STATUS,
    categoryId: null,
    amount: '1',
    unit: '',
    price: '0',
    vendor: '',
    note: '',
    purchaseDate: null,
    expiryDate: null,
  });

  // Default value states (for defaultValue prop on uncontrolled inputs)
  const [defaultName, setDefaultName] = useState('');
  const [defaultDetailedLocation, setDefaultDetailedLocation] = useState('');
  const [defaultWarningThreshold, setDefaultWarningThreshold] = useState('0');

  // Batch default values
  const [defaultAmount, setDefaultAmount] = useState('1');
  const [defaultUnit, setDefaultUnit] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('0');
  const [defaultVendor, setDefaultVendor] = useState('');
  const [defaultNote, setDefaultNote] = useState('');

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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
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

  // Helper: extract first batch data from initialData
  const getFirstBatch = (data: Partial<InventoryItem>): Partial<ItemBatch> => {
    const batches = data.batches || [];
    return batches.length > 0 ? batches[0] : {};
  };

  // Initialize form from initialData
  useEffect(() => {
    if (initialData) {
      const name = initialData.name ?? '';
      const detailedLocation = initialData.detailedLocation ?? '';
      const warningThreshold =
        initialData.warningThreshold !== undefined &&
          initialData.warningThreshold !== null
          ? initialData.warningThreshold.toString()
          : '0';

      // Extract first batch for batch fields
      const firstBatch = getFirstBatch(initialData);
      const amount =
        firstBatch.amount !== undefined && firstBatch.amount !== null
          ? firstBatch.amount.toString()
          : '1';
      const unit = firstBatch.unit ?? '';
      const price = firstBatch.price?.toString() ?? '0';
      const vendor = firstBatch.vendor ?? '';
      const note = firstBatch.note ?? '';

      // Store initial values for dirty state tracking
      initialValuesRef.current = {
        name,
        detailedLocation,
        warningThreshold,
        icon: initialData.icon ?? DEFAULT_ICON,
        iconColor: initialData.iconColor ?? DEFAULT_COLOR,
        location: initialData.location ?? DEFAULT_LOCATION,
        status: initialData.status ?? DEFAULT_STATUS,
        categoryId: initialData.categoryId ?? null,
        amount,
        unit,
        price,
        vendor,
        note,
        purchaseDate: firstBatch.purchaseDate
          ? new Date(firstBatch.purchaseDate)
          : null,
        expiryDate: firstBatch.expiryDate
          ? new Date(firstBatch.expiryDate)
          : null,
      };

      // Update refs for form submission
      nameValueRef.current = name;
      detailedLocationValueRef.current = detailedLocation;
      warningThresholdValueRef.current = warningThreshold;
      amountValueRef.current = amount;
      unitValueRef.current = unit;
      priceValueRef.current = price;
      vendorValueRef.current = vendor;
      noteValueRef.current = note;

      // Update state for defaultValue props
      setDefaultName(name);
      setDefaultDetailedLocation(detailedLocation);
      setDefaultWarningThreshold(warningThreshold);
      setDefaultAmount(amount);
      setDefaultUnit(unit);
      setDefaultPrice(price);
      setDefaultVendor(vendor);
      setDefaultNote(note);

      if (initialData.icon) setSelectedIcon(initialData.icon);
      if (initialData.iconColor) setSelectedColor(initialData.iconColor);
      if (initialData.location) setSelectedLocation(initialData.location);
      if (initialData.status) setSelectedStatus(initialData.status);
      if (initialData.categoryId !== undefined) setSelectedCategoryId(initialData.categoryId);
      if (firstBatch.purchaseDate)
        setPurchaseDate(new Date(firstBatch.purchaseDate));
      if (firstBatch.expiryDate)
        setExpiryDate(new Date(firstBatch.expiryDate));

      setFormKey((prev) => prev + 1);

      // Notify parent of validity state after initialization
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
      detailedLocation: '',
      warningThreshold: '0',
      icon: DEFAULT_ICON,
      iconColor: DEFAULT_COLOR,
      location: DEFAULT_LOCATION,
      status: DEFAULT_STATUS,
      categoryId: null,
      amount: '1',
      unit: '',
      price: '0',
      vendor: '',
      note: '',
      purchaseDate: null,
      expiryDate: null,
    };

    // Reset refs
    nameValueRef.current = '';
    detailedLocationValueRef.current = '';
    warningThresholdValueRef.current = '0';
    amountValueRef.current = '1';
    unitValueRef.current = '';
    priceValueRef.current = '0';
    vendorValueRef.current = '';
    noteValueRef.current = '';

    // Reset default values
    setDefaultName('');
    setDefaultDetailedLocation('');
    setDefaultWarningThreshold('0');
    setDefaultAmount('1');
    setDefaultUnit('');
    setDefaultPrice('0');
    setDefaultVendor('');
    setDefaultNote('');

    // Reset other state
    setSelectedIcon(DEFAULT_ICON);
    setSelectedColor(DEFAULT_COLOR);
    setSelectedLocation(DEFAULT_LOCATION);
    setSelectedStatus(DEFAULT_STATUS);
    setSelectedCategoryId(null);
    setPurchaseDate(null);
    setExpiryDate(null);
    setFormKey((prev) => prev + 1);
  }, []);

  // Get current form values for submission
  const getFormValues = useCallback((): ItemFormValues => {
    return {
      name: nameValueRef.current,
      detailedLocation: detailedLocationValueRef.current,
      warningThreshold: warningThresholdValueRef.current,
      icon: selectedIcon,
      iconColor: selectedColor,
      location: selectedLocation,
      status: selectedStatus,
      categoryId: selectedCategoryId,
      // Batch fields
      amount: amountValueRef.current,
      unit: unitValueRef.current,
      price: priceValueRef.current,
      vendor: vendorValueRef.current,
      note: noteValueRef.current,
      purchaseDate,
      expiryDate,
    };
  }, [
    selectedIcon,
    selectedColor,
    selectedLocation,
    selectedStatus,
    selectedCategoryId,
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

  const handleDetailedLocationChangeText = useCallback((text: string) => {
    detailedLocationValueRef.current = text;
  }, []);

  const handleWarningThresholdChangeText = useCallback((text: string) => {
    warningThresholdValueRef.current = text;
  }, []);

  // Batch change handlers
  const handleAmountChangeText = useCallback((text: string) => {
    amountValueRef.current = text;
  }, []);

  const handleUnitChangeText = useCallback((text: string) => {
    unitValueRef.current = text;
  }, []);

  const handlePriceChangeText = useCallback((text: string) => {
    priceValueRef.current = text;
  }, []);

  const handleVendorChangeText = useCallback((text: string) => {
    vendorValueRef.current = text;
  }, []);

  const handleNoteChangeText = useCallback((text: string) => {
    noteValueRef.current = text;
  }, []);

  // Blur handlers (no-op for uncontrolled pattern, but kept for consistency)
  const handleNameBlur = useCallback(() => undefined, []);
  const handleDetailedLocationBlur = useCallback(() => undefined, []);
  const handleWarningThresholdBlur = useCallback(() => undefined, []);
  const handleAmountBlur = useCallback(() => undefined, []);
  const handleUnitBlur = useCallback(() => undefined, []);
  const handlePriceBlur = useCallback(() => undefined, []);
  const handleVendorBlur = useCallback(() => undefined, []);
  const handleNoteBlur = useCallback(() => undefined, []);

  // Direct form population method (bypasses initialData prop/state)
  const populateForm = useCallback(
    (data: Partial<InventoryItem>) => {
      const name = data.name ?? '';
      const detailedLocation = data.detailedLocation ?? '';
      const warningThreshold =
        data.warningThreshold !== undefined && data.warningThreshold !== null
          ? data.warningThreshold.toString()
          : '0';

      const firstBatch = getFirstBatch(data);
      const amount =
        firstBatch.amount !== undefined && firstBatch.amount !== null
          ? firstBatch.amount.toString()
          : '1';
      const unit = firstBatch.unit ?? '';
      const price = firstBatch.price?.toString() ?? '0';
      const vendor = firstBatch.vendor ?? '';
      const note = firstBatch.note ?? '';

      initialValuesRef.current = {
        name,
        detailedLocation,
        warningThreshold,
        icon: data.icon ?? DEFAULT_ICON,
        iconColor: data.iconColor ?? DEFAULT_COLOR,
        location: data.location ?? DEFAULT_LOCATION,
        status: data.status ?? DEFAULT_STATUS,
        categoryId: data.categoryId ?? null,
        amount,
        unit,
        price,
        vendor,
        note,
        purchaseDate: firstBatch.purchaseDate
          ? new Date(firstBatch.purchaseDate)
          : null,
        expiryDate: firstBatch.expiryDate
          ? new Date(firstBatch.expiryDate)
          : null,
      };

      // Update refs for form submission
      nameValueRef.current = name;
      detailedLocationValueRef.current = detailedLocation;
      warningThresholdValueRef.current = warningThreshold;
      amountValueRef.current = amount;
      unitValueRef.current = unit;
      priceValueRef.current = price;
      vendorValueRef.current = vendor;
      noteValueRef.current = note;

      // Update state for defaultValue props
      setDefaultName(name);
      setDefaultDetailedLocation(detailedLocation);
      setDefaultWarningThreshold(warningThreshold);
      setDefaultAmount(amount);
      setDefaultUnit(unit);
      setDefaultPrice(price);
      setDefaultVendor(vendor);
      setDefaultNote(note);

      if (data.icon) setSelectedIcon(data.icon);
      if (data.iconColor) setSelectedColor(data.iconColor);
      if (data.location) setSelectedLocation(data.location);
      if (data.status) setSelectedStatus(data.status);
      if (data.categoryId !== undefined) setSelectedCategoryId(data.categoryId);
      if (firstBatch.purchaseDate)
        setPurchaseDate(new Date(firstBatch.purchaseDate));
      if (firstBatch.expiryDate) setExpiryDate(new Date(firstBatch.expiryDate));

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

    // Compare dates properly (need to compare time for Date objects)
    const datesEqual = (d1: Date | null, d2: Date | null): boolean => {
      if (d1 === null && d2 === null) return true;
      if (d1 === null || d2 === null) return false;
      return d1.getTime() === d2.getTime();
    };

    // Always check item info fields
    if (
      nameValueRef.current !== initial.name ||
      detailedLocationValueRef.current !== initial.detailedLocation ||
      warningThresholdValueRef.current !== initial.warningThreshold ||
      selectedIcon !== initial.icon ||
      selectedColor !== initial.iconColor ||
      selectedLocation !== initial.location ||
      selectedStatus !== initial.status ||
      selectedCategoryId !== initial.categoryId
    ) {
      return true;
    }

    // In create mode, also check batch fields
    if (mode === 'create') {
      if (
        amountValueRef.current !== initial.amount ||
        unitValueRef.current !== initial.unit ||
        priceValueRef.current !== initial.price ||
        vendorValueRef.current !== initial.vendor ||
        noteValueRef.current !== initial.note ||
        !datesEqual(purchaseDate, initial.purchaseDate) ||
        !datesEqual(expiryDate, initial.expiryDate)
      ) {
        return true;
      }
    }

    return false;
  }, [selectedIcon, selectedColor, selectedLocation, selectedStatus, selectedCategoryId, purchaseDate, expiryDate, mode]);

  return {
    // Refs
    refs: {
      nameInput: nameInputRef,
      detailedLocationInput: detailedLocationInputRef,
      warningThresholdInput: warningThresholdInputRef,
      // Batch refs
      amountInput: amountInputRef,
      unitInput: unitInputRef,
      priceInput: priceInputRef,
      vendorInput: vendorInputRef,
      noteInput: noteInputRef,
    },
    // Default values for uncontrolled inputs
    defaultValues: {
      name: defaultName,
      detailedLocation: defaultDetailedLocation,
      warningThreshold: defaultWarningThreshold,
      // Batch default values
      amount: defaultAmount,
      unit: defaultUnit,
      price: defaultPrice,
      vendor: defaultVendor,
      note: defaultNote,
    },
    // State values
    selectedIcon,
    selectedColor,
    selectedLocation,
    selectedStatus,
    selectedCategoryId,
    purchaseDate,
    expiryDate,
    formKey,
    // Setters
    setSelectedIcon,
    setSelectedColor,
    setSelectedLocation,
    setSelectedStatus,
    setSelectedCategoryId,
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
    handleDetailedLocationChangeText,
    handleWarningThresholdChangeText,
    handleNameBlur,
    handleDetailedLocationBlur,
    handleWarningThresholdBlur,
    // Batch input handlers
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
  };
};
