import React, { useEffect } from 'react';
import { TouchableOpacity, ScrollView, View, Text } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import type {
    StyledProps,
} from '../../utils/styledComponents';
import type { Theme } from '../../theme/types';
import { useLocations } from '../../store/hooks';
import { getLocationDisplayName } from '../../utils/locationI18n';

const SelectorContainer = styled(View) <{ edgeToEdge?: boolean }>`
  flex-direction: column;
  ${({ edgeToEdge, theme }: StyledProps & { edgeToEdge?: boolean }) =>
        edgeToEdge ? `margin-horizontal: -${theme.spacing.md}px;` : ''}
`;

const LocationScrollView = styled(ScrollView).attrs(() => ({
    horizontal: true,
    showsHorizontalScrollIndicator: false,
}))`
  flex-grow: 0;
  overflow: shown;
`;

// Pill-shaped container
const LocationButton = styled(TouchableOpacity) <{ isSelected: boolean }>`
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-horizontal: 16px;
  padding-vertical: 12px;
  border-radius: 24px;
  width: 80px;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
  opacity: ${({ isSelected }: { isSelected: boolean }) => isSelected ? 1 : 0.5};

  /* Elevation for Android */
  elevation: ${({ isSelected }: { isSelected: boolean }) => (isSelected ? 4 : 0)};

  /* Shadow for iOS */
  shadow-color: #000;
  shadow-offset: 5px 5px;
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

export interface LocationSelectorProps {
    selectedLocationId: string | null;
    onSelect: (locationId: string | null) => void;
    showAllOption?: boolean;
    // Counts props are kept for interface compatibility but ignored in rendering as requested
    showCounts?: boolean;
    counts?: Record<string, number>;
    edgeToEdge?: boolean;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
    selectedLocationId,
    onSelect,
    showAllOption = false,
    edgeToEdge = false,
}) => {
    const { t } = useTranslation();
    const theme = useTheme() as Theme;
    const { locations, refreshLocations } = useLocations();

    // Load locations on mount
    useEffect(() => {
        refreshLocations();
    }, [refreshLocations]);

    // Scroll content padding uses theme spacing for consistency
    const scrollContentStyle = {
        paddingLeft: theme.spacing.md,
        paddingRight: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
    };

    return (
        <SelectorContainer edgeToEdge={edgeToEdge}>
            <LocationScrollView
                contentContainerStyle={scrollContentStyle}
            >
                {/* All Locations Option - Only if showAllOption is true */}
                {showAllOption && (
                    <LocationButton
                        isSelected={selectedLocationId === null}
                        onPress={() => onSelect(null)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="home-outline"
                            size={24}
                            color={theme.colors.primary}
                        />
                        <LocationLabel
                            isSelected={selectedLocationId === null}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {t('categories.all')}
                        </LocationLabel>
                    </LocationButton>
                )}

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
                            <LocationLabel
                                isSelected={isSelected}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {getLocationDisplayName(location, t)}
                            </LocationLabel>
                        </LocationButton>
                    );
                })}
            </LocationScrollView>
        </SelectorContainer>
    );
};
