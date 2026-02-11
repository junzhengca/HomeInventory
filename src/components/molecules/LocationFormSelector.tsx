import React from 'react';
import { TouchableOpacity, ScrollView, View, Text } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import type {
    StyledProps,
    StyledPropsWith,
} from '../../utils/styledComponents';
import { locations } from '../../data/locations';
import type { Theme } from '../../theme/types';

/**
 * Container with negative horizontal margins to enable edge-to-edge scrolling.
 * The ScrollView's contentContainerStyle adds horizontal padding to restore
 * proper spacing while allowing content to scroll to the screen edges.
 */
const SelectorContainer = styled(View) <{ horizontalPadding: number }>`
  flex-direction: column;
  margin-horizontal: -${({ horizontalPadding }: { horizontalPadding: number }) => horizontalPadding}px;
`;

const LocationScrollView = styled(ScrollView).attrs(() => ({
    horizontal: true,
    showsHorizontalScrollIndicator: false,
}))`
  flex-grow: 0;
`;

// Pill-shaped item container - Matches LocationSelector style
const LocationButton = styled(TouchableOpacity) <{ isSelected: boolean }>`
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-horizontal: 16px;
  padding-vertical: 12px;
  border-radius: 24px;
  min-width: 85px;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  opacity: ${({ isSelected }: { isSelected: boolean }) => isSelected ? 1 : 0.5};

  /* Elevation for Android */
  elevation: ${({ isSelected }: { isSelected: boolean }) => (isSelected ? 4 : 0)};

  /* Shadow for iOS */
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: ${({ isSelected }: { isSelected: boolean }) => (isSelected ? 0.1 : 0)};
  shadow-radius: 4px;
`;

const LocationLabel = styled(Text) <{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  text-align: center;
`;

export interface LocationFormSelectorProps {
    selectedLocationId: string;
    onSelect: (locationId: string) => void;
}

/**
 * Location selector for item forms with edge-to-edge scrolling.
 * Displays locations as pill-shaped buttons with icon and text.
 */
export const LocationFormSelector: React.FC<LocationFormSelectorProps> = ({
    selectedLocationId,
    onSelect,
}) => {
    const { t } = useTranslation();
    const theme = useTheme() as Theme;

    const horizontalPadding = theme.spacing.md;

    const scrollContentStyle = {
        paddingLeft: horizontalPadding,
        paddingRight: horizontalPadding,
        paddingVertical: theme.spacing.xs,
    };

    return (
        <SelectorContainer horizontalPadding={horizontalPadding}>
            <LocationScrollView contentContainerStyle={scrollContentStyle}>
                {locations.map((location) => {
                    const isSelected = selectedLocationId === location.id;
                    return (
                        <LocationButton
                            key={location.id}
                            isSelected={isSelected}
                            onPress={() => onSelect(location.id)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={(location.icon || 'location-outline') as keyof typeof Ionicons.glyphMap}
                                size={24}
                                color={theme.colors.primary}
                            />
                            <LocationLabel isSelected={isSelected}>
                                {t(`locations.${location.id}`)}
                            </LocationLabel>
                        </LocationButton>
                    );
                })}
            </LocationScrollView>
        </SelectorContainer>
    );
};
