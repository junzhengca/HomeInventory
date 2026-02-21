import React, { useCallback, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, TextInput } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useHome } from '../../hooks/useHome';
import { useAuth } from '../../store/hooks';
import { BottomSheetHeader, GlassButton, FormSection, UncontrolledInput } from '../atoms';
import { StyledProps } from '../../utils/styledComponents';
import { useKeyboardVisibility } from '../../hooks/useKeyboardVisibility';
import { uiLogger } from '../../utils/Logger';

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

interface AddHomeBottomSheetProps {
    bottomSheetRef: React.RefObject<BottomSheetModal | null>;
    onHomeCreated?: () => void;
    /**
     * If true, shows a special UI for when user has no homes and must create one.
     * This happens after deleting the last home.
     */
    isRequired?: boolean;
}

export const AddHomeBottomSheet: React.FC<AddHomeBottomSheetProps> = ({
    bottomSheetRef,
    onHomeCreated,
    isRequired = false,
}) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { createHome, loadingState } = useHome();
    const { getApiClient, isAuthenticated } = useAuth();
    const { isKeyboardVisible } = useKeyboardVisibility();
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');

    const nameInputRef = useRef<TextInput>(null);
    const addressInputRef = useRef<TextInput>(null);

    // Use different translation keys based on whether this is required (no home) or optional
    const titleKey = isRequired ? 'home.createRequired.title' : 'home.create.title';
    const subtitleKey = isRequired ? 'home.createRequired.subtitle' : 'home.create.subtitle';
    const nicknameLabelKey = isRequired ? 'home.createRequired.nicknameLabel' : 'home.create.nicknameLabel';
    const nicknamePlaceholderKey = isRequired ? 'home.createRequired.nicknamePlaceholder' : 'home.create.nicknamePlaceholder';
    const addressLabelKey = isRequired ? 'home.createRequired.addressLabel' : 'home.create.addressLabel';
    const addressPlaceholderKey = isRequired ? 'home.createRequired.addressPlaceholder' : 'home.create.addressPlaceholder';
    const submitKey = isRequired ? 'home.createRequired.submit' : 'home.create.submit';

    const handleClose = useCallback(() => {
        Keyboard.dismiss();
        bottomSheetRef.current?.dismiss();
    }, [bottomSheetRef]);

    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        []
    );

    const isLoading = loadingState.operation === 'create' && loadingState.isLoading;
    const error = loadingState.operation === 'create' ? loadingState.error : null;

    const renderFooter = useCallback(() => {
        const handleSubmit = async () => {
            if (!name.trim()) return;

            if (!isAuthenticated) {
                uiLogger.error('Cannot create home: user not authenticated');
                return;
            }

            const apiClient = getApiClient();
            if (!apiClient) {
                uiLogger.error('Cannot create home: API client not available');
                return;
            }

            try {
                await createHome(apiClient, name, address);

                // Clear inputs and state
                setName('');
                setAddress('');
                nameInputRef.current?.clear();
                addressInputRef.current?.clear();

                handleClose();
                onHomeCreated?.();
            } catch (error) {
                uiLogger.error('Failed to create home', error);
            }
        };

        return (
            <FooterContainer bottomInset={insets.bottom} showSafeArea={!isKeyboardVisible}>
                {error && (
                    <ErrorBanner style={{ marginBottom: 8 }}>
                        <ErrorText>{error}</ErrorText>
                    </ErrorBanner>
                )}
                <GlassButton
                    text={t(submitKey)}
                    onPress={handleSubmit}
                    tintColor={theme.colors.primary}
                    textColor={theme.colors.surface}
                    disabled={!name.trim() || isLoading}
                    loading={isLoading}
                    icon="checkmark"
                    style={{ width: '100%' }}
                />
            </FooterContainer>
        );
    }, [insets.bottom, isKeyboardVisible, isAuthenticated, getApiClient, createHome, name, address, error, isLoading, handleClose, onHomeCreated, nameInputRef, addressInputRef, t, submitKey, theme]);

    // Estimated height of footer: 16px (top) + 16px (bottom) + 50px (button) = ~82px + inset
    // When keyboard is visible, safe area is removed, so we just use base height
    const footerHeight = 82 + (isKeyboardVisible ? 0 : insets.bottom);

    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            enableDynamicSizing={true}
            backdropComponent={renderBackdrop}
            enablePanDownToClose={!isRequired}
            handleComponent={null}
            android_keyboardInputMode="adjustResize"
            backgroundStyle={{ backgroundColor: theme.colors.background }}
            footerComponent={renderFooter}
            onDismiss={() => Keyboard.dismiss()}
        >
            <ContentContainer>
                <BottomSheetView style={{ paddingBottom: footerHeight }}>
                    <BottomSheetHeader
                        title={t(titleKey)}
                        subtitle={t(subtitleKey)}
                        onClose={isRequired ? undefined : handleClose} // No close button if required
                    />
                    <FormContainer>
                        <FormSection label={t(nicknameLabelKey)}>
                            <UncontrolledInput
                                ref={nameInputRef}
                                defaultValue={name}
                                onChangeText={setName}
                                onBlur={() => { }}
                                placeholder={t(nicknamePlaceholderKey)}
                                placeholderTextColor={theme.colors.textLight}
                                editable={!isLoading}
                            />
                        </FormSection>
                        <FormSection label={t(addressLabelKey)}>
                            <UncontrolledInput
                                ref={addressInputRef}
                                defaultValue={address}
                                onChangeText={setAddress}
                                onBlur={() => { }}
                                placeholder={t(addressPlaceholderKey)}
                                placeholderTextColor={theme.colors.textLight}
                                editable={!isLoading}
                            />
                        </FormSection>
                    </FormContainer>
                </BottomSheetView>
            </ContentContainer>
        </BottomSheetModal>
    );
};
