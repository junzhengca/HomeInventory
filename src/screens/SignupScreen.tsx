import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
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
import { AuthTextInput, Button } from '../components';
import { useAuth, useSettings } from '../store/hooks';
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

const ButtonContainer = styled(View)`
  width: 100%;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.lg}px;
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

export const SignupScreen: React.FC = () => {
    const { t } = useTranslation();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
    const { settings } = useSettings();
    const isDark = settings?.darkMode;
    const { signup } = useAuth();

    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);

    const handleSubmit = useCallback(async () => {
        if (!email.trim() || !password.trim()) {
            setError(t('signup.errors.emptyFields'));
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
            // Navigation handled by _layout.tsx on auth state change
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : t('signup.errors.failed');
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [email, password, signup, t]);

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
                                    icon="person-outline"
                                    placeholder={t('signup.fields.nickname')}
                                    value={nickname}
                                    onChangeText={setNickname}
                                    autoCapitalize="words"
                                    returnKeyType="next"
                                    onSubmitEditing={() => emailRef.current?.focus()}
                                />
                            </InputSpacing>

                            <InputSpacing>
                                <AuthTextInput
                                    ref={emailRef}
                                    icon="mail-outline"
                                    placeholder={t('signup.placeholders.email')}
                                    value={email}
                                    onChangeText={setEmail}
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
                                    placeholder={t('signup.placeholders.password')}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    returnKeyType="go"
                                    onSubmitEditing={handleSubmit}
                                    error={!!error}
                                    errorMessage={error || undefined}
                                />
                            </InputSpacing>

                            <ButtonContainer>
                                <Button
                                    label={
                                        isLoading
                                            ? t('signup.submitting')
                                            : t('signup.submit')
                                    }
                                    onPress={handleSubmit}
                                    variant="primary"
                                    icon="arrow-forward"
                                    disabled={isLoading}
                                    fullWidth
                                    useGlass={false}
                                />
                            </ButtonContainer>

                            <SwitchRow>
                                <SwitchText>{t('signup.switchToLogin')}</SwitchText>
                                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                    <SwitchLinkText>{t('signup.switchToLoginLink')}</SwitchLinkText>
                                </TouchableOpacity>
                            </SwitchRow>

                            <DividerRow>
                                <DividerLine />
                                <DividerText>{t('login.socialDivider')}</DividerText>
                                <DividerLine />
                            </DividerRow>

                            <SocialRow>
                                <SocialButton onPress={() => { }}>
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
