import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { InventoryItem, Category } from '../../types/inventory';
import { getCategoryById } from '../../services/CategoryService';
import { formatLocation } from '../../utils/formatters';
import { isExpiringSoon } from '../../utils/dateUtils';
import { getTotalAmount, getEarliestExpiry } from '../../utils/batchUtils';
import type { StyledProps } from '../../utils/styledComponents';
import { BaseCard } from '../atoms';
import { useHome } from '../../hooks/useHome';

// ============================================================================
// TYPES
// ============================================================================

export interface ItemCardProps {
  item: InventoryItem;
  onPress?: (item: InventoryItem) => void;
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

/**
 * Main horizontal card container with fixed height for consistency
 */
const CardContent = styled(View)`
  flex-direction: row;
  align-items: center;
  width: 100%;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

/**
 * Left section containing color indicator and text content
 */
const LeftSection = styled(View)`
  flex: 1;
  flex-direction: row;
  align-items: center;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

/**
 * Category color circle indicator (left side)
 */
const ColorCircle = styled.View<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 6px;
  background-color: ${({ $color }: { $color: string }) => $color};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

/**
 * Text content container for item name and metadata
 */
const TextContent = styled(View)`
  flex: 1;
  justify-content: center;
`;

/**
 * Item name (top text on left side)
 */
const ItemName = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  text-align: left;
  line-height: 20px;
`;

/**
 * Category and location text (bottom text on left side)
 */
const MetadataText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.regular};
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  text-align: left;
  line-height: 18px;
`;

/**
 * Right section containing warning tags and status
 */
const RightSection = styled(View)`
  align-items: flex-end;
  justify-content: center;
  gap: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

/**
 * Container for warning tags (top right)
 */
const TagsContainer = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  flex-wrap: nowrap;
  justify-content: flex-end;
`;

/**
 * Individual warning tag badge
 */
type WarningTagVariant = 'restock' | 'expiry';

const WarningTag = styled.View<{ $variant: WarningTagVariant }>`
  flex-direction: row;
  align-items: center;
  padding-horizontal: 6px;
  padding-vertical: 2px;
  border-radius: 10px;
  background-color: ({ $variant }: { $variant: WarningTagVariant }) =>
    $variant === 'restock' ? '#FFF3E0' : '#FFEBEE';
  border-width: 1px;
  border-color: ({ $variant }: { $variant: WarningTagVariant }) =>
    $variant === 'restock' ? '#FFB74D' : '#EF5350';
`;

const WarningTagText = styled(Text) <{ $variant: WarningTagVariant }>`
  font-size: 10px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ({ $variant }: { $variant: WarningTagVariant }) =>
    $variant === 'restock' ? '#E65100' : '#C62828';
  line-height: 14px;
`;

const WarningTagIcon = styled(View)`
  margin-right: 2px;
`;

/**
 * Status badge (bottom right)
 */
const StatusBadge = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  border-radius: 12px;
  padding-horizontal: 8px;
  padding-vertical: 3px;
`;

const StatusBadgeText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.xs}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  line-height: 16px;
`;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ItemCard: React.FC<ItemCardProps> = ({ item, onPress }) => {
  const { t } = useTranslation();
  const { currentHomeId } = useHome();
  const [category, setCategory] = useState<Category | null>(null);

  // Load category data when component mounts or item/categoryId changes
  useEffect(() => {
    const loadCategory = async () => {
      if (item.categoryId && currentHomeId) {
        try {
          const cat = await getCategoryById(item.categoryId, currentHomeId);
          setCategory(cat);
        } catch {
          setCategory(null);
        }
      } else {
        setCategory(null);
      }
    };

    loadCategory();
  }, [item.categoryId, currentHomeId]);

  const handlePress = () => {
    if (onPress) {
      onPress(item);
    }
  };

  // Build metadata text: category name + location name
  const locationText = formatLocation(item.location, item.detailedLocation, t);
  // Use category name directly (user-provided or built-in) - no i18n translation
  const categoryName = category?.label || category?.name || null;

  const metadataParts = [categoryName, locationText].filter(Boolean);
  const metadataText = metadataParts.length > 0 ? metadataParts.join(' · ') : locationText;

  // Warning checks
  const totalAmount = getTotalAmount(item.batches || []);
  const needsRestock =
    totalAmount !== undefined &&
    totalAmount <= (item.warningThreshold ?? 0);
  const earliestExpiry = getEarliestExpiry(item.batches || []);
  const isExpiring = earliestExpiry ? isExpiringSoon(earliestExpiry, 7) : false;

  // Status text (default to 'using' for backward compatibility)
  const itemStatus = item.status || 'using';

  return (
    <BaseCard onPress={handlePress} activeOpacity={0.8} square={false} compact>
      <CardContent>
        {/* Left section: color circle + text content */}
        <LeftSection>
          {/* Category color circle */}
          <ColorCircle $color={category?.color || item.iconColor} />

          {/* Text content: item name (top), category + location (bottom) */}
          <TextContent>
            <ItemName numberOfLines={1}>{item.name}</ItemName>
            <MetadataText numberOfLines={1}>{metadataText}</MetadataText>
          </TextContent>
        </LeftSection>

        {/* Right section: warning tags (top), status (bottom) */}
        <RightSection>
          {/* Warning tags */}
          <TagsContainer>
            {needsRestock && (
              <WarningTag $variant="restock">
                <WarningTagIcon>
                  <Ionicons name="refresh" size={10} color="#E65100" />
                </WarningTagIcon>
                <WarningTagText $variant="restock">
                  {t('itemDetails.needsRestocking')}
                </WarningTagText>
              </WarningTag>
            )}
            {isExpiring && (
              <WarningTag $variant="expiry">
                <WarningTagIcon>
                  <Ionicons name="time" size={10} color="#C62828" />
                </WarningTagIcon>
                <WarningTagText $variant="expiry">
                  {t('itemDetails.expiring')}
                </WarningTagText>
              </WarningTag>
            )}
          </TagsContainer>

          {/* Status badge */}
          <StatusBadge>
            <StatusBadgeText>{t(`statuses.${itemStatus}`)}</StatusBadgeText>
          </StatusBadge>
        </RightSection>
      </CardContent>
    </BaseCard>
  );
};
