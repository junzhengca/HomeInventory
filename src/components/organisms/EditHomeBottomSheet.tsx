import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, TextInput } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useHome } from '../../hooks/useHome';
import { useAuth } from '../../store/hooks';
import { BottomSheetHeader, Button, FormSection, UncontrolledInput } from '../atoms';
import { StyledProps } from '../../utils/styledComponents';
import { useKeyboardVisibility } from '../../hooks/useKeyboardVisibility';
import { Home } from '../../types/home';
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
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
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

interface EditHomeBottomSheetProps {
    bottomSheetRef: React.RefObject<BottomSheetModal | null>;
    home: Home | null;
    onHomeUpdated?: () => void;
}

export const EditHomeBottomSheet: React.FC<EditHomeBottomSheetProps> = ({
    bottomSheetRef,
    home,
    onHomeUpdated,
}) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { updateHome, loadingState } = useHome();
    const { getApiClient, isAuthenticated } = useAuth();
    const { isKeyboardVisible } = useKeyboardVisibility();
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');

    const nameInputRef = useRef<TextInput>(null);
    const addressInputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (home) {
            setName(home.name);
            setAddress(home.address || '');
        }
    }, [home]);

    const handleClose = useCallback(() => {
        Keyboard.dismiss();
        bottomSheetRef.current?.dismiss();
    }, [bottomSheetRef]);

    const handleSubmit = async () => {
        if (!name.trim() || !home) return;

        if (!isAuthenticated) {
            uiLogger.error('Cannot update home: user not authenticated');
            return;
        }

        const apiClient = getApiClient();
        if (!apiClient) {
            uiLogger.error('Cannot update home: API client not available');
            return;
        }

        try {
            const success = await updateHome(apiClient, home.id, { name, address });

            if (success) {
                handleClose();
                onHomeUpdated?.();
            }
        } catch (error) {
            uiLogger.error('Failed to update home', error);
        }
    };

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

    const isLoading = loadingState.operation === 'update' && loadingState.isLoading;
    const error = loadingState.operation === 'update' ? loadingState.error : null;

    const renderFooter = useCallback(() => (
        <FooterContainer bottomInset={insets.bottom} showSafeArea={!isKeyboardVisible}>
            {error && (
                <ErrorBanner style={{ marginBottom: 8 }}>
                    <ErrorText>{error}</ErrorText>
                </ErrorBanner>
            )}
            <Button
                label={t('home.edit.submit')}
                onPress={handleSubmit}
                variant="primary"
                disabled={!name.trim() || isLoading}
                fullWidth
            />
        </FooterContainer>
    ), [insets.bottom, isKeyboardVisible, handleSubmit, name, isLoading, error, t]);

    const footerHeight = 82 + (isKeyboardVisible ? 0 : insets.bottom);

    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            enableDynamicSizing={true}
            backdropComponent={renderBackdrop}
            enablePanDownToClose
            handleComponent={null}
            android_keyboardInputMode="adjustResize"
            backgroundStyle={{ backgroundColor: theme.colors.surface }}
            footerComponent={renderFooter}
            onDismiss={() => Keyboard.dismiss()}
        >
            <ContentContainer>
                <BottomSheetView style={{ paddingBottom: footerHeight }}>
                    <BottomSheetHeader
                        title={t('home.edit.title')}
                        subtitle={t('home.edit.subtitle')}
                        onClose={handleClose}
                    />
                    <FormContainer>
                        <FormSection label={t('home.create.nicknameLabel')}>
                            <UncontrolledInput
                                ref={nameInputRef}
                                defaultValue={name}
                                onChangeText={setName}
                                onBlur={() => { }}
                                placeholder={t('home.create.nicknamePlaceholder')}
                                placeholderTextColor={theme.colors.textLight}
                            />
                        </FormSection>
                        <FormSection label={t('home.create.addressLabel')}>
                            <UncontrolledInput
                                ref={addressInputRef}
                                defaultValue={address}
                                onChangeText={setAddress}
                                onBlur={() => { }}
                                placeholder={t('home.create.addressPlaceholder')}
                                placeholderTextColor={theme.colors.textLight}
                            />
                        </FormSection>
                    </FormContainer>
                </BottomSheetView>
            </ContentContainer>
        </BottomSheetModal>
    );
};
