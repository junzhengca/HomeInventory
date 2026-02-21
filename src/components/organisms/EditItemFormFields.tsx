import React from 'react';
import { TextInput } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '../../theme/ThemeProvider';
import type { StyledProps } from '../../utils/styledComponents';
import { FormSection, UncontrolledInput } from '../atoms';
import { LocationSelector, CategoryFormSelector, StatusFormSelector, CollapsibleSection, IconColorPicker } from '../molecules';
import { Ionicons } from '@expo/vector-icons';

// ---------------------------------------------------------------------------
// Styled helpers
// ---------------------------------------------------------------------------

const FormContainer = styled.View`
  flex-direction: column;
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const NameRow = styled.View`
  flex-direction: row;
  gap: ${({ theme }: StyledProps) => theme.spacing.md}px;
  align-items: center;
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EditItemFormFieldsProps {
    // Form state
    selectedLocation: string;
    selectedCategoryId: string | null;
    selectedStatusId: string;
    selectedIcon: string;
    selectedColor: string;
    formKey: number;
    // Input refs
    nameInputRef: React.RefObject<TextInput | null>;
    detailedLocationInputRef: React.RefObject<TextInput | null>;
    warningThresholdInputRef: React.RefObject<TextInput | null>;
    // Default values for uncontrolled inputs
    defaultName: string;
    defaultDetailedLocation: string;
    defaultWarningThreshold: string;
    // Handlers — selectors
    onLocationSelect: (location: string) => void;
    onCategorySelect: (categoryId: string) => void;
    onStatusSelect: (statusId: string) => void;
    onIconSelect: (icon: string) => void;
    onColorSelect: (color: string) => void;
    // Handlers — text inputs
    onNameChangeText: (text: string) => void;
    onNameBlur: () => void;
    onDetailedLocationChange: (text: string) => void;
    onDetailedLocationBlur: () => void;
    onWarningThresholdChange: (text: string) => void;
    onWarningThresholdBlur: () => void;
    onOpeningNestedModal?: (isOpening: boolean) => void;
    // Translations
    translations: {
        fields: {
            name: string;
            location: string;
            category: string;
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
 * Simplified form fields for the **edit item** bottom sheet.
 *
 * Sections:
 *  1. Name (text input) + Icon/Color Picker
 *  2. Location (selector)
 *  3. Category (selector)
 *  4. Advanced (Collapsible):
 *      - Detailed Location
 *      - Status
 *      - Warning Threshold
 *
 * Excludes batch details (price, amount, unit, vendor, expiry).
 */
export const EditItemFormFields: React.FC<EditItemFormFieldsProps> = ({
    selectedLocation,
    selectedCategoryId,
    selectedStatusId,
    selectedIcon,
    selectedColor,
    formKey,
    nameInputRef,
    detailedLocationInputRef,
    warningThresholdInputRef,
    defaultName,
    defaultDetailedLocation,
    defaultWarningThreshold,
    onLocationSelect,
    onCategorySelect,
    onStatusSelect,
    onIconSelect,
    onColorSelect,
    onNameChangeText,
    onNameBlur,
    onDetailedLocationChange,
    onDetailedLocationBlur,
    onWarningThresholdChange,
    onWarningThresholdBlur,
    onOpeningNestedModal,
    translations,
}) => {
    const theme = useTheme();

    return (
        <FormContainer key={formKey}>
            {/* Row 1 — Name & Icon */}
            <FormSection label={translations.fields.name}>
                <NameRow>
                    <IconColorPicker
                        icon={selectedIcon as keyof typeof Ionicons.glyphMap}
                        color={selectedColor}
                        onIconSelect={onIconSelect}
                        onColorSelect={onColorSelect}
                        onOpeningNestedModal={onOpeningNestedModal}
                    />
                    <UncontrolledInput
                        ref={nameInputRef}
                        defaultValue={defaultName}
                        onChangeText={onNameChangeText}
                        onBlur={onNameBlur}
                        placeholder={translations.placeholders.name}
                        placeholderTextColor={theme.colors.textLight}
                        style={{ flex: 1 }}
                    />
                </NameRow>
            </FormSection>

            {/* Row 2 — Location */}
            <FormSection label={translations.fields.location}>
                <LocationSelector
                    selectedLocationId={selectedLocation}
                    onSelect={(id: string | null) => id && onLocationSelect(id)}
                    showAllOption={false}
                    edgeToEdge={true}
                    onOpeningNestedModal={onOpeningNestedModal}
                />
            </FormSection>

            {/* Row 3 — Category (reduced bottom margin so spacing above More Options matches below) */}
            <FormSection
                label={translations.fields.category}
                style={{ marginBottom: theme.spacing.sm }}
            >
                <CategoryFormSelector
                    selectedCategoryId={selectedCategoryId}
                    onSelect={onCategorySelect}
                    onOpeningNestedModal={onOpeningNestedModal}
                />
            </FormSection>

            {/* Row 4 — Advanced Section */}
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
