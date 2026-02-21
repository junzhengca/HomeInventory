import React from 'react';
import { TextInput } from 'react-native';
import styled from 'styled-components/native';
import { useTranslation } from 'react-i18next';

import type { StyledProps } from '../../utils/styledComponents';
import { useTheme } from '../../theme/ThemeProvider';
import { useSettings } from '../../store/hooks';
import { FormSection, UncontrolledInput, NumberInput } from '../atoms';
import { getCurrencySymbol } from './CurrencySelector';

// ---------------------------------------------------------------------------
// Styled helpers
// ---------------------------------------------------------------------------

const Row = styled.View`
  flex-direction: row;
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const PriceColumn = styled.View`
  flex: 1;
`;

const VendorColumn = styled.View`
  flex: 1;
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BatchDetailsFormSectionProps {
  /** Default values for uncontrolled inputs (IME-safe) */
  defaultPrice: string;
  defaultAmount: string;
  defaultUnit: string;
  defaultVendor: string;
  /** Refs for each input */
  priceInputRef: React.RefObject<TextInput | null>;
  amountInputRef: React.RefObject<TextInput | null>;
  unitInputRef?: React.RefObject<TextInput | null>;
  vendorInputRef: React.RefObject<TextInput | null>;
  /** Change handlers */
  onPriceChange: (text: string) => void;
  onAmountChange: (text: string) => void;
  onUnitChange: (text: string) => void;
  onVendorChange: (text: string) => void;
  /** Blur handlers */
  onPriceBlur: () => void;
  onAmountBlur: () => void;
  onUnitBlur: () => void;
  onVendorBlur: () => void;
  /** Use smaller vertical spacing (e.g. for add-item bottom sheet) */
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Form fields for item batch details: Quantity, Price, Vendor.
 * Each uses a normal FormSection label like other inputs (no "Batch Details" heading).
 */
export const BatchDetailsFormSection: React.FC<BatchDetailsFormSectionProps> = ({
  defaultPrice,
  defaultAmount,
  defaultUnit,
  defaultVendor,
  priceInputRef,
  amountInputRef,
  vendorInputRef,
  onPriceChange,
  onAmountChange,
  onUnitChange,
  onVendorChange,
  onPriceBlur,
  onAmountBlur,
  onVendorBlur,
  compact = false,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings } = useSettings();

  const [unitValue, setUnitValue] = React.useState(defaultUnit);

  React.useEffect(() => {
    setUnitValue(defaultUnit);
  }, [defaultUnit]);

  const handleUnitSelect = (newUnit: string) => {
    setUnitValue(newUnit);
    onUnitChange(newUnit);
  };

  const currencySymbol = getCurrencySymbol(settings.currency);

  return (
    <>
      <FormSection compact={compact} label={t('createItem.fields.amount')}>
        <NumberInput
          ref={amountInputRef}
          defaultValue={defaultAmount}
          onChangeText={onAmountChange}
          onBlur={onAmountBlur}
          placeholder={t('createItem.placeholders.amount')}
          placeholderTextColor={theme.colors.textLight}
          keyboardType="numeric"
          min={1}
          unitValue={unitValue}
          onUnitChange={handleUnitSelect}
        />
      </FormSection>

      <Row>
        <PriceColumn>
          <FormSection compact={compact} label={`${t('createItem.fields.price')} (${currencySymbol})`}>
            <UncontrolledInput
              ref={priceInputRef}
              defaultValue={defaultPrice}
              onChangeText={onPriceChange}
              onBlur={onPriceBlur}
              placeholder={t('createItem.placeholders.price')}
              placeholderTextColor={theme.colors.textLight}
              keyboardType="numeric"
            />
          </FormSection>
        </PriceColumn>
        <VendorColumn>
          <FormSection compact={compact} label={t('createItem.fields.vendor')}>
            <UncontrolledInput
              ref={vendorInputRef}
              defaultValue={defaultVendor}
              onChangeText={onVendorChange}
              onBlur={onVendorBlur}
              placeholder={t('createItem.placeholders.vendor')}
              placeholderTextColor={theme.colors.textLight}
            />
          </FormSection>
        </VendorColumn>
      </Row>
    </>
  );
};
