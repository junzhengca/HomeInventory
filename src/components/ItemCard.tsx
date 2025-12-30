import React from 'react';
import { View, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { InventoryItem } from '../types/inventory';
import { useSettings } from '../contexts/SettingsContext';
import { getCurrencySymbol } from './CurrencySelector';
import { formatPrice } from '../utils/formatters';
import { getLightColor } from '../utils/colors';
import type { StyledProps } from '../utils/styledComponents';
import { BaseCard } from './BaseCard';

const IconContainer = styled(View)<{ backgroundColor: string }>`
  width: 72px;
  height: 72px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.lg}px;
  background-color: ${({ backgroundColor }: { backgroundColor: string }) => backgroundColor};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const ContentContainer = styled(View)`
  flex: 1;
  justify-content: center;
`;

const ItemName = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: 2px;
`;

const LocationText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.textLight};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const PriceText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const AmountBadge = styled(View)`
  position: absolute;
  top: ${({ theme }: StyledProps) => theme.spacing.md}px;
  right: ${({ theme }: StyledProps) => theme.spacing.md}px;
  background-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  padding-vertical: 2px;
`;

const AmountText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

interface ItemCardProps {
  item: InventoryItem;
  onPress?: (item: InventoryItem) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onPress }) => {
  const { settings } = useSettings();
  const currencySymbol = getCurrencySymbol(settings.currency);

  const handlePress = () => {
    if (onPress) {
      onPress(item);
    }
  };

  return (
    <BaseCard onPress={handlePress} activeOpacity={0.8}>
      <IconContainer backgroundColor={getLightColor(item.iconColor)}>
        <Ionicons name={item.icon} size={32} color={item.iconColor} />
      </IconContainer>
      
      <ContentContainer>
        <ItemName>{item.name}</ItemName>
        <LocationText>
          {item.location} • {item.detailedLocation}
        </LocationText>
        <PriceText>{formatPrice(item.price, currencySymbol)}</PriceText>
      </ContentContainer>
      
      {item.amount && item.amount > 0 && (
        <AmountBadge>
          <AmountText>x{item.amount}</AmountText>
        </AmountBadge>
      )}
    </BaseCard>
  );
};

