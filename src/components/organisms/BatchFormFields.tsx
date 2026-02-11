import React from 'react';
import { TextInput } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '../../theme/ThemeProvider';
import type { StyledProps } from '../../utils/styledComponents';
import {
    FormSection,
    UncontrolledInput,
    NumberInput,
} from '../atoms';
import {
    DatePicker,
} from '../molecules';

const FormContainer = styled.View`
  flex-direction: column;
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const Row = styled.View`
  flex-direction: row;
  gap: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const HalfContainer = styled.View`
  flex: 1;
`;

const HalfInput = styled(UncontrolledInput)`
  flex: 1;
`;

export interface BatchFormFieldsProps {
    formKey: number;
    purchaseDate: Date | null;
    expiryDate: Date | null;
    // Input refs
    amountInputRef: React.RefObject<TextInput | null>;
    unitInputRef: React.RefObject<TextInput | null>;
    priceInputRef: React.RefObject<TextInput | null>;
    vendorInputRef: React.RefObject<TextInput | null>;
    noteInputRef: React.RefObject<TextInput | null>;
    // Default values for uncontrolled inputs
    defaultAmount: string;
    defaultUnit: string;
    defaultPrice: string;
    defaultVendor: string;
    defaultNote: string;
    // Change handlers
    onPurchaseDateChange: (date: Date | null) => void;
    onExpiryDateChange: (date: Date | null) => void;
    // Input handlers
    onAmountChangeText: (text: string) => void;
    onUnitChangeText: (text: string) => void;
    onPriceChangeText: (text: string) => void;
    onVendorChangeText: (text: string) => void;
    onNoteChangeText: (text: string) => void;
    // Blur handlers
    onAmountBlur: () => void;
    onUnitBlur: () => void;
    onPriceBlur: () => void;
    onVendorBlur: () => void;
    onNoteBlur: () => void;
    // Translation keys
    translations: {
        fields: {
            amount: string;
            unit: string;
            price: string;
            vendor: string;
            note: string;
            purchaseDate: string;
            expiryDate: string;
        };
        placeholders: {
            amount: string;
            unit: string;
            price: string;
            vendor: string;
            note: string;
        };
    };
}

/**
 * Form fields for batch-level information (amount, unit, price, vendor, note, dates).
 * Shown in the create item form to capture "first batch" data.
 * Uses uncontrolled inputs with refs to prevent IME composition interruption.
 */
export const BatchFormFields: React.FC<BatchFormFieldsProps> = ({
    formKey,
    purchaseDate,
    expiryDate,
    amountInputRef,
    unitInputRef,
    priceInputRef,
    vendorInputRef,
    noteInputRef,
    defaultAmount,
    defaultUnit,
    defaultPrice,
    defaultVendor,
    defaultNote,
    onPurchaseDateChange,
    onExpiryDateChange,
    onAmountChangeText,
    onUnitChangeText,
    onPriceChangeText,
    onVendorChangeText,
    onNoteChangeText,
    onAmountBlur,
    onUnitBlur,
    onPriceBlur,
    onVendorBlur,
    onNoteBlur,
    translations,
}) => {
    const theme = useTheme();

    return (
        <FormContainer key={formKey}>
            <Row>
                <HalfContainer>
                    <FormSection label={translations.fields.amount}>
                        <NumberInput
                            ref={amountInputRef}
                            defaultValue={defaultAmount}
                            onChangeText={onAmountChangeText}
                            onBlur={onAmountBlur}
                            placeholder={translations.placeholders.amount}
                            placeholderTextColor={theme.colors.textLight}
                            keyboardType="numeric"
                            min={0}
                        />
                    </FormSection>
                </HalfContainer>
                <HalfContainer>
                    <FormSection label={translations.fields.unit}>
                        <HalfInput
                            ref={unitInputRef}
                            defaultValue={defaultUnit}
                            onChangeText={onUnitChangeText}
                            onBlur={onUnitBlur}
                            placeholder={translations.placeholders.unit}
                            placeholderTextColor={theme.colors.textLight}
                        />
                    </FormSection>
                </HalfContainer>
            </Row>

            <Row>
                <HalfContainer>
                    <FormSection label={translations.fields.price}>
                        <HalfInput
                            ref={priceInputRef}
                            defaultValue={defaultPrice}
                            onChangeText={onPriceChangeText}
                            onBlur={onPriceBlur}
                            placeholder={translations.placeholders.price}
                            placeholderTextColor={theme.colors.textLight}
                            keyboardType="numeric"
                        />
                    </FormSection>
                </HalfContainer>
                <HalfContainer>
                    <FormSection label={translations.fields.vendor}>
                        <HalfInput
                            ref={vendorInputRef}
                            defaultValue={defaultVendor}
                            onChangeText={onVendorChangeText}
                            onBlur={onVendorBlur}
                            placeholder={translations.placeholders.vendor}
                            placeholderTextColor={theme.colors.textLight}
                        />
                    </FormSection>
                </HalfContainer>
            </Row>

            <Row>
                <HalfContainer>
                    <FormSection
                        label={translations.fields.purchaseDate}
                        style={{ marginBottom: theme.spacing.sm }}
                    >
                        <DatePicker
                            value={purchaseDate}
                            onChange={onPurchaseDateChange}
                            maximumDate={new Date()}
                        />
                    </FormSection>
                </HalfContainer>
                <HalfContainer>
                    <FormSection
                        label={translations.fields.expiryDate}
                        style={{ marginBottom: theme.spacing.sm }}
                    >
                        <DatePicker
                            value={expiryDate}
                            onChange={onExpiryDateChange}
                            minimumDate={new Date()}
                        />
                    </FormSection>
                </HalfContainer>
            </Row>

            <FormSection label={translations.fields.note}>
                <UncontrolledInput
                    ref={noteInputRef}
                    defaultValue={defaultNote}
                    onChangeText={onNoteChangeText}
                    onBlur={onNoteBlur}
                    placeholder={translations.placeholders.note}
                    placeholderTextColor={theme.colors.textLight}
                />
            </FormSection>
        </FormContainer>
    );
};
