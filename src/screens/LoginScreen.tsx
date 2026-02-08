import React, { useCallback, useRef, useEffect } from 'react';
import { View, Text, Alert, Platform } from 'react-native';
import styled from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { StatusBar } from 'expo-status-bar';

import type { StyledProps } from '../utils/styledComponents';
import { uiLogger } from '../utils/Logger';
import {
    LoginBottomSheet,
    SignupBottomSheet,
    Button,
} from '../components';
import { useAuth, useSettings } from '../store/hooks';
import { signInWithGoogle } from '../services/GoogleAuthService';
import { useTheme } from '../theme/ThemeProvider';

const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
  justify-content: center;
  align-items: center;
`;

const Content = styled(View)`
  width: 100%;
  padding: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  align-items: center;
`;

const LogoContainer = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xxl}px;
  align-items: center;
`;

const AppTitle = styled(Text)`
  font-size: 40px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.primary};
  margin-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
  letter-spacing: 1px;
`;

const AppSubtitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  text-align: center;
`;

const AuthSection = styled(View)`
  width: 100%;
  padding: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.1;
  shadow-radius: 12px;
  elevation: 5;
`;

const AuthTitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.xl}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  text-align: center;
`;

const AuthSubtitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  text-align: center;
  line-height: 22px;
`;

const AuthButtonContainer = styled(View)`
  width: 100%;
  align-items: center;
`;

const ButtonWrapper = styled(View)`
  width: 100%;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const BackgroundGradient = styled(View)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const Circle = styled(View) <{ size: number; color: string; top?: number; left?: number; right?: number; bottom?: number; opacity?: number }>`
  position: absolute;
  width: ${({ size }: { size: number }) => size}px;
  height: ${({ size }: { size: number }) => size}px;
  border-radius: ${({ size }: { size: number }) => size / 2}px;
  background-color: ${({ color }: { color: string }) => color};
  top: ${({ top }: { top?: number }) => (top !== undefined ? `${top}%` : 'auto')};
  left: ${({ left }: { left?: number }) => (left !== undefined ? `${left}%` : 'auto')};
  right: ${({ right }: { right?: number }) => (right !== undefined ? `${right}%` : 'auto')};
  bottom: ${({ bottom }: { bottom?: number }) => (bottom !== undefined ? `${bottom}%` : 'auto')};
  opacity: ${({ opacity }: { opacity?: number }) => opacity || 0.1};
`;

export const LoginScreen: React.FC = () => {
    const { error, isLoading, googleLogin } = useAuth();
    const { settings } = useSettings();
    const isDark = settings?.darkMode;
    const { t } = useTranslation();
    const theme = useTheme();

    const loginBottomSheetRef = useRef<BottomSheetModal | null>(null);
    const signupBottomSheetRef = useRef<BottomSheetModal | null>(null);

    const handleLoginPress = useCallback(() => {
        signupBottomSheetRef.current?.dismiss();
        loginBottomSheetRef.current?.present();
    }, []);

    const handleSignupPress = useCallback(() => {
        loginBottomSheetRef.current?.dismiss();
        signupBottomSheetRef.current?.present();
    }, []);

    const handleLoginSuccess = useCallback(() => {
        // User will be automatically updated via auth state and App.tsx will navigate
    }, []);

    const handleSignupSuccess = useCallback(() => {
        // User will be automatically updated via auth state and App.tsx will navigate
    }, []);

    const handleGoogleLogin = useCallback(async () => {
        try {
            const idToken = await signInWithGoogle();
            if (idToken) {
                // Get platform (ios or android)
                const platform = Platform.OS === 'ios' ? 'ios' : 'android';

                // Call googleLogin hook which will dispatch the action
                googleLogin(idToken, platform);

                // Close bottom sheets if open
                loginBottomSheetRef.current?.dismiss();
                signupBottomSheetRef.current?.dismiss();
            }
        } catch (error) {
            uiLogger.error('Google login error', error);
            Alert.alert(
                t('login.errors.googleLoginFailed.title') || 'Google Login Failed',
                error instanceof Error ? error.message : t('login.errors.googleLoginFailed.message') || 'Failed to sign in with Google. Please try again.'
            );
        }
    }, [t, googleLogin]);

    // Handle auth errors from Google login
    useEffect(() => {
        if (error && !isLoading) {
            // Check if error is related to Google login (409 conflict or other auth errors)
            let errorMessage = error;
            let errorTitle = t('login.errors.googleLoginFailed.title') || 'Google Login Failed';

            if (error.includes('Email already registered with email/password')) {
                errorMessage = t('login.errors.emailAlreadyRegistered.message') || 'Email already registered with email/password. Please login with email and password.';
                errorTitle = t('login.errors.emailAlreadyRegistered.title') || 'Account Already Exists';
            } else if (error.includes('Invalid Google account')) {
                errorMessage = t('login.errors.invalidGoogleAccount.message') || 'Invalid Google account. Please try again.';
            }

            // We only show alert if it's not a generic "Login failed" which might be shown by the form itself
            // But here we are on the main screen, so we might want to show it.
            // However, LoginBottomSheet handles its own errors.
            // Google login happens here, so we should show it.
            if (isLoading) return; // Don't show if still loading

            // Only show if it matches google login error patterns or if we are not in a modal
            if (
                error.includes('Google') ||
                error.includes('Email already registered')
            ) {
                Alert.alert(errorTitle, errorMessage);
            }
        }
    }, [error, isLoading, t]);

    return (
        <Container>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <BackgroundGradient>
                <Circle size={300} color={theme.colors.primary} top={-10} left={-20} opacity={0.05} />
                <Circle size={200} color={theme.colors.secondary} bottom={10} right={-10} opacity={0.05} />
                <Circle size={150} color={theme.colors.primary} top={40} right={-10} opacity={0.03} />
            </BackgroundGradient>

            <Content>
                <LogoContainer>
                    {/* We can add a Logo image here later */}
                    <AppTitle>Cluttr</AppTitle>
                    <AppSubtitle>{t('onboarding.welcome')}</AppSubtitle>
                </LogoContainer>

                <AuthSection>
                    <AuthTitle>{t('profile.auth.title')}</AuthTitle>
                    <AuthSubtitle>{t('profile.auth.subtitle')}</AuthSubtitle>

                    <AuthButtonContainer>
                        <ButtonWrapper>
                            <Button
                                onPress={handleLoginPress}
                                label={t('login.submit')}
                                icon="log-in"
                                variant="primary"
                            />
                        </ButtonWrapper>
                        <ButtonWrapper>
                            <Button
                                onPress={handleSignupPress}
                                label={t('signup.submit')}
                                icon="person-add"
                                variant="secondary"
                            />
                        </ButtonWrapper>
                        <ButtonWrapper>
                            <Button
                                onPress={handleGoogleLogin}
                                label={t('login.loginWithGoogle')}
                                icon="logo-google"
                                variant="secondary"
                            />
                        </ButtonWrapper>
                    </AuthButtonContainer>
                </AuthSection>
            </Content>

            <LoginBottomSheet
                bottomSheetRef={loginBottomSheetRef}
                onSignupPress={handleSignupPress}
                onLoginSuccess={handleLoginSuccess}
            />
            <SignupBottomSheet
                bottomSheetRef={signupBottomSheetRef}
                onLoginPress={handleLoginPress}
                onSignupSuccess={handleSignupSuccess}
            />
        </Container>
    );
};
