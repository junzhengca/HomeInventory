import React from 'react';
import { TextInput } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '../../theme/ThemeProvider';
import type { StyledProps } from '../../utils/styledComponents';
import { FormSection, UncontrolledInput } from '../atoms';
import { LocationFormSelector, CategoryFormSelector } from '../molecules';

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
    // Input refs
    nameInputRef: React.RefObject<TextInput | null>;
    // Default values for uncontrolled inputs
    defaultName: string;
    // Handlers
    onLocationSelect: (location: string) => void;
    onCategorySelect: (categoryId: string) => void;
    onNameChangeText: (text: string) => void;
    onNameBlur: () => void;
    // Translations
    translations: {
        fields: {
            name: string;
            location: string;
            category: string;
        };
        placeholders: {
            name: string;
        };
    };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Simplified form fields for the **create item** bottom sheet.
 *
 * Three rows only:
 *  1. Name (text input)
 *  2. Location (selector)
 *  3. Category (selector)
 *
 * This component is intentionally decoupled from `ItemFormFields` so the
 * create-item form can evolve independently.
 */
export const CreateItemFormFields: React.FC<CreateItemFormFieldsProps> = ({
    selectedLocation,
    selectedCategoryId,
    formKey,
    nameInputRef,
    defaultName,
    onLocationSelect,
    onCategorySelect,
    onNameChangeText,
    onNameBlur,
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
        </FormContainer>
    );
};
