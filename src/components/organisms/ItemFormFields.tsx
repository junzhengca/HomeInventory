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
import { LocationField, StatusField, IconColorPicker, DatePicker } from '../molecules';

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
  selectedIcon: keyof typeof Ionicons.glyphMap;
  selectedColor: string;
  selectedLocation: string;
  selectedStatus: string;
  purchaseDate: Date | null;
  expiryDate: Date | null;
  formKey: number;
  // Input refs
  nameInputRef: React.RefObject<TextInput | null>;
  priceInputRef: React.RefObject<TextInput | null>;
  detailedLocationInputRef: React.RefObject<TextInput | null>;
  amountInputRef: React.RefObject<TextInput | null>;
  warningThresholdInputRef: React.RefObject<TextInput | null>;
  // Default values for uncontrolled inputs
  defaultName: string;
  defaultPrice: string;
  defaultDetailedLocation: string;
  defaultAmount: string;
  defaultWarningThreshold: string;
  // Change handlers
  onIconSelect: (icon: keyof typeof Ionicons.glyphMap) => void;
  onColorSelect: (color: string) => void;
  onLocationSelect: (location: string) => void;
  onStatusSelect: (status: string) => void;
  onPurchaseDateChange: (date: Date | null) => void;
  onExpiryDateChange: (date: Date | null) => void;
  onOpeningNestedModal?: (isOpening: boolean) => void;
  // Input handlers
  onNameChangeText: (text: string) => void;
  onPriceChangeText: (text: string) => void;
  onDetailedLocationChangeText: (text: string) => void;
  onAmountChangeText: (text: string) => void;
  onWarningThresholdChangeText: (text: string) => void;
  // Blur handlers
  onNameBlur: () => void;
  onPriceBlur: () => void;
  onDetailedLocationBlur: () => void;
  onAmountBlur: () => void;
  onWarningThresholdBlur: () => void;
  // Translation keys
  translations: {
    fields: {
      name: string;
      amount: string;
      warningThreshold: string;
      location: string;
      status: string;
      price: string;
      detailedLocation: string;
      purchaseDate: string;
      expiryDate: string;
    };
    placeholders: {
      name: string;
      price: string;
      detailedLocation: string;
      amount: string;
      warningThreshold: string;
    };
  };
}

/**
 * Shared form fields component for item creation and editing.
 * Uses uncontrolled inputs with refs to prevent IME composition interruption.
 */
export const ItemFormFields: React.FC<ItemFormFieldsProps> = ({
  selectedIcon,
  selectedColor,
  selectedLocation,
  selectedStatus,
  purchaseDate,
  expiryDate,
  formKey,
  nameInputRef,
  priceInputRef,
  detailedLocationInputRef,
  amountInputRef,
  warningThresholdInputRef,
  defaultName,
  defaultPrice,
  defaultDetailedLocation,
  defaultAmount,
  defaultWarningThreshold,
  onIconSelect,
  onColorSelect,
  onLocationSelect,
  onStatusSelect,
  onPurchaseDateChange,
  onExpiryDateChange,
  onOpeningNestedModal,
  onNameChangeText,
  onPriceChangeText,
  onDetailedLocationChangeText,
  onAmountChangeText,
  onWarningThresholdChangeText,
  onNameBlur,
  onPriceBlur,
  onDetailedLocationBlur,
  onAmountBlur,
  onWarningThresholdBlur,
  translations,
}) => {
  const theme = useTheme();

  return (
    <FormContainer key={formKey}>
      <FormSection label={translations.fields.name}>
        <NameRow>
          <IconColorPicker
            icon={selectedIcon}
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
        </HalfContainer>
      </Row>

      <FormSection label={translations.fields.location}>
        <LocationField
          selectedId={selectedLocation}
          onSelect={onLocationSelect}
        />
      </FormSection>

      <FormSection label={translations.fields.status}>
        <StatusField
          selectedId={selectedStatus}
          onSelect={onStatusSelect}
        />
      </FormSection>

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
    </FormContainer>
  );
};
