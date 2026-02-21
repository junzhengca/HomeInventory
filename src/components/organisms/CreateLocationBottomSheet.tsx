import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, TextInput } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { useLocations } from '../../store/hooks';
import { BottomSheetHeader, GlassButton, FormSection, UncontrolledInput } from '../atoms';
import { StyledProps } from '../../utils/styledComponents';
import { useKeyboardVisibility } from '../../hooks/useKeyboardVisibility';
import { uiLogger } from '../../utils/Logger';
import { IconSelector } from '../molecules/IconSelector';
import { categoryIcons } from '../../data/categoryIcons';

const ContentContainer = styled.View`
  flex: 1;
  border-top-left-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  border-top-right-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  overflow: hidden;
`;

const FormContainer = styled.View`
  flex-direction: column;
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const ErrorBanner = styled.View`
  background-color: ${({ theme }: StyledProps) => theme.colors.error};
  padding: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  margin-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.sm}px;
`;

const ErrorText = styled.Text`
  color: ${({ theme }: StyledProps) => theme.colors.surface};
  font-size: 12px;
`;

const FooterContainer = styled.View<{
    bottomInset: number;
    showSafeArea: boolean;
}>`
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  padding-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-bottom: ${({ bottomInset, showSafeArea, theme }: StyledProps & { bottomInset: number; showSafeArea: boolean }) =>
        showSafeArea ? bottomInset + theme.spacing.md : theme.spacing.md}px;
  shadow-color: #000;
  shadow-offset: 0px -2px;
  shadow-opacity: 0.03;
  shadow-radius: 4px;
  elevation: 2;
`;

export interface CreateLocationBottomSheetProps {
    bottomSheetRef: React.RefObject<BottomSheetModal | null>;
    onLocationCreated?: (locationId: string) => void;
    locationToEdit?: { id: string; name: string; icon: string } | null;
    onClose?: () => void;
}

export const CreateLocationBottomSheet: React.FC<CreateLocationBottomSheetProps> = ({
    bottomSheetRef,
    onLocationCreated,
    locationToEdit,
    onClose,
}) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    const { createLocation, addingLocation, error: locationsError, updateLocation, updatingLocationIds } = useLocations();
    const { isKeyboardVisible } = useKeyboardVisibility();

    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState<keyof typeof Ionicons.glyphMap>(categoryIcons[0]);
    const [localError, setLocalError] = useState<string | null>(null);

    const nameInputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (locationToEdit) {
            setName(locationToEdit.name);
            setSelectedIcon((locationToEdit.icon as keyof typeof Ionicons.glyphMap) || categoryIcons[0]);
        } else {
            setName('');
            setSelectedIcon(categoryIcons[0]);
        }
    }, [locationToEdit]);

    const handleClose = useCallback(() => {
        Keyboard.dismiss();
        bottomSheetRef.current?.dismiss();

        // Reset state on close
        setTimeout(() => {
            if (locationToEdit) {
                setName(locationToEdit.name);
                setSelectedIcon((locationToEdit.icon as keyof typeof Ionicons.glyphMap) || categoryIcons[0]);
            } else {
                setName('');
                setSelectedIcon(categoryIcons[0]);
            }
            setLocalError(null);
            nameInputRef.current?.clear();
        }, 300);
    }, [bottomSheetRef, locationToEdit]);

    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
                pressBehavior="close"
            />
        ),
        []
    );

    const displayError = localError || locationsError;

    const renderFooter = useCallback(() => {
        const handleSubmit = async () => {
            const trimmedName = name.trim();
            if (!trimmedName) {
                setLocalError(t('locations.errors.enterName'));
                return;
            }

            setLocalError(null);

            try {
                if (locationToEdit) {
                    updateLocation(locationToEdit.id, trimmedName, selectedIcon);
                } else {
                    createLocation(trimmedName, selectedIcon);
                }

                // Success handling will happen when 'addingLocation' or 'updatingLocationIds' turns false,
                // but since these don't return a promise in this hook design,
                // we'll optimistically close and let the list update via redux.
                handleClose();

                if (!locationToEdit) {
                    onLocationCreated?.('temp-id');
                }
            } catch (error) {
                uiLogger.error('Failed to save location', error);
                setLocalError(locationToEdit ? t('locations.errors.updateFailed') : t('locations.errors.createFailed'));
            }
        };

        const isSubmitting = locationToEdit ? updatingLocationIds.includes(locationToEdit.id) : addingLocation;

        return (
            <FooterContainer bottomInset={insets.bottom} showSafeArea={!isKeyboardVisible}>
                {displayError && (
                    <ErrorBanner style={{ marginBottom: 8 }}>
                        <ErrorText>{displayError}</ErrorText>
                    </ErrorBanner>
                )}
                <GlassButton
                    text={locationToEdit ? t('locations.edit.submit') : t('locations.create.submit')}
                    onPress={handleSubmit}
                    tintColor={theme.colors.primary}
                    textColor={theme.colors.surface}
                    disabled={!name.trim() || isSubmitting}
                    loading={isSubmitting}
                    icon="checkmark"
                    style={{ width: '100%' }}
                />
            </FooterContainer>
        );
    }, [
        insets.bottom,
        isKeyboardVisible,
        name,
        selectedIcon,
        addingLocation,
        displayError,
        createLocation,
        handleClose,
        onLocationCreated,
        t,
        theme,
        locationToEdit,
        updatingLocationIds,
        updateLocation
    ]);

    // Height considerations for the footer
    const footerHeight = 82 + (isKeyboardVisible ? 0 : insets.bottom);

    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            enableDynamicSizing={true}
            backdropComponent={renderBackdrop}
            enablePanDownToClose={true}
            handleComponent={null}
            android_keyboardInputMode="adjustResize"
            backgroundStyle={{ backgroundColor: theme.colors.background }}
            topInset={insets.top}
            stackBehavior="push"
            index={0}
            footerComponent={renderFooter}
            onChange={(index) => {
                if (index === -1) {
                    Keyboard.dismiss();
                    if (locationToEdit) {
                        setName(locationToEdit.name);
                        setSelectedIcon((locationToEdit.icon as keyof typeof Ionicons.glyphMap) || categoryIcons[0]);
                    } else {
                        setName('');
                        setSelectedIcon(categoryIcons[0]);
                    }
                    setLocalError(null);
                    nameInputRef.current?.clear();
                    onClose?.();
                }
            }}
        >
            <ContentContainer>
                <BottomSheetHeader
                    title={locationToEdit ? t('locations.edit.title') : t('locations.create.title')}
                    subtitle={locationToEdit ? t('locations.edit.subtitle') : t('locations.create.subtitle')}
                    onClose={handleClose}
                />
                <BottomSheetScrollView
                    contentContainerStyle={{ paddingBottom: footerHeight + 20 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <FormContainer>
                        <FormSection label={t('locations.create.nameLabel')}>
                            <UncontrolledInput
                                ref={nameInputRef}
                                defaultValue={name}
                                onChangeText={(text) => {
                                    setName(text);
                                    if (localError) setLocalError(null);
                                }}
                                onBlur={() => { }}
                                placeholder={t('locations.create.namePlaceholder')}
                                placeholderTextColor={theme.colors.textLight}
                                editable={!addingLocation}
                                autoFocus
                            />
                        </FormSection>

                        <FormSection label={t('locations.create.iconLabel')}>
                            <IconSelector
                                selectedIcon={selectedIcon}
                                onIconSelect={setSelectedIcon}
                                showLabel={false}
                            />
                        </FormSection>
                    </FormContainer>
                </BottomSheetScrollView>
            </ContentContainer>
        </BottomSheetModal>
    );
};
