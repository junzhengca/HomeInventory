import React from 'react';
import { TouchableOpacity, ScrollView } from 'react-native';
import styled from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import type {
  StyledProps,
  StyledPropsWith,
} from '../utils/styledComponents';
import { locations } from '../data/locations';

const LocationScrollView = styled(ScrollView).attrs(() => ({
  horizontal: true,
  showsHorizontalScrollIndicator: false,
}))`
  flex-grow: 0;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const LocationButton = styled(TouchableOpacity)<{ isSelected: boolean }>`
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  flex-direction: row;
  align-items: center;
  background-color: ${({
    theme,
    isSelected,
  }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.surface};
  border-width: 1px;
  border-color: ${({
    theme,
    isSelected,
  }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.border};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const LocationText = styled.Text<{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.surface : theme.colors.text};
`;

const CountText = styled.Text<{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.surface : theme.colors.textSecondary};
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  opacity: 0.7;
`;

export interface LocationFilterProps {
  selectedLocationId: string | null;
  onSelect: (locationId: string | null) => void;
  counts?: Record<string, number>;
}

/**
 * Location filter component with horizontal scrollable pills.
 * Includes an "All" option to show all locations.
 *
 * @example
 * <LocationFilter
 *   selectedLocationId={selectedLocation}
 *   onSelect={(id) => setSelectedLocation(id)}
 * />
 */
export const LocationFilter: React.FC<LocationFilterProps> = ({
  selectedLocationId,
  onSelect,
  counts = {},
}) => {
  const { t } = useTranslation();

  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <LocationScrollView
      contentContainerStyle={{ paddingVertical: 0, alignItems: 'center' }}
    >
      <LocationButton
        isSelected={selectedLocationId === null}
        onPress={() => onSelect(null)}
        activeOpacity={0.7}
      >
        <LocationText isSelected={selectedLocationId === null}>
          {t('categories.all')}
        </LocationText>
        <CountText isSelected={selectedLocationId === null}>
          {totalCount}
        </CountText>
      </LocationButton>
      {locations.map((location) => (
        <LocationButton
          key={location.id}
          isSelected={selectedLocationId === location.id}
          onPress={() => onSelect(location.id)}
          activeOpacity={0.7}
        >
          <LocationText isSelected={selectedLocationId === location.id}>
            {t(`locations.${location.id}`)}
          </LocationText>
          <CountText isSelected={selectedLocationId === location.id}>
            {counts[location.id] || 0}
          </CountText>
        </LocationButton>
      ))}
    </LocationScrollView>
  );
};
