import React, { useState, useCallback, useMemo, useEffect, memo, useRef } from 'react';
import { TouchableOpacity, View, Text, Keyboard, TextInput } from 'react-native';
import styled from 'styled-components/native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetTextInput, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import type { StyledProps } from '../../utils/styledComponents';
import { useAuth } from '../../store/hooks';
import { useKeyboardVisibility } from '../../hooks/useKeyboardVisibility';
import { BottomSheetHeader, UncontrolledInput, FormSection, Button } from '../atoms';


const ContentContainer = styled.View`
  flex: 1;
  border-top-left-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  border-top-right-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  overflow: hidden;
`;

const FooterContainer = styled(View) <{
  bottomInset: number;
  showSafeArea: boolean;
}>`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-bottom: ${({ bottomInset, showSafeArea, theme }: any) =>
    showSafeArea ? bottomInset + theme.spacing.md : theme.spacing.md}px;
  border-top-width: 1px;
  border-top-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  shadow-color: #000;
  shadow-offset: 0px -4px;
  shadow-opacity: 0.05;
  shadow-radius: 12px;
  elevation: 8;
`;

const LinkText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.primary};
  text-align: center;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const LinkButton = styled(TouchableOpacity)`
  margin-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;



export interface SignupBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  onLoginPress?: () => void;
  onSignupSuccess?: () => void;
}

export const SignupBottomSheet: React.FC<SignupBottomSheetProps> = ({
  bottomSheetRef,
  onLoginPress,
  onSignupSuccess,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isKeyboardVisible } = useKeyboardVisibility();
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const renderBackdrop = useCallback(
    (props: Parameters<typeof BottomSheetBackdrop>[0]) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  // Stable onChangeText handlers to prevent IME composition interruption
  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
  }, []);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
  }, []);

  const handleConfirmPasswordChange = useCallback((text: string) => {
    setConfirmPassword(text);
  }, []);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    bottomSheetRef.current?.dismiss();
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    emailInputRef.current?.clear();
    passwordInputRef.current?.clear();
    confirmPasswordInputRef.current?.clear();
  }, [bottomSheetRef]);

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError(t('signup.errors.emptyFields'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('signup.errors.passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('signup.errors.passwordTooShort'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signup(email.trim(), password);
      handleClose();
      // Call onSignupSuccess callback after successful signup
      if (onSignupSuccess) {
        // Small delay to ensure signup modal is closed
        setTimeout(() => {
          onSignupSuccess();
        }, 300);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('signup.errors.failed');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, confirmPassword, signup, handleClose, onSignupSuccess, t]);

  const handleLoginPress = useCallback(() => {
    handleClose();
    if (onLoginPress) {
      onLoginPress();
    }
  }, [handleClose, onLoginPress]);

  const renderFooter = useCallback(
    () => (
      <FooterContainer
        bottomInset={insets.bottom}
        showSafeArea={!isKeyboardVisible}
      >
        <Button
          label={isLoading ? t('signup.submitting') : t('signup.submit')}
          onPress={handleSubmit}
          variant="primary"
          icon={<Ionicons name="person-add" size={18} color={theme.colors.surface} />}
          disabled={isLoading}
          fullWidth={true}
        />
      </FooterContainer>
    ),
    [handleSubmit, isLoading, theme, t, isKeyboardVisible, insets.bottom]
  );

  // Calculate footer height: button height (approx 50) + vertical padding (32) + safe area
  const footerHeight = 82 + (isKeyboardVisible ? 0 : insets.bottom);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing={true}
      handleComponent={null}
      enablePanDownToClose={true}
      onDismiss={handleClose}
      backdropComponent={renderBackdrop}
      android_keyboardInputMode="adjustResize"
      footerComponent={renderFooter}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
    >
      <ContentContainer>
        <BottomSheetView style={{ paddingBottom: footerHeight }}>
          <BottomSheetHeader
            title={t('signup.title')}
            subtitle={t('signup.subtitle')}
            onClose={handleClose}
          />

          <View style={{ paddingHorizontal: theme.spacing.md }}>


            <FormSection label={t('signup.fields.email')}>
              <UncontrolledInput
                ref={emailInputRef}
                defaultValue={email}
                onChangeText={handleEmailChange}
                onBlur={() => { }}
                placeholder={t('signup.placeholders.email')}
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="email-address"
              />
            </FormSection>

            <FormSection label={t('signup.fields.password')}>
              <UncontrolledInput
                ref={passwordInputRef}
                defaultValue={password}
                onChangeText={handlePasswordChange}
                onBlur={() => { }}
                placeholder={t('signup.placeholders.password')}
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="default"
                secureTextEntry={true}
              />
            </FormSection>

            <FormSection label={t('signup.fields.confirmPassword')}>
              <UncontrolledInput
                ref={confirmPasswordInputRef}
                defaultValue={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                onBlur={() => { }}
                onSubmitEditing={handleSubmit}
                placeholder={t('signup.placeholders.confirmPassword')}
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="default"
                secureTextEntry={true}
                error={!!error}
                errorMessage={error || undefined}
              />
            </FormSection>

            <LinkButton onPress={handleLoginPress}>
              <LinkText>{t('signup.link')}</LinkText>
            </LinkButton>
          </View>
        </BottomSheetView>
      </ContentContainer>
    </BottomSheetModal>
  );
};

