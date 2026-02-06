import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, TextInput } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useHome } from '../../hooks/useHome';
import { useAuth } from '../../store/hooks';
import { BottomSheetHeader, Button, FormSection, UncontrolledInput } from '../atoms';
import { StyledProps } from '../../utils/styledComponents';
import { useKeyboardVisibility } from '../../hooks/useKeyboardVisibility';
import { Home } from '../../types/home';

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
    const { updateHome, syncHomes } = useHome();
    const { getApiClient, isAuthenticated } = useAuth();
    const { isKeyboardVisible } = useKeyboardVisibility();
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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

        setIsLoading(true);
        try {
            const success = await updateHome(home.id, { name, address });

            if (success) {
                // Trigger sync to push updates to server
                if (isAuthenticated) {
                    const apiClient = getApiClient();
                    if (apiClient) {
                        syncHomes(apiClient).catch((err: any) => console.error('Background sync failed:', err));
                    }
                }

                handleClose();
                onHomeUpdated?.();
            }
        } catch (error) {
            console.error('Failed to update home', error);
        } finally {
            setIsLoading(false);
        }
    };

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        []
    );

    const renderFooter = useCallback(() => (
        <FooterContainer bottomInset={insets.bottom} showSafeArea={!isKeyboardVisible}>
            <Button
                label={t('home.edit.submit')}
                onPress={handleSubmit}
                variant="primary"
                disabled={!name.trim() || isLoading}
                fullWidth
            />
        </FooterContainer>
    ), [insets.bottom, isKeyboardVisible, handleSubmit, name, isLoading]);

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
