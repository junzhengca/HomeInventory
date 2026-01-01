import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { InventoryItem } from '../types/inventory';
import { Theme } from '../theme/types';
import { useSettings } from '../store/hooks';
import { getCurrencySymbol } from './CurrencySelector';
import { countExpiringItems } from '../utils/dateUtils';
import { formatCurrency } from '../utils/formatters';
import type { StyledProps, StyledPropsWith } from '../utils/styledComponents';

const StyledScrollView = styled(ScrollView)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const Container = styled(View)`
  flex-direction: row;
  padding-right: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  gap: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const Card = styled(View)<{ isPrimary?: boolean }>`
  width: 140px;
  height: 160px;
  background-color: ${({ theme, isPrimary }: StyledPropsWith<{ isPrimary?: boolean }>) =>
    isPrimary ? theme.colors.primary : theme.colors.surface};
  border-radius: 24px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  justify-content: space-between;
  elevation: 4;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.05;
  shadow-radius: 8px;
`;

const IconContainer = styled(View)<{ bgColor?: string }>`
  width: 44px;
  height: 44px;
  border-radius: 14px;
  align-items: center;
  justify-content: center;
  background-color: ${({ bgColor }: { bgColor?: string }) => bgColor || 'transparent'};
`;

const CardHeader = styled(View)`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
`;

const NotificationDot = styled(View)`
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: #FF5252;
  margin-top: 2px;
  margin-right: 2px;
`;

const CardContent = styled(View)``;

const Label = styled(Text)<{ isPrimary?: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme, isPrimary }: StyledPropsWith<{ isPrimary?: boolean }>) =>
    isPrimary ? 'rgba(255, 255, 255, 0.9)' : theme.colors.textSecondary};
  margin-bottom: 6px;
`;

const Value = styled(Text)<{ isPrimary?: boolean }>`
  font-size: 28px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme, isPrimary }: StyledPropsWith<{ isPrimary?: boolean }>) =>
    isPrimary ? theme.colors.surface : theme.colors.text};
  max-width: 100%;
`;

interface SummaryCardsProps {
  items: InventoryItem[];
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ items }) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme() as Theme;
  const { settings } = useSettings();
  const currencySymbol = getCurrencySymbol(settings.currency);

  // Calculate total value
  const totalValue = items.reduce((sum, item) => {
    return sum + item.price * (item.amount || 1);
  }, 0);

  // Calculate total count
  const totalCount = items.reduce((sum, item) => {
    return sum + (item.amount || 1);
  }, 0);

  // Calculate expiring items (items expiring within 7 days)
  const expiringCount = countExpiringItems(items, 7);

  return (
    <StyledScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={140 + theme.spacing.md}
      contentContainerStyle={{ paddingRight: theme.spacing.lg }}
    >
      <Container>
        {/* Asset Valuation Card */}
        <Card isPrimary>
          <CardHeader>
            <IconContainer bgColor="rgba(255, 255, 255, 0.25)">
              <Ionicons name="pie-chart-outline" size={26} color="#FFFFFF" />
            </IconContainer>
          </CardHeader>
          <CardContent>
            <Label isPrimary>{t('summary.assetValue')}</Label>
            <Value
              isPrimary
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.6}
            >
              {formatCurrency(totalValue, currencySymbol, true, i18n.language)}
            </Value>
          </CardContent>
        </Card>

        {/* Item Quantity Card */}
        <Card>
          <CardHeader>
            <IconContainer bgColor={theme.colors.primaryExtraLight}>
              <Ionicons name="cube-outline" size={26} color={theme.colors.primary} />
            </IconContainer>
          </CardHeader>
          <CardContent>
            <Label>{t('summary.itemCount')}</Label>
            <Value>{totalCount}</Value>
          </CardContent>
        </Card>

        {/* Expiring Soon Card */}
        <Card>
          <CardHeader>
            <IconContainer bgColor="#FFF5F5">
              <Ionicons name="alert-circle-outline" size={26} color="#FF5252" />
            </IconContainer>
            {expiringCount > 0 && <NotificationDot />}
          </CardHeader>
          <CardContent>
            <Label>{t('summary.expiring')}</Label>
            <Value>{expiringCount}</Value>
          </CardContent>
        </Card>
      </Container>
    </StyledScrollView>
  );
};

