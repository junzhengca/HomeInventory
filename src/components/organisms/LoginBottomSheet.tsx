import React, { useState, useCallback, useMemo, useEffect, memo, useRef } from 'react';
import { TouchableOpacity, View, Text, Keyboard, TextInput } from 'react-native';
import styled from 'styled-components/native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetTextInput, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import type { StyledProps } from '../../utils/styledComponents';
import { useAuth, useAppDispatch } from '../../store/hooks';
import { useKeyboardVisibility } from '../../hooks/useKeyboardVisibility';
import { setError } from '../../store/slices/authSlice';
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



export interface LoginBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  onSignupPress?: () => void;
  onLoginSuccess?: () => void;
}

export const LoginBottomSheet: React.FC<LoginBottomSheetProps> = ({
  bottomSheetRef,
  onSignupPress,
  onLoginSuccess,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { login, error: authError, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [loginAttempted, setLoginAttempted] = useState(false);
  const { isKeyboardVisible } = useKeyboardVisibility();
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

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

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    bottomSheetRef.current?.dismiss();
    setEmail('');
    setPassword('');
    setLocalError(null);
    setLoginAttempted(false);
    emailInputRef.current?.clear();
    passwordInputRef.current?.clear();
  }, [bottomSheetRef]);

  // Stable onChangeText handlers to prevent IME composition interruption
  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    if (localError || authError) {
      setLocalError(null);
      dispatch(setError(null));
    }
  }, [localError, authError, dispatch]);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
    if (localError || authError) {
      setLocalError(null);
      dispatch(setError(null));
    }
  }, [localError, authError, dispatch]);

  const handleSubmit = useCallback(() => {
    if (!email.trim() || !password.trim()) {
      setLocalError(t('login.errors.emptyFields'));
      return;
    }

    setLocalError(null);
    setLoginAttempted(true);
    login(email.trim(), password);
  }, [email, password, login, t]);

  // Watch for authentication success or failure
  useEffect(() => {
    if (loginAttempted && !authLoading) {
      if (!authError) {
        // Login was successful
        handleClose();
        // Call onLoginSuccess callback after successful login
        if (onLoginSuccess) {
          // Small delay to ensure login modal is closed
          setTimeout(() => {
            onLoginSuccess();
          }, 300);
        }
      }
      // If there's an error, it will be displayed via displayError
    }
  }, [loginAttempted, authLoading, authError, handleClose, onLoginSuccess]);

  const handleSignupPress = useCallback(() => {
    handleClose();
    if (onSignupPress) {
      onSignupPress();
    }
  }, [handleClose, onSignupPress]);

  const renderFooter = useCallback(
    () => (
      <FooterContainer
        bottomInset={insets.bottom}
        showSafeArea={!isKeyboardVisible}
      >
        <Button
          label={authLoading ? t('login.submitting') : t('login.submit')}
          onPress={handleSubmit}
          variant="primary"
          icon={<Ionicons name="log-in" size={18} color={theme.colors.surface} />}
          disabled={authLoading}
          fullWidth={true}
        />
      </FooterContainer>
    ),
    [handleSubmit, authLoading, theme, t, isKeyboardVisible, insets.bottom]
  );

  // Combine local and auth errors for display
  const displayError = localError || authError;

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
            title={t('login.title')}
            subtitle={t('login.subtitle')}
            onClose={handleClose}
          />

          <View style={{ paddingHorizontal: theme.spacing.md }}>


            <FormSection label={t('login.fields.email')}>
              <UncontrolledInput
                ref={emailInputRef}
                defaultValue={email}
                onChangeText={handleEmailChange}
                onBlur={() => { }}
                placeholder={t('login.placeholders.email')}
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="email-address"
              />
            </FormSection>

            <FormSection label={t('login.fields.password')}>
              <UncontrolledInput
                ref={passwordInputRef}
                defaultValue={password}
                onChangeText={handlePasswordChange}
                onBlur={() => { }}
                onSubmitEditing={handleSubmit}
                placeholder={t('login.placeholders.password')}
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="default"
                secureTextEntry={true}
                error={!!displayError}
                errorMessage={displayError || undefined}
              />
            </FormSection>

            <LinkButton onPress={handleSignupPress}>
              <LinkText>{t('login.link')}</LinkText>
            </LinkButton>
          </View>
        </BottomSheetView>
      </ContentContainer>
    </BottomSheetModal>
  );
};

