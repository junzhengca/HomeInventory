import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    TouchableOpacity,
    TextInput,
    Image,
} from 'react-native';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { StyledProps } from '../utils/styledComponents';
import { uiLogger } from '../utils/Logger';
import { AuthTextInput, Button } from '../components';
import { useAuth, useSettings, useAppDispatch } from '../store/hooks';
import { setError } from '../store/slices/authSlice';
import { googleAuthService } from '../services/GoogleAuthService';
import { useTheme } from '../theme/ThemeProvider';
import type { AuthStackParamList } from '../navigation/AuthNavigator';

const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const ScrollContent = styled(ScrollView).attrs({
    contentContainerStyle: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    keyboardShouldPersistTaps: 'handled',
})`
  flex: 1;
`;

const Content = styled(View)`
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  align-items: center;
`;

const LogoContainer = styled(View)`
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const MascotPlaceholder = styled(View)`
  width: 120px;
  height: 120px;
  border-radius: 28px;
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryLightest};
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const TitleText = styled(Text)`
  font-size: 28px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  text-align: center;
`;

const SubtitleText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  text-align: center;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const FormContainer = styled(View)`
  width: 100%;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const InputSpacing = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const ForgotPasswordRow = styled(View)`
  align-items: flex-end;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const ForgotPasswordText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.primary};
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
`;

const ButtonContainer = styled(View)`
  width: 100%;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const SwitchRow = styled(View)`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const SwitchText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

const SwitchLinkText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  margin-left: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const DividerRow = styled(View)`
  flex-direction: row;
  align-items: center;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const DividerLine = styled(View)`
  flex: 1;
  height: 1px;
  background-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
`;

const DividerText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.xs}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const SocialRow = styled(View)`
  flex-direction: row;
  justify-content: center;
  gap: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const SocialButton = styled(TouchableOpacity)`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  align-items: center;
  justify-content: center;
`;

export const LoginScreen: React.FC = () => {
    const { t } = useTranslation();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const dispatch = useAppDispatch();
    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
    const { settings } = useSettings();
    const isDark = settings?.darkMode;
    const { login, googleLogin, error: authError, isLoading: authLoading } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);
    const [loginAttempted, setLoginAttempted] = useState(false);

    const passwordRef = useRef<TextInput>(null);

    const handleEmailChange = useCallback(
        (text: string) => {
            setEmail(text);
            if (localError || authError) {
                setLocalError(null);
                dispatch(setError(null));
            }
        },
        [localError, authError, dispatch],
    );

    const handlePasswordChange = useCallback(
        (text: string) => {
            setPassword(text);
            if (localError || authError) {
                setLocalError(null);
                dispatch(setError(null));
            }
        },
        [localError, authError, dispatch],
    );

    const handleSubmit = useCallback(() => {
        if (!email.trim() || !password.trim()) {
            setLocalError(t('login.errors.emptyFields'));
            return;
        }

        setLocalError(null);
        setLoginAttempted(true);
        login(email.trim(), password);
    }, [email, password, login, t]);

    // Watch for login success
    useEffect(() => {
        if (loginAttempted && !authLoading) {
            if (!authError) {
                // Login successful - navigation handled by _layout.tsx
            }
        }
    }, [loginAttempted, authLoading, authError]);

    const handleGoogleLogin = useCallback(async () => {
        try {
            const idToken = await googleAuthService.signInWithGoogle();
            if (idToken) {
                const platform = Platform.OS === 'ios' ? 'ios' : 'android';
                googleLogin(idToken, platform);
            }
        } catch (error) {
            uiLogger.error('Google login error', error);
            Alert.alert(
                t('login.errors.googleLoginFailed.title') || 'Google Login Failed',
                error instanceof Error
                    ? error.message
                    : t('login.errors.googleLoginFailed.message') || 'Failed to sign in with Google.',
            );
        }
    }, [t, googleLogin]);

    // Handle auth errors from Google login
    useEffect(() => {
        if (authError && !authLoading) {
            let errorMessage = authError;
            let errorTitle = t('login.errors.googleLoginFailed.title') || 'Google Login Failed';

            if (authError.includes('Email already registered with email/password')) {
                errorMessage =
                    t('login.errors.emailAlreadyRegistered.message') ||
                    'Email already registered with email/password.';
                errorTitle =
                    t('login.errors.emailAlreadyRegistered.title') || 'Account Already Exists';
            } else if (authError.includes('Invalid Google account')) {
                errorMessage =
                    t('login.errors.invalidGoogleAccount.message') || 'Invalid Google account.';
            }

            if (
                authError.includes('Google') ||
                authError.includes('Email already registered')
            ) {
                Alert.alert(errorTitle, errorMessage);
            }
        }
    }, [authError, authLoading, t]);

    const displayError = localError || authError;

    return (
        <Container>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollContent
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: 'center',
                        paddingTop: insets.top + 20,
                        paddingBottom: insets.bottom + 20,
                    }}
                >
                    <Content>
                        <LogoContainer>
                            <MascotPlaceholder>
                                <Image
                                    source={require('../../assets/logo-transparent.png')}
                                    style={{ width: 80, height: 80 }}
                                    resizeMode="contain"
                                />
                            </MascotPlaceholder>
                            <TitleText>{t('onboarding.joinTitle')}</TitleText>
                            <SubtitleText>{t('onboarding.joinSubtitle')}</SubtitleText>
                        </LogoContainer>

                        <FormContainer>
                            <InputSpacing>
                                <AuthTextInput
                                    icon="mail-outline"
                                    placeholder={t('login.placeholders.email')}
                                    value={email}
                                    onChangeText={handleEmailChange}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                />
                            </InputSpacing>

                            <InputSpacing>
                                <AuthTextInput
                                    ref={passwordRef}
                                    icon="lock-closed-outline"
                                    placeholder={t('login.placeholders.password')}
                                    value={password}
                                    onChangeText={handlePasswordChange}
                                    secureTextEntry
                                    returnKeyType="go"
                                    onSubmitEditing={handleSubmit}
                                    error={!!displayError}
                                    errorMessage={displayError || undefined}
                                />
                            </InputSpacing>

                            <ForgotPasswordRow>
                                <TouchableOpacity>
                                    <ForgotPasswordText>{t('login.forgotPassword')}</ForgotPasswordText>
                                </TouchableOpacity>
                            </ForgotPasswordRow>

                            <ButtonContainer>
                                <Button
                                    label={authLoading ? t('login.submitting') : t('login.submit')}
                                    onPress={handleSubmit}
                                    variant="primary"
                                    icon="arrow-forward"
                                    disabled={authLoading}
                                    fullWidth
                                    useGlass={false}
                                />
                            </ButtonContainer>

                            <SwitchRow>
                                <SwitchText>{t('login.switchToSignup')}</SwitchText>
                                <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                                    <SwitchLinkText>{t('login.switchToSignupLink')}</SwitchLinkText>
                                </TouchableOpacity>
                            </SwitchRow>

                            <DividerRow>
                                <DividerLine />
                                <DividerText>{t('login.socialDivider')}</DividerText>
                                <DividerLine />
                            </DividerRow>

                            <SocialRow>
                                <SocialButton onPress={handleGoogleLogin}>
                                    <Ionicons name="logo-google" size={22} color={theme.colors.text} />
                                </SocialButton>
                                <SocialButton onPress={() => { }}>
                                    <Ionicons name="logo-apple" size={22} color={theme.colors.text} />
                                </SocialButton>
                            </SocialRow>
                        </FormContainer>
                    </Content>
                </ScrollContent>
            </KeyboardAvoidingView>
        </Container>
    );
};
