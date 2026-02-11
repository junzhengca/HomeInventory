import React from 'react';
import { TextInput } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '../../theme/ThemeProvider';
import type { StyledProps } from '../../utils/styledComponents';
import { FormSection, UncontrolledInput } from '../atoms';
import { LocationFormSelector, CategoryFormSelector, BatchDetailsFormSection, DatePicker, StatusFormSelector, CollapsibleSection } from '../molecules';

// ---------------------------------------------------------------------------
// Styled helpers
// ---------------------------------------------------------------------------

const FormContainer = styled.View`
  flex-direction: column;
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateItemFormFieldsProps {
    // Form state
    selectedLocation: string;
    selectedCategoryId: string | null;
    formKey: number;
    // Input refs — name
    nameInputRef: React.RefObject<TextInput | null>;
    // Input refs — batch
    priceInputRef: React.RefObject<TextInput | null>;
    amountInputRef: React.RefObject<TextInput | null>;
    unitInputRef: React.RefObject<TextInput | null>;
    vendorInputRef: React.RefObject<TextInput | null>;
    // Default values for uncontrolled inputs
    defaultName: string;
    defaultPrice: string;
    defaultAmount: string;
    defaultUnit: string;
    defaultVendor: string;
    // Handlers — selectors
    onLocationSelect: (location: string) => void;
    onCategorySelect: (categoryId: string) => void;
    // Handlers — name
    onNameChangeText: (text: string) => void;
    onNameBlur: () => void;
    // Handlers — batch
    onPriceChange: (text: string) => void;
    onPriceBlur: () => void;
    onAmountChange: (text: string) => void;
    onAmountBlur: () => void;
    onUnitChange: (text: string) => void;
    onUnitBlur: () => void;
    onVendorChange: (text: string) => void;
    onVendorBlur: () => void;
    // Expiry date
    expiryDate: Date | null;
    onExpiryDateChange: (date: Date | null) => void;
    // Advanced fields
    detailedLocationInputRef: React.RefObject<TextInput | null>;
    warningThresholdInputRef: React.RefObject<TextInput | null>;
    defaultDetailedLocation: string;
    defaultWarningThreshold: string;
    selectedStatusId: string;
    onDetailedLocationChange: (text: string) => void;
    onDetailedLocationBlur: () => void;
    onWarningThresholdChange: (text: string) => void;
    onWarningThresholdBlur: () => void;
    onStatusSelect: (statusId: string) => void;
    // Translations
    translations: {
        fields: {
            name: string;
            location: string;
            category: string;
            expiryDate: string;
            advanced: string;
            detailedLocation: string;
            status: string;
            warningThreshold: string;
        };
        placeholders: {
            name: string;
            detailedLocation: string;
            warningThreshold: string;
        };
    };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Simplified form fields for the **create item** bottom sheet.
 *
 * Sections:
 *  1. Name (text input)
 *  2. Location (selector)
 *  3. Category (selector)
 *  4. Batch details (price, amount, unit, vendor)
 *
 * This component is intentionally decoupled from `ItemFormFields` so the
 * create-item form can evolve independently.
 */
export const CreateItemFormFields: React.FC<CreateItemFormFieldsProps> = ({
    selectedLocation,
    selectedCategoryId,
    formKey,
    nameInputRef,
    priceInputRef,
    amountInputRef,
    unitInputRef,
    vendorInputRef,
    defaultName,
    defaultPrice,
    defaultAmount,
    defaultUnit,
    defaultVendor,
    onLocationSelect,
    onCategorySelect,
    onNameChangeText,
    onNameBlur,
    onPriceChange,
    onPriceBlur,
    onAmountChange,
    onAmountBlur,
    onUnitChange,
    onUnitBlur,
    onVendorChange,
    onVendorBlur,
    expiryDate,
    onExpiryDateChange,
    detailedLocationInputRef,
    warningThresholdInputRef,
    defaultDetailedLocation,
    defaultWarningThreshold,
    selectedStatusId,
    onDetailedLocationChange,
    onDetailedLocationBlur,
    onWarningThresholdChange,
    onWarningThresholdBlur,
    onStatusSelect,
    translations,
}) => {
    const theme = useTheme();

    return (
        <FormContainer key={formKey}>
            {/* Row 1 — Name */}
            <FormSection label={translations.fields.name}>
                <UncontrolledInput
                    ref={nameInputRef}
                    defaultValue={defaultName}
                    onChangeText={onNameChangeText}
                    onBlur={onNameBlur}
                    placeholder={translations.placeholders.name}
                    placeholderTextColor={theme.colors.textLight}
                />
            </FormSection>

            {/* Row 2 — Location */}
            <FormSection label={translations.fields.location}>
                <LocationFormSelector
                    selectedLocationId={selectedLocation}
                    onSelect={onLocationSelect}
                />
            </FormSection>

            {/* Row 3 — Category */}
            <FormSection label={translations.fields.category}>
                <CategoryFormSelector
                    selectedCategoryId={selectedCategoryId}
                    onSelect={onCategorySelect}
                />
            </FormSection>

            {/* Row 4 — Batch Details (price, amount, unit, vendor) */}
            <BatchDetailsFormSection
                defaultPrice={defaultPrice}
                defaultAmount={defaultAmount}
                defaultUnit={defaultUnit}
                defaultVendor={defaultVendor}
                priceInputRef={priceInputRef}
                amountInputRef={amountInputRef}
                unitInputRef={unitInputRef}
                vendorInputRef={vendorInputRef}
                onPriceChange={onPriceChange}
                onAmountChange={onAmountChange}
                onUnitChange={onUnitChange}
                onVendorChange={onVendorChange}
                onPriceBlur={onPriceBlur}
                onAmountBlur={onAmountBlur}
                onUnitBlur={onUnitBlur}
                onVendorBlur={onVendorBlur}
            />

            {/* Row 5 — Expiry Date */}
            <FormSection label={translations.fields.expiryDate}>
                <DatePicker
                    value={expiryDate}
                    onChange={onExpiryDateChange}
                    minimumDate={new Date()}
                />
            </FormSection>

            {/* Row 6 — Advanced Section */}
            <CollapsibleSection title={translations.fields.advanced}>
                <FormContainer>
                    <FormSection label={translations.fields.detailedLocation}>
                        <UncontrolledInput
                            ref={detailedLocationInputRef}
                            defaultValue={defaultDetailedLocation}
                            onChangeText={onDetailedLocationChange}
                            onBlur={onDetailedLocationBlur}
                            placeholder={translations.placeholders.detailedLocation}
                            placeholderTextColor={theme.colors.textLight}
                            multiline
                        />
                    </FormSection>

                    <FormSection label={translations.fields.status}>
                        <StatusFormSelector
                            selectedStatusId={selectedStatusId}
                            onSelect={onStatusSelect}
                        />
                    </FormSection>

                    <FormSection label={translations.fields.warningThreshold}>
                        <UncontrolledInput
                            ref={warningThresholdInputRef}
                            defaultValue={defaultWarningThreshold}
                            onChangeText={onWarningThresholdChange}
                            onBlur={onWarningThresholdBlur}
                            placeholder={translations.placeholders.warningThreshold}
                            placeholderTextColor={theme.colors.textLight}
                            keyboardType="numeric"
                        />
                    </FormSection>
                </FormContainer>
            </CollapsibleSection>
        </FormContainer>
    );
};
