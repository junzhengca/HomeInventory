import React, { useCallback, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, TextInput, View } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useHome } from '../../hooks/useHome';
import { BottomSheetHeader, Button, FormSection, UncontrolledInput } from '../atoms';
import { StyledProps } from '../../utils/styledComponents';
import { useKeyboardVisibility } from '../../hooks/useKeyboardVisibility';

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

interface AddHomeBottomSheetProps {
    bottomSheetRef: React.RefObject<BottomSheetModal | null>;
    onHomeCreated?: () => void;
}

export const AddHomeBottomSheet: React.FC<AddHomeBottomSheetProps> = ({
    bottomSheetRef,
    onHomeCreated,
}) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { createHome } = useHome();
    const { isKeyboardVisible } = useKeyboardVisibility();
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const nameInputRef = useRef<TextInput>(null);
    const addressInputRef = useRef<TextInput>(null);

    const handleClose = useCallback(() => {
        Keyboard.dismiss();
        bottomSheetRef.current?.dismiss();
    }, [bottomSheetRef]);

    const handleSubmit = async () => {
        if (!name.trim()) return;

        setIsLoading(true);
        try {
            await createHome(name, address);

            // Clear inputs and state
            setName('');
            setAddress('');
            nameInputRef.current?.clear();
            addressInputRef.current?.clear();

            handleClose();
            onHomeCreated?.();
        } catch (error) {
            console.error('Failed to create home', error);
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
                label={t('home.create.submit')}
                onPress={handleSubmit}
                variant="primary"
                disabled={!name.trim() || isLoading}
                fullWidth
            />
        </FooterContainer>
    ), [insets.bottom, isKeyboardVisible, handleSubmit, name, isLoading]);

    // Estimated height of footer: 16px (top) + 16px (bottom) + 50px (button) = ~82px + inset
    // When keyboard is visible, safe area is removed, so we just use base height
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
                        title={t('home.create.title')}
                        subtitle={t('home.create.subtitle')}
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
