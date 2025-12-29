import React from 'react';
import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { InventoryItem } from '../types/inventory';
import { ItemCard } from './ItemCard';

const Container = styled.View`
  margin-top: ${({ theme }) => theme.spacing.lg}px;
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const Title = styled.Text`
  font-size: ${({ theme }) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`;

const ItemsContainer = styled.View`
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const ViewAllButton = styled(TouchableOpacity)`
  background-color: ${({ theme }) => theme.colors.primaryExtraLight};
  border: 1px solid ${({ theme }) => theme.colors.primaryLight};
  border-radius: ${({ theme }) => theme.borderRadius.full}px;
  padding-vertical: ${({ theme }) => theme.spacing.md}px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing.sm}px;
  gap: ${({ theme }) => theme.spacing.xs}px;
`;

const ViewAllText = styled.Text`
  font-size: ${({ theme }) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.primary};
`;

const ViewAllIcon = styled(Ionicons)`
  color: ${({ theme }) => theme.colors.primary};
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
  const displayedItems = items.slice(0, maxItems);
  const totalCount = items.length;

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
        <Title>最近添加</Title>
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
          <ViewAllText>查看全部 ({totalCount})</ViewAllText>
          <ViewAllIcon name="arrow-forward" size={24} />
        </ViewAllButton>
      )}
    </Container>
  );
};

