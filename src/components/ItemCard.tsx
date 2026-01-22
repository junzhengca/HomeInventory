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
  padding: 0px;
`;

const IconContainer = styled(View) <{ backgroundColor: string }>`
  width: 38px;
  height: 38px;
  border-radius: 19px;
  background-color: ${({ backgroundColor }: { backgroundColor: string }) => backgroundColor};
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0px;
  left: 0px;
`;

const TopRightContainer = styled(View)`
  position: absolute;
  top: 0px;
  right: 0px;
  align-items: flex-end;
`;

const QuantityBadge = styled(View)`
  margin-bottom: 2px;
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
  margin-top: 30px;
  margin-bottom: 14px;
`;

const ItemName = styled(Text)`
  font-size: 16px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  text-align: left;
  margin-bottom: 1px;
  line-height: 20px;
`;

const LocationText = styled(Text)`
  font-size: 12px;
  color: ${({ theme }: StyledProps) => theme.colors.textLight};
  text-align: left;
  margin-bottom: 1px;
`;

const PriceText = styled(Text)`
  font-size: 12px;
  color: ${({ theme }: StyledProps) => theme.colors.textLight};
  text-align: left;
`;

const BottomContainer = styled(View)`
  position: absolute;
  bottom: 0px;
  left: 0px;
  right: 0px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const UsageButton = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  border-radius: 20px;
  padding-horizontal: 8px;
  padding-vertical: 4px;
  
  /* Subtle shadow for the button */
  shadow-color: #000;
  shadow-offset: 0px 1px;
  shadow-opacity: 0.05;
  shadow-radius: 2px;
  elevation: 1;
`;

const UsageText = styled(Text)`
  font-size: 11px;
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

  // Status indicators
  const needsRestock =
    item.amount !== undefined &&
    item.amount <= (item.warningThreshold ?? 0);
  // Get status from item, default to 'using' for backward compatibility
  const itemStatus = item.status || 'using';

  return (
    <BaseCard onPress={handlePress} activeOpacity={0.8} square compact>
      <CardContent>
        {/* Top-left: Icon */}
        <IconContainer backgroundColor={getLightColor(item.iconColor)}>
          <Ionicons name={item.icon} size={22} color={item.iconColor} />
        </IconContainer>

        {/* Top-right: Quantity and Status */}
        <TopRightContainer>
          {item.amount !== undefined && (
            <QuantityBadge>
              <QuantityText>x{item.amount}</QuantityText>
            </QuantityBadge>
          )}
          {needsRestock && (
            <StatusBadge>
              <StatusIcon>
                <Ionicons name="alert-circle" size={14} color="#FF5252" />
              </StatusIcon>
              <StatusText style={{ color: '#FF5252' }}>{t('itemDetails.needsRestocking')}</StatusText>
            </StatusBadge>
          )}
        </TopRightContainer>

        {/* Middle: Item name and location */}
        <MiddleContainer>
          <ItemName numberOfLines={2}>{item.name}</ItemName>
          <LocationText numberOfLines={1}>{locationText}</LocationText>
        </MiddleContainer>

        {/* Bottom: price and status */}
        <BottomContainer>
          {item.price > 0 ? (
            <PriceText>{formatPrice(item.price, currencySymbol)}</PriceText>
          ) : (
            <View /> // Spacer to keep status button on the right
          )}
          <UsageButton>
            <UsageText>{t(`statuses.${itemStatus}`)}</UsageText>
          </UsageButton>
        </BottomContainer>
      </CardContent>
    </BaseCard>
  );
};
