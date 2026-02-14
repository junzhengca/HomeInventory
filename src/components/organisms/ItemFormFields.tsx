import React from 'react';
import { Ionicons } from '@expo/vector-icons';
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
  LocationSelector,
  CategoryFormSelector,
  StatusFormSelector,
  IconColorPicker,
} from '../molecules';

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

export interface ItemFormFieldsProps {
  // Form values
  selectedIcon: string;
  selectedColor: string;
  selectedLocation: string;
  selectedStatus: string;
  selectedCategoryId: string | null;
  formKey: number;
  // Input refs
  nameInputRef: React.RefObject<TextInput | null>;
  detailedLocationInputRef: React.RefObject<TextInput | null>;
  warningThresholdInputRef: React.RefObject<TextInput | null>;
  // Default values for uncontrolled inputs
  defaultName: string;
  defaultDetailedLocation: string;
  defaultWarningThreshold: string;
  // Change handlers
  onIconSelect: (icon: keyof typeof Ionicons.glyphMap) => void;
  onColorSelect: (color: string) => void;
  onLocationSelect: (location: string | null) => void;
  onStatusSelect: (status: string) => void;
  onCategorySelect: (categoryId: string) => void;
  onOpeningNestedModal?: (isOpening: boolean) => void;
  // Input handlers
  onNameChangeText: (text: string) => void;
  onDetailedLocationChangeText: (text: string) => void;
  onWarningThresholdChangeText: (text: string) => void;
  // Blur handlers
  onNameBlur: () => void;
  onDetailedLocationBlur: () => void;
  onWarningThresholdBlur: () => void;
  // Translation keys
  translations: {
    fields: {
      name: string;
      warningThreshold: string;
      location: string;
      status: string;
      detailedLocation: string;
      category: string;
    };
    placeholders: {
      name: string;
      detailedLocation: string;
      warningThreshold: string;
    };
  };
}

/**
 * Form fields for item-level information (name, icon, location, category, status, etc.).
 * Batch-level fields (amount, price, dates, etc.) are handled by BatchFormFields.
 * Uses uncontrolled inputs with refs to prevent IME composition interruption.
 */
export const ItemFormFields: React.FC<ItemFormFieldsProps> = ({
  selectedIcon,
  selectedColor,
  selectedLocation,
  selectedStatus,
  selectedCategoryId,
  formKey,
  nameInputRef,
  detailedLocationInputRef,
  warningThresholdInputRef,
  defaultName,
  defaultDetailedLocation,
  defaultWarningThreshold,
  onIconSelect,
  onColorSelect,
  onLocationSelect,
  onStatusSelect,
  onCategorySelect,
  onOpeningNestedModal,
  onNameChangeText,
  onDetailedLocationChangeText,
  onWarningThresholdChangeText,
  onNameBlur,
  onDetailedLocationBlur,
  onWarningThresholdBlur,
  translations,
}) => {
  const theme = useTheme();

  return (
    <FormContainer key={formKey}>
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

      <FormSection label={translations.fields.warningThreshold}>
        <NumberInput
          ref={warningThresholdInputRef}
          defaultValue={defaultWarningThreshold}
          onChangeText={onWarningThresholdChangeText}
          onBlur={onWarningThresholdBlur}
          placeholder={translations.placeholders.warningThreshold}
          placeholderTextColor={theme.colors.textLight}
          keyboardType="numeric"
          min={0}
        />
      </FormSection>

      <FormSection label={translations.fields.location}>
        <LocationSelector
          selectedLocationId={selectedLocation}
          onSelect={(id) => id && onLocationSelect(id)}
        />
      </FormSection>

      <FormSection label={translations.fields.category}>
        <CategoryFormSelector
          selectedCategoryId={selectedCategoryId}
          onSelect={onCategorySelect}
        />
      </FormSection>

      <FormSection label={translations.fields.status}>
        <StatusFormSelector
          selectedStatusId={selectedStatus}
          onSelect={onStatusSelect}
        />
      </FormSection>

      <FormSection label={translations.fields.detailedLocation}>
        <HalfInput
          ref={detailedLocationInputRef}
          defaultValue={defaultDetailedLocation}
          onChangeText={onDetailedLocationChangeText}
          onBlur={onDetailedLocationBlur}
          placeholder={translations.placeholders.detailedLocation}
          placeholderTextColor={theme.colors.textLight}
        />
      </FormSection>
    </FormContainer>
  );
};
