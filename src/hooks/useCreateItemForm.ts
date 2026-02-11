import { useRef, useCallback, useEffect, useState } from 'react';
import { TextInput } from 'react-native';
import { locations } from '../data/locations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateItemFormValues {
    name: string;
    location: string;
    categoryId: string | null;
}

export interface UseCreateItemFormOptions {
    initialLocation?: string;
    initialCategoryId?: string | null;
    onFormValidChange?: (isValid: boolean) => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_LOCATION = locations.length > 0 ? locations[0].id : '';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Dedicated form hook for the **create item** bottom sheet.
 *
 * Manages only three fields:
 *  1. name  – uncontrolled text input (ref-based, IME-safe)
 *  2. location – selector state
 *  3. categoryId – selector state
 *
 * Intentionally separated from `useUncontrolledItemForm` so the create-item
 * form can evolve independently without affecting the edit-item form.
 */
export const useCreateItemForm = (options: UseCreateItemFormOptions = {}) => {
    const {
        initialLocation,
        initialCategoryId = null,
        onFormValidChange,
    } = options;

    // --- Refs (uncontrolled input) -----------------------------------------

    const nameInputRef = useRef<TextInput>(null);
    const nameValueRef = useRef('');

    // --- Initial values (for dirty-state tracking) -------------------------

    const initialValuesRef = useRef({
        name: '',
        location: initialLocation ?? DEFAULT_LOCATION,
        categoryId: initialCategoryId,
    });

    // --- State -------------------------------------------------------------

    const [defaultName, setDefaultName] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(
        initialLocation ?? DEFAULT_LOCATION,
    );
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
        initialCategoryId,
    );
    const [formKey, setFormKey] = useState(0);

    // --- Validation --------------------------------------------------------

    const getIsFormValid = useCallback(() => {
        const hasName = nameValueRef.current.trim().length > 0;
        const hasLocation = selectedLocation.length > 0;
        return hasName && hasLocation;
    }, [selectedLocation]);

    // Notify parent when location changes (affects validity)
    useEffect(() => {
        onFormValidChange?.(getIsFormValid());
    }, [selectedLocation, getIsFormValid, onFormValidChange]);

    // Sync initial values when the caller provides a new initial location
    useEffect(() => {
        if (initialLocation !== undefined) {
            initialValuesRef.current.location = initialLocation;
            setSelectedLocation(initialLocation);
        }
    }, [initialLocation]);

    // --- Input handlers ----------------------------------------------------

    const handleNameChangeText = useCallback(
        (text: string) => {
            const wasValid = getIsFormValid();
            nameValueRef.current = text;
            const isValid = getIsFormValid();
            if (wasValid !== isValid) {
                onFormValidChange?.(isValid);
            }
        },
        [getIsFormValid, onFormValidChange],
    );

    const handleNameBlur = useCallback(() => undefined, []);

    // --- Form helpers ------------------------------------------------------

    const getFormValues = useCallback(
        (): CreateItemFormValues => ({
            name: nameValueRef.current,
            location: selectedLocation,
            categoryId: selectedCategoryId,
        }),
        [selectedLocation, selectedCategoryId],
    );

    const isFormDirty = useCallback((): boolean => {
        const initial = initialValuesRef.current;
        return (
            nameValueRef.current !== initial.name ||
            selectedLocation !== initial.location ||
            selectedCategoryId !== initial.categoryId
        );
    }, [selectedLocation, selectedCategoryId]);

    const resetForm = useCallback(() => {
        initialValuesRef.current = {
            name: '',
            location: initialLocation ?? DEFAULT_LOCATION,
            categoryId: initialCategoryId,
        };

        nameValueRef.current = '';
        setDefaultName('');
        setSelectedLocation(initialLocation ?? DEFAULT_LOCATION);
        setSelectedCategoryId(initialCategoryId);
        setFormKey((prev) => prev + 1);
    }, [initialLocation, initialCategoryId]);

    // --- Public API --------------------------------------------------------

    return {
        // Refs
        nameInputRef,
        // Default values (for uncontrolled inputs)
        defaultName,
        // State
        selectedLocation,
        selectedCategoryId,
        formKey,
        // Setters
        setSelectedLocation,
        setSelectedCategoryId,
        // Methods
        getIsFormValid,
        getFormValues,
        isFormDirty,
        resetForm,
        // Input handlers
        handleNameChangeText,
        handleNameBlur,
    };
};
