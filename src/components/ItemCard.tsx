import React from 'react';
import { View, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { InventoryItem } from '../types/inventory';
import { useSettings } from '../store/hooks';
import { getCurrencySymbol } from './CurrencySelector';
import { formatPrice, formatLocation } from '../utils/formatters';
import { getLightColor } from '../utils/colors';
import type { StyledProps } from '../utils/styledComponents';
import { BaseCard } from './BaseCard';

const CardContent = styled(View)`
  flex: 1;
  position: relative;
  padding: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const IconContainer = styled(View)<{ backgroundColor: string }>`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background-color: ${({ backgroundColor }: { backgroundColor: string }) => backgroundColor};
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 2px;
  left: 2px;
`;

const TopRightContainer = styled(View)`
  position: absolute;
  top: 4px;
  right: 2px;
  align-items: flex-end;
`;

const QuantityBadge = styled(View)`
  margin-bottom: 4px;
`;

const QuantityText = styled(Text)`
  font-size: 14px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const StatusBadge = styled(View)`
  flex-direction: row;
  align-items: center;
  margin-top: 0;
`;

const StatusIcon = styled(View)`
  margin-right: 2px;
`;

const StatusText = styled(Text)`
  font-size: 11px;
  color: #ff8a80;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
`;

const MiddleContainer = styled(View)`
  flex: 1;
  justify-content: center;
  align-items: flex-start;
  margin-top: 52px;
`;

const ItemName = styled(Text)`
  font-size: 16px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  text-align: left;
  margin-bottom: 4px;
  line-height: 20px;
`;

const LocationText = styled(Text)`
  font-size: 12px;
  color: ${({ theme }: StyledProps) => theme.colors.textLight};
  text-align: left;
  margin-bottom: 4px;
`;

const PriceText = styled(Text)`
  font-size: 16px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  text-align: left;
`;

const BottomRightContainer = styled(View)`
  position: absolute;
  bottom: 2px;
  right: 2px;
`;

const UsageButton = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  border-radius: 20px;
  padding-horizontal: 12px;
  padding-vertical: 6px;
  
  /* Subtle shadow for the button */
  shadow-color: #000;
  shadow-offset: 0px 1px;
  shadow-opacity: 0.05;
  shadow-radius: 2px;
  elevation: 1;
`;

const UsageText = styled(Text)`
  font-size: 12px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
`;

interface ItemCardProps {
  item: InventoryItem;
  onPress?: (item: InventoryItem) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onPress }) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const currencySymbol = getCurrencySymbol(settings.currency);

  const handlePress = () => {
    if (onPress) {
      onPress(item);
    }
  };

  // Get formatted location text
  const locationText = formatLocation(item.location, item.detailedLocation, t);

  // Placeholder logic for status indicators
  // TODO: Replace with actual status fields from InventoryItem
  const needsRestock = item.amount !== undefined && item.amount <= 1;
  const inUse = true; // Placeholder - always show "使用中" for now

  return (
    <BaseCard onPress={handlePress} activeOpacity={0.8} square compact>
      <CardContent>
        {/* Top-left: Icon */}
        <IconContainer backgroundColor={getLightColor(item.iconColor)}>
          <Ionicons name={item.icon} size={22} color={item.iconColor} />
        </IconContainer>

        {/* Top-right: Quantity and Status */}
        <TopRightContainer>
          {item.amount && item.amount > 0 && (
            <QuantityBadge>
              <QuantityText>x{item.amount}</QuantityText>
            </QuantityBadge>
          )}
          {needsRestock && (
            <StatusBadge>
              <StatusIcon>
                <Ionicons name="alert-circle-outline" size={14} color="#ff8a80" />
              </StatusIcon>
              <StatusText>需补货</StatusText>
            </StatusBadge>
          )}
        </TopRightContainer>

        {/* Middle: Item name, location, and price */}
        <MiddleContainer>
          <ItemName numberOfLines={2}>{item.name}</ItemName>
          <LocationText numberOfLines={1}>{locationText}</LocationText>
          {item.price > 0 && (
            <PriceText>{formatPrice(item.price, currencySymbol)}</PriceText>
          )}
        </MiddleContainer>

        {/* Bottom-right: usage status button */}
        <BottomRightContainer>
          {inUse && (
            <UsageButton>
              <UsageText>{item.amount === 0 ? '缺货' : '使用中'}</UsageText>
            </UsageButton>
          )}
        </BottomRightContainer>
      </CardContent>
    </BaseCard>
  );
};
