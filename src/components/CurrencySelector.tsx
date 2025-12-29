import React from 'react';
import { TouchableOpacity, ScrollView } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';

export type CurrencyOption = {
  id: string;
  symbol: string;
  code: string;
  label: string;
};

interface CurrencySelectorProps {
  selectedCurrencyId?: string;
  onCurrencySelect?: (currencyId: string) => void;
}

const Container = styled.View`
  margin-bottom: ${({ theme }) => theme.spacing.xl}px;
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const IconContainer = styled.View`
  width: 24px;
  height: 24px;
  margin-right: ${({ theme }) => theme.spacing.sm}px;
  align-items: center;
  justify-content: center;
`;

const Icon = styled.Text`
  font-size: 18px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`;

const Title = styled.Text`
  font-size: ${({ theme }) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`;

const OptionsScroll = styled(ScrollView).attrs(() => ({
  horizontal: true,
  showsHorizontalScrollIndicator: false,
  contentContainerStyle: {
    paddingHorizontal: 4,
  },
}))``;

const OptionsContainer = styled.View`
  flex-direction: row;
  justify-content: flex-start;
  gap: ${({ theme }) => theme.spacing.md}px;
`;

const CurrencyButton = styled(TouchableOpacity)<{ isSelected: boolean }>`
  padding-vertical: ${({ theme }) => theme.spacing.md}px;
  padding-horizontal: ${({ theme }) => theme.spacing.lg}px;
  border-radius: ${({ theme }) => theme.borderRadius.xl}px;
  background-color: #ffffff;
  border-width: 2px;
  border-color: ${({ theme, isSelected }) =>
    isSelected ? theme.colors.primary : theme.colors.borderLight};
  align-items: center;
  justify-content: center;
  min-width: 100px;
`;

const CurrencyButtonText = styled.Text<{ isSelected: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme, isSelected }) =>
    isSelected ? theme.typography.fontWeight.bold : theme.typography.fontWeight.bold};
  color: ${({ theme, isSelected }) =>
    isSelected ? theme.colors.primary : theme.colors.textLight};
`;

export const defaultCurrencies: CurrencyOption[] = [
  { id: 'cny', symbol: '¥', code: 'CNY', label: '¥ CNY' },
  { id: 'usd', symbol: '$', code: 'USD', label: '$ USD' },
  { id: 'eur', symbol: '€', code: 'EUR', label: '€ EUR' },
  { id: 'gbp', symbol: '£', code: 'GBP', label: '£ GBP' },
];

/**
 * Get currency symbol by currency ID
 * @param currencyId - The currency ID (e.g., 'cny', 'usd', 'eur', 'gbp')
 * @returns The currency symbol (e.g., '¥', '$', '€', '£') or '¥' as default
 */
export const getCurrencySymbol = (currencyId: string): string => {
  const currency = defaultCurrencies.find((c) => c.id === currencyId);
  return currency?.symbol || '¥';
};

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  selectedCurrencyId = 'cny',
  onCurrencySelect,
}) => {
  return (
    <Container>
      <Header>
        <IconContainer>
          <Icon>$</Icon>
        </IconContainer>
        <Title>货币单位</Title>
      </Header>
      <OptionsScroll>
        <OptionsContainer>
          {defaultCurrencies.map((currency) => (
            <CurrencyButton
              key={currency.id}
              isSelected={selectedCurrencyId === currency.id}
              onPress={() => onCurrencySelect?.(currency.id)}
              activeOpacity={0.7}
            >
              <CurrencyButtonText isSelected={selectedCurrencyId === currency.id}>
                {currency.label}
              </CurrencyButtonText>
            </CurrencyButton>
          ))}
        </OptionsContainer>
      </OptionsScroll>
    </Container>
  );
};

