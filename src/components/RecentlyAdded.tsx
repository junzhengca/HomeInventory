import React, { useMemo } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { InventoryItem } from '../types/inventory';
import { ItemCard } from './ItemCard';
import type { StyledProps } from '../utils/styledComponents';

const Container = styled(View)`
  margin-top: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const Header = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const Title = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const ItemsContainer = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const ViewAllButton = styled(TouchableOpacity)`
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryExtraLight};
  border: 1px solid ${({ theme }: StyledProps) => theme.colors.primaryLight};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.md}px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  gap: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const ViewAllText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.primary};
`;

const ViewAllIcon = styled(Ionicons)`
  color: ${({ theme }: StyledProps) => theme.colors.primary};
`;

interface RecentlyAddedProps {
  items: InventoryItem[];
  maxItems?: number;
  onViewAll?: () => void;
  onItemPress?: (item: InventoryItem) => void;
}

export const RecentlyAdded: React.FC<RecentlyAddedProps> = ({
  items,
  maxItems = 3,
  onViewAll,
  onItemPress,
}) => {
  const { t } = useTranslation();
  // Sort items by purchaseDate in descending order (most recent first)
  // Items without purchaseDate go to the end, using item ID as fallback
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const dateA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : null;
      const dateB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : null;
      
      // If both have dates, sort by date descending
      if (dateA && dateB) {
        return dateB - dateA;
      }
      
      // If only A has a date, A comes first
      if (dateA && !dateB) {
        return -1;
      }
      
      // If only B has a date, B comes first
      if (!dateA && dateB) {
        return 1;
      }
      
      // If neither has a date, use item ID (timestamp-based) as fallback
      // Parse the timestamp from the ID (format: timestamp + random string)
      const idA = parseInt(a.id.split('-')[0]) || 0;
      const idB = parseInt(b.id.split('-')[0]) || 0;
      return idB - idA;
    });
  }, [items]);

  const displayedItems = sortedItems.slice(0, maxItems);
  const totalCount = sortedItems.length;

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      console.log('View all pressed');
    }
  };

  return (
    <Container>
      <Header>
        <Title>{t('recentlyAdded.title')}</Title>
      </Header>
      <ItemsContainer>
        {displayedItems.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onPress={onItemPress}
          />
        ))}
      </ItemsContainer>
      {totalCount > maxItems && (
        <ViewAllButton onPress={handleViewAll} activeOpacity={0.7}>
          <ViewAllText>{t('recentlyAdded.viewAll')} ({totalCount})</ViewAllText>
          <ViewAllIcon name="arrow-forward" size={24} />
        </ViewAllButton>
      )}
    </Container>
  );
};

