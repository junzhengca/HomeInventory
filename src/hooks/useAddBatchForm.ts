import { useRef, useCallback, useState, useEffect } from 'react';
import { TextInput } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AddBatchFormValues {
    price: string;
    amount: string;
    unit: string;
    vendor: string;
    expiryDate: Date | null;
    note: string;
}

export interface UseAddBatchFormOptions {
    onFormValidChange?: (isValid: boolean) => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_PRICE = '';
const DEFAULT_AMOUNT = '1';
const DEFAULT_UNIT = 'pcs';
const DEFAULT_VENDOR = '';
const DEFAULT_NOTE = '';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useAddBatchForm = (options: UseAddBatchFormOptions = {}) => {
    const { onFormValidChange } = options;

    // --- Refs (uncontrolled inputs) ----------------------------------------

    const priceInputRef = useRef<TextInput>(null);
    const priceValueRef = useRef(DEFAULT_PRICE);

    const amountInputRef = useRef<TextInput>(null);
    const amountValueRef = useRef(DEFAULT_AMOUNT);

    const unitInputRef = useRef<TextInput>(null);
    const unitValueRef = useRef(DEFAULT_UNIT);

    const vendorInputRef = useRef<TextInput>(null);
    const vendorValueRef = useRef(DEFAULT_VENDOR);

    const noteInputRef = useRef<TextInput>(null);
    const noteValueRef = useRef(DEFAULT_NOTE);

    // --- State -------------------------------------------------------------

    const [defaultPrice, setDefaultPrice] = useState(DEFAULT_PRICE);
    const [defaultAmount, setDefaultAmount] = useState(DEFAULT_AMOUNT);
    const [defaultUnit, setDefaultUnit] = useState(DEFAULT_UNIT);
    const [defaultVendor, setDefaultVendor] = useState(DEFAULT_VENDOR);
    const [defaultNote, setDefaultNote] = useState(DEFAULT_NOTE);

    const [expiryDate, setExpiryDate] = useState<Date | null>(null);
    const [formKey, setFormKey] = useState(0);

    // --- Validation --------------------------------------------------------

    const getIsFormValid = useCallback(() => {
        // Basic validation: amount must be > 0
        const amount = parseInt(amountValueRef.current || '0', 10);
        return amount > 0;
    }, []);

    // Notify parent when form validity changes
    useEffect(() => {
        onFormValidChange?.(getIsFormValid());
    }, [getIsFormValid, onFormValidChange]);

    // --- Input handlers ----------------------------------------------------

    const handlePriceChange = useCallback((text: string) => {
        priceValueRef.current = text;
    }, []);
    const handlePriceBlur = useCallback(() => undefined, []);

    const handleAmountChange = useCallback((text: string) => {
        amountValueRef.current = text;
        onFormValidChange?.(getIsFormValid());
    }, [getIsFormValid, onFormValidChange]);
    const handleAmountBlur = useCallback(() => undefined, []);

    const handleUnitChange = useCallback((text: string) => {
        unitValueRef.current = text;
    }, []);
    const handleUnitBlur = useCallback(() => undefined, []);

    const handleVendorChange = useCallback((text: string) => {
        vendorValueRef.current = text;
    }, []);
    const handleVendorBlur = useCallback(() => undefined, []);

    const handleNoteChange = useCallback((text: string) => {
        noteValueRef.current = text;
    }, []);
    const handleNoteBlur = useCallback(() => undefined, []);

    // --- Form helpers ------------------------------------------------------

    const getFormValues = useCallback(
        (): AddBatchFormValues => ({
            price: priceValueRef.current,
            amount: amountValueRef.current,
            unit: unitValueRef.current,
            vendor: vendorValueRef.current,
            expiryDate,
            note: noteValueRef.current,
        }),
        [expiryDate]
    );

    const isFormDirty = useCallback((): boolean => {
        return (
            priceValueRef.current !== DEFAULT_PRICE ||
            amountValueRef.current !== DEFAULT_AMOUNT ||
            unitValueRef.current !== DEFAULT_UNIT ||
            vendorValueRef.current !== DEFAULT_VENDOR ||
            expiryDate !== null ||
            noteValueRef.current !== DEFAULT_NOTE
        );
    }, [expiryDate]);

    const resetForm = useCallback(() => {
        priceValueRef.current = DEFAULT_PRICE;
        amountValueRef.current = DEFAULT_AMOUNT;
        unitValueRef.current = DEFAULT_UNIT;
        vendorValueRef.current = DEFAULT_VENDOR;
        noteValueRef.current = DEFAULT_NOTE;

        setDefaultPrice(DEFAULT_PRICE);
        setDefaultAmount(DEFAULT_AMOUNT);
        setDefaultUnit(DEFAULT_UNIT);
        setDefaultVendor(DEFAULT_VENDOR);
        setDefaultNote(DEFAULT_NOTE);
        setExpiryDate(null);
        setFormKey((prev) => prev + 1);
    }, []);

    // --- Public API --------------------------------------------------------

    return {
        // Refs
        priceInputRef,
        amountInputRef,
        unitInputRef,
        vendorInputRef,
        noteInputRef,
        // Default values
        defaultPrice,
        defaultAmount,
        defaultUnit,
        defaultVendor,
        defaultNote,
        // State
        expiryDate,
        formKey,
        // Setters
        setExpiryDate,
        // Methods
        getIsFormValid,
        getFormValues,
        isFormDirty,
        resetForm,
        // Handlers
        handlePriceChange,
        handlePriceBlur,
        handleAmountChange,
        handleAmountBlur,
        handleUnitChange,
        handleUnitBlur,
        handleVendorChange,
        handleVendorBlur,
        handleNoteChange,
        handleNoteBlur,
    };
};
