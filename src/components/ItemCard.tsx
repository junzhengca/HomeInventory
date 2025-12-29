import React from 'react';
import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { InventoryItem } from '../types/inventory';
import { useSettings } from '../contexts/SettingsContext';
import { getCurrencySymbol } from './CurrencySelector';

const Card = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.xxl}px;
  padding: ${({ theme }) => theme.spacing.md}px;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
  position: relative;
  
  /* Subtle shadow for the card */
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 8px;
  elevation: 2;
`;

const IconContainer = styled.View<{ backgroundColor: string }>`
  width: 72px;
  height: 72px;
  border-radius: ${({ theme }) => theme.borderRadius.lg}px;
  background-color: ${({ backgroundColor }) => backgroundColor};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }) => theme.spacing.md}px;
`;

const ContentContainer = styled.View`
  flex: 1;
  justify-content: center;
`;

const ItemName = styled.Text`
  font-size: ${({ theme }) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 2px;
`;

const LocationText = styled.Text`
  font-size: ${({ theme }) => theme.typography.fontSize.sm}px;
  color: ${({ theme }) => theme.colors.textLight};
  margin-bottom: ${({ theme }) => theme.spacing.xs}px;
`;

const PriceText = styled.Text`
  font-size: ${({ theme }) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`;

const AmountBadge = styled.View`
  position: absolute;
  top: ${({ theme }) => theme.spacing.md}px;
  right: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme }) => theme.colors.borderLight};
  border-radius: ${({ theme }) => theme.borderRadius.full}px;
  padding-horizontal: ${({ theme }) => theme.spacing.sm}px;
  padding-vertical: 2px;
`;

const AmountText = styled.Text`
  font-size: ${({ theme }) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.textSecondary};
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

  const formatPrice = (price: number) => {
    return `${currencySymbol} ${price.toLocaleString()}`;
  };

  // Helper to get a light version of the icon color for background
  const getLightColor = (color: string) => {
    // If it's a hex color, add transparency
    if (color.startsWith('#')) {
      return color + '15'; // ~8% opacity for soft background
    }
    return color;
  };

  return (
    <Card onPress={handlePress} activeOpacity={0.8}>
      <IconContainer backgroundColor={getLightColor(item.iconColor)}>
        <Ionicons name={item.icon} size={32} color={item.iconColor} />
      </IconContainer>
      
      <ContentContainer>
        <ItemName>{item.name}</ItemName>
        <LocationText>
          {item.location} • {item.detailedLocation}
        </LocationText>
        <PriceText>{formatPrice(item.price)}</PriceText>
      </ContentContainer>
      
      {item.amount && item.amount > 0 && (
        <AmountBadge>
          <AmountText>x{item.amount}</AmountText>
        </AmountBadge>
      )}
    </Card>
  );
};

