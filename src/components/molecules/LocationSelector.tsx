import React, { useEffect, useState } from 'react';
import { TouchableOpacity, ScrollView, View, Text, Alert, Keyboard } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import type {
    StyledProps,
} from '../../utils/styledComponents';
import type { Theme } from '../../theme/types';
import { useLocations } from '../../store/hooks';
import { getLocationDisplayName, DEFAULT_LOCATION_IDS } from '../../utils/locationI18n';
import { CreateLocationBottomSheet } from '../organisms/CreateLocationBottomSheet';
import { ContextMenu } from '../organisms/ContextMenu/ContextMenu';

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
  shadow-offset: 0px 2px;
  shadow-opacity: ${({ isSelected }: { isSelected: boolean }) => (isSelected ? 0.1 : 0)};
  shadow-radius: 2px;
`;

const LocationLabel = styled(Text) <{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  text-align: center;
`;

const CreateLocationButton = styled(TouchableOpacity)`
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  width: 80px;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
  align-self: stretch;
`;


export interface LocationSelectorProps {
    selectedLocationId: string | null;
    onSelect: (locationId: string | null) => void;
    showAllOption?: boolean;
    // Counts props are kept for interface compatibility but ignored in rendering as requested
    showCounts?: boolean;
    counts?: Record<string, number>;
    edgeToEdge?: boolean;
    onOpeningNestedModal?: (isOpening: boolean) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
    selectedLocationId,
    onSelect,
    showAllOption = false,
    edgeToEdge = false,
    onOpeningNestedModal,
}) => {
    const { t } = useTranslation();
    const theme = useTheme() as Theme;
    const { locations, refreshLocations, deleteLocation } = useLocations();
    const bottomSheetRef = React.useRef<BottomSheetModal>(null);
    const [locationToEdit, setLocationToEdit] = useState<{ id: string; name: string; icon: string } | null>(null);

    // Load locations on mount
    useEffect(() => {
        refreshLocations();
    }, [refreshLocations]);

    const handleEditLocation = (location: any) => {
        Keyboard.dismiss();
        onOpeningNestedModal?.(true);
        setLocationToEdit({
            id: location.id,
            name: location.name,
            icon: location.icon || 'location-outline'
        });
        bottomSheetRef.current?.present();
    };

    const confirmDeleteLocation = (location: any) => {
        Alert.alert(
            t('locations.delete.title'),
            t('locations.delete.message'),
            [
                { text: t('locations.delete.cancel'), style: 'cancel' },
                {
                    text: t('locations.delete.confirm'),
                    style: 'destructive',
                    onPress: () => deleteLocation(location.id),
                },
            ],
            { cancelable: true }
        );
    };

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
                    const isDefault = DEFAULT_LOCATION_IDS.has(location.id);
                    const menuItems = [
                        {
                            id: 'edit',
                            label: t('itemDetails.actions.modify'),
                            icon: 'pencil-outline',
                            onPress: () => handleEditLocation(location),
                            disabled: isDefault,
                        },
                        {
                            id: 'delete',
                            label: t('common.delete'),
                            icon: 'trash-can-outline',
                            onPress: () => confirmDeleteLocation(location),
                            isDestructive: true,
                        },
                    ];

                    return (
                        <ContextMenu key={location.id} items={menuItems}>
                            <LocationButton
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
                        </ContextMenu>
                    );
                })}
                {/* Add New Location Option */}
                <CreateLocationButton
                    onPress={() => {
                        Keyboard.dismiss();
                        onOpeningNestedModal?.(true);
                        setLocationToEdit(null);
                        bottomSheetRef.current?.present();
                    }}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="add"
                        size={32}
                        color={theme.colors.textSecondary}
                    />
                </CreateLocationButton>
            </LocationScrollView>

            {/* Create Location Modal - do not change selection when a new location is created */}
            <CreateLocationBottomSheet
                bottomSheetRef={bottomSheetRef}
                locationToEdit={locationToEdit}
                onClose={() => onOpeningNestedModal?.(false)}
            />
        </SelectorContainer>
    );
};
