import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { TouchableOpacity, View, Text, Keyboard } from 'react-native';
import styled from 'styled-components/native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import type { StyledProps } from '../utils/styledComponents';
import { useAuth, useAppDispatch } from '../store/hooks';
import { setError } from '../store/slices/authSlice';
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

// Memoized input components to prevent re-renders that interrupt IME composition
const MemoizedEmailInput = memo<{
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  placeholderTextColor: string;
  editable: boolean;
}>(({ value, onChangeText, placeholder, placeholderTextColor, editable }) => {
  return (
    <Input
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      keyboardType="email-address"
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      textContentType="none"
      autoComplete="off"
      editable={editable}
    />
  );
});

const MemoizedPasswordInput = memo<{
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
  placeholder: string;
  placeholderTextColor: string;
  editable: boolean;
}>(({ value, onChangeText, onSubmitEditing, placeholder, placeholderTextColor, editable }) => {
  return (
    <Input
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      secureTextEntry
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      textContentType="none"
      autoComplete="off"
      editable={editable}
      onSubmitEditing={onSubmitEditing}
    />
  );
});

MemoizedEmailInput.displayName = 'MemoizedEmailInput';
MemoizedPasswordInput.displayName = 'MemoizedPasswordInput';

interface LoginBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal>;
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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [loginAttempted, setLoginAttempted] = useState(false);

  const snapPoints = useMemo(() => ['100%'], []);

  // Use 'extend' to prevent IME composition interruption
  const keyboardBehavior = useMemo(() => 'extend' as const, []);
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
    setLocalError(null);
    setLoginAttempted(false);
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
      <BottomActionBar
        actions={[
          {
            label: authLoading ? t('login.submitting') : t('login.submit'),
            onPress: handleSubmit,
            variant: 'filled',
            icon: <Ionicons name="log-in" size={18} color={theme.colors.surface} />,
            disabled: authLoading,
          },
        ]}
        safeArea={!isKeyboardVisible}
        inBottomSheet={true}
      />
    ),
    [handleSubmit, authLoading, theme, t, isKeyboardVisible]
  );

  // Combine local and auth errors for display
  const displayError = localError || authError;

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
            <Title>{t('login.title')}</Title>
            <Subtitle>{t('login.subtitle')}</Subtitle>
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
            <BenefitText>{t('login.benefits.sync')}</BenefitText>
          </BenefitItem>
          <BenefitItem>
            <BenefitIconContainer>
              <Ionicons name="sparkles" size={20} color="white" />
            </BenefitIconContainer>
            <BenefitText>{t('login.benefits.premium')}</BenefitText>
          </BenefitItem>
          <BenefitItemLast>
            <BenefitIconContainer>
              <Ionicons name="people" size={20} color="white" />
            </BenefitIconContainer>
            <BenefitText>{t('login.benefits.share')}</BenefitText>
          </BenefitItemLast>
        </BenefitsSection>

        <FormSection>
          <Label>{t('login.fields.email')}</Label>
          <MemoizedEmailInput
            value={email}
            onChangeText={handleEmailChange}
            placeholder={t('login.placeholders.email')}
            placeholderTextColor={theme.colors.textSecondary}
            editable={!authLoading}
          />
        </FormSection>

        <FormSection>
          <Label>{t('login.fields.password')}</Label>
          <MemoizedPasswordInput
            value={password}
            onChangeText={handlePasswordChange}
            onSubmitEditing={handleSubmit}
            placeholder={t('login.placeholders.password')}
            placeholderTextColor={theme.colors.textSecondary}
            editable={!authLoading}
          />
          {displayError && <ErrorText>{displayError}</ErrorText>}
        </FormSection>

        <LinkButton onPress={handleSignupPress}>
          <LinkText>{t('login.link')}</LinkText>
        </LinkButton>
        </BottomSheetScrollView>
      </ContentContainer>
    </BottomSheetModal>
  );
};

