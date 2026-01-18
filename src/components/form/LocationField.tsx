import React from 'react';
import { TouchableOpacity, ScrollView } from 'react-native';
import styled from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import type {
  StyledProps,
  StyledPropsWith,
} from '../../utils/styledComponents';
import { locations } from '../../data/locations';

const LocationScrollView = styled(ScrollView)`
  flex-direction: row;
  margin: 0;
  padding: 0;
`;

const LocationButton = styled(TouchableOpacity)<{ isSelected: boolean }>`
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
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

export interface LocationFieldProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * Location selection field with horizontal scrollable pills.
 *
 * @example
 * <LocationField
 *   selectedId={formData.locationId}
 *   onSelect={(id) => updateField('locationId', id)}
 * />
 */
export const LocationField: React.FC<LocationFieldProps> = ({
  selectedId,
  onSelect,
}) => {
  const { t } = useTranslation();

  return (
    <LocationScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 0 }}
    >
      {locations.map((location) => (
        <LocationButton
          key={location.id}
          isSelected={selectedId === location.id}
          onPress={() => onSelect(location.id)}
          activeOpacity={0.7}
        >
          <LocationText isSelected={selectedId === location.id}>
            {t(`locations.${location.id}`)}
          </LocationText>
        </LocationButton>
      ))}
    </LocationScrollView>
  );
};
