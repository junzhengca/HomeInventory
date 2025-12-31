import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { TouchableOpacity, View, Text, Keyboard } from 'react-native';
import styled from 'styled-components/native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import type { StyledProps } from '../utils/styledComponents';
import { useAuth } from '../contexts/AuthContext';
import { BottomActionBar } from './BottomActionBar';


const Header = styled(View)`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const HeaderLeft = styled(View)`
  flex: 1;
`;

const Title = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.xxl}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const Subtitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

const CloseButton = styled(TouchableOpacity)`
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  align-items: center;
  justify-content: center;
`;

const ContentContainer = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
`;

const FormSection = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const Label = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const Input = styled(BottomSheetTextInput)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.border};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const ErrorText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.error};
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const LinkText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.primary};
  text-align: center;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const LinkButton = styled(TouchableOpacity)`
  margin-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const BenefitsSection = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryLightest};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const BenefitItem = styled(View)`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const BenefitItemLast = styled(View)`
  flex-direction: row;
  align-items: center;
  margin-bottom: 0px;
`;

const BenefitIconContainer = styled(View)`
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  background-color: ${({ theme }: StyledProps) => theme.colors.primary};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
  flex-shrink: 0;
`;

const BenefitText = styled(Text)`
  flex: 1;
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  line-height: ${({ theme }: StyledProps) => theme.typography.fontSize.sm * 1.4}px;
`;

interface SignupBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal>;
  onLoginPress?: () => void;
}

export const SignupBottomSheet: React.FC<SignupBottomSheetProps> = ({
  bottomSheetRef,
  onLoginPress,
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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const snapPoints = useMemo(() => ['100%'], []);

  const keyboardBehavior = useMemo(() => 'interactive' as const, []);
  const keyboardBlurBehavior = useMemo(() => 'restore' as const, []);

  // Track keyboard visibility to adjust footer padding
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener('keyboardWillShow', () => {
      setIsKeyboardVisible(true);
    });

    const keyboardWillHideListener = Keyboard.addListener('keyboardWillHide', () => {
      setIsKeyboardVisible(false);
    });

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

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
    bottomSheetRef.current?.dismiss();
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('signup.errors.failed');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, confirmPassword, signup, handleClose, t]);

  const handleLoginPress = useCallback(() => {
    handleClose();
    if (onLoginPress) {
      onLoginPress();
    }
  }, [handleClose, onLoginPress]);

  const renderFooter = useCallback(
    () => (
      <BottomActionBar
        actions={[
          {
            label: isLoading ? t('signup.submitting') : t('signup.submit'),
            onPress: handleSubmit,
            variant: 'filled',
            icon: <Ionicons name="person-add" size={18} color={theme.colors.surface} />,
            disabled: isLoading,
          },
        ]}
        safeArea={!isKeyboardVisible}
        inBottomSheet={true}
      />
    ),
    [handleSubmit, isLoading, theme, t, isKeyboardVisible]
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={false}
      onDismiss={handleClose}
      backdropComponent={renderBackdrop}
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior={keyboardBlurBehavior}
      android_keyboardInputMode="adjustResize"
      topInset={insets.top}
      enableDynamicSizing={false}
      footerComponent={renderFooter}
    >
      <ContentContainer>
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.lg }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnPanDownToDismiss={false}
        >
        <Header>
          <HeaderLeft>
            <Title>{t('signup.title')}</Title>
            <Subtitle>{t('signup.subtitle')}</Subtitle>
          </HeaderLeft>
          <CloseButton onPress={handleClose}>
            <Ionicons name="close" size={20} color={theme.colors.text} />
          </CloseButton>
        </Header>

        <BenefitsSection>
          <BenefitItem>
            <BenefitIconContainer>
              <Ionicons name="cloud-upload" size={20} color="white" />
            </BenefitIconContainer>
            <BenefitText>{t('signup.benefits.sync')}</BenefitText>
          </BenefitItem>
          <BenefitItem>
            <BenefitIconContainer>
              <Ionicons name="sparkles" size={20} color="white" />
            </BenefitIconContainer>
            <BenefitText>{t('signup.benefits.premium')}</BenefitText>
          </BenefitItem>
          <BenefitItemLast>
            <BenefitIconContainer>
              <Ionicons name="people" size={20} color="white" />
            </BenefitIconContainer>
            <BenefitText>{t('signup.benefits.share')}</BenefitText>
          </BenefitItemLast>
        </BenefitsSection>

        <FormSection>
          <Label>{t('signup.fields.email')}</Label>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder={t('signup.placeholders.email')}
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />
        </FormSection>

        <FormSection>
          <Label>{t('signup.fields.password')}</Label>
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder={t('signup.placeholders.password')}
            placeholderTextColor={theme.colors.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />
        </FormSection>

        <FormSection>
          <Label>{t('signup.fields.confirmPassword')}</Label>
          <Input
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('signup.placeholders.confirmPassword')}
            placeholderTextColor={theme.colors.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            onSubmitEditing={handleSubmit}
          />
          {error && <ErrorText>{error}</ErrorText>}
        </FormSection>

        <LinkButton onPress={handleLoginPress}>
          <LinkText>{t('signup.link')}</LinkText>
        </LinkButton>
        </BottomSheetScrollView>
      </ContentContainer>
    </BottomSheetModal>
  );
};

