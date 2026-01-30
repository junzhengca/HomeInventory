import React from 'react';
import { TouchableOpacity, ScrollView, View, Text } from 'react-native';
import styled from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import type { StyledProps, StyledPropsWith } from '../../utils/styledComponents';

export type CurrencyOption = {
  id: string;
  symbol: string;
  code: string;
  label: string;
};

export interface CurrencySelectorProps {
  selectedCurrencyId?: string;
  onCurrencySelect?: (currencyId: string) => void;
}

const Container = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const Header = styled(View)`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const IconContainer = styled(View)`
  width: 24px;
  height: 24px;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  align-items: center;
  justify-content: center;
`;

const Icon = styled(Text)`
  font-size: 18px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const Title = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const OptionsScroll = styled(ScrollView).attrs(() => ({
  horizontal: true,
  showsHorizontalScrollIndicator: false,
  contentContainerStyle: {
    paddingHorizontal: 4,
  },
}))``;

const OptionsContainer = styled(View)`
  flex-direction: row;
  justify-content: flex-start;
  gap: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const CurrencyButton = styled(TouchableOpacity) <{ isSelected: boolean }>`
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-width: 2px;
  border-color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.borderLight};
  align-items: center;
  justify-content: center;
`;

const CurrencyButtonText = styled(Text) <{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.typography.fontWeight.bold : theme.typography.fontWeight.bold};
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.textLight};
`;

export const defaultCurrencies: CurrencyOption[] = [
  { id: 'usd', symbol: '$', code: 'USD', label: '$ USD' },
  { id: 'eur', symbol: '€', code: 'EUR', label: '€ EUR' },
  { id: 'jpy', symbol: '¥', code: 'JPY', label: '¥ JPY' },
  { id: 'gbp', symbol: '£', code: 'GBP', label: '£ GBP' },
  { id: 'cny', symbol: '¥', code: 'CNY', label: '¥ CNY' },
  { id: 'aud', symbol: '$', code: 'AUD', label: '$ AUD' },
  { id: 'cad', symbol: '$', code: 'CAD', label: '$ CAD' },
  { id: 'chf', symbol: 'Fr', code: 'CHF', label: 'Fr CHF' },
  { id: 'hkd', symbol: '$', code: 'HKD', label: '$ HKD' },
  { id: 'sgd', symbol: '$', code: 'SGD', label: '$ SGD' },
  { id: 'krw', symbol: '₩', code: 'KRW', label: '₩ KRW' },
  { id: 'inr', symbol: '₹', code: 'INR', label: '₹ INR' },
  { id: 'brl', symbol: 'R$', code: 'BRL', label: 'R$ BRL' },
  { id: 'mxn', symbol: '$', code: 'MXN', label: '$ MXN' },
];

/**
 * Get currency symbol by currency ID
 * @param currencyId - The currency ID (e.g., 'cny', 'usd', 'eur', 'gbp')
 * @returns The currency symbol (e.g., '¥', '$', '€', '£') or '$' as default
 */
export const getCurrencySymbol = (currencyId: string): string => {
  const currency = defaultCurrencies.find((c) => c.id === currencyId);
  return currency?.symbol || '$';
};

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  selectedCurrencyId = 'usd',
  onCurrencySelect,
}) => {
  const { t } = useTranslation();

  // Filter defaultCurrencies to get unique symbols
  const uniqueCurrencies = React.useMemo(() => {
    const seenSymbols = new Set<string>();
    return defaultCurrencies.filter((currency) => {
      if (seenSymbols.has(currency.symbol)) {
        return false;
      }
      seenSymbols.add(currency.symbol);
      return true;
    });
  }, []);

  return (
    <Container>
      <Header>
        <IconContainer>
          <Icon>$</Icon>
        </IconContainer>
        <Title>{t('settings.currency')}</Title>
      </Header>
      <OptionsScroll>
        <OptionsContainer>
          {uniqueCurrencies.map((currency) => {
            const isSelected = getCurrencySymbol(selectedCurrencyId) === currency.symbol;
            return (
              <CurrencyButton
                key={currency.symbol}
                isSelected={isSelected}
                onPress={() => onCurrencySelect?.(currency.id)}
                activeOpacity={0.7}
              >
                <CurrencyButtonText isSelected={isSelected}>
                  {currency.symbol}
                </CurrencyButtonText>
              </CurrencyButton>
            );
          })}
        </OptionsContainer>
      </OptionsScroll>
    </Container>
  );
};

