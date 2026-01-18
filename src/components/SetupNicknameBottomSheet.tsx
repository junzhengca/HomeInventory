import React, {
  useRef,
  useCallback,
  useMemo,
  useEffect,
  useState,
} from 'react';
import { View, TextInput, Keyboard } from 'react-native';
import styled from 'styled-components/native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import type { StyledProps } from '../utils/styledComponents';
import { useAuth, useAppDispatch } from '../store/hooks';
import { useKeyboardVisibility } from '../hooks';
import { BottomActionBar } from './BottomActionBar';
import { ApiClient } from '../services/ApiClient';
import { getAuthTokens } from '../services/AuthService';
import { setShowNicknameSetup } from '../store/slices/authSlice';

const Backdrop = styled(BottomSheetBackdrop)`
  background-color: rgba(0, 0, 0, 0.5);
`;

const ContentContainer = styled.View`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
`;

const Header = styled.View`
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const Title = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.xxl}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  text-align: center;
`;

const Subtitle = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  text-align: center;
`;

const AvatarContainer = styled.View`
  width: 120px;
  height: 120px;
  border-radius: 60px;
  background-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  border-width: 2px;
  border-color: ${({ theme }: StyledProps) => theme.colors.primary};
`;

const AvatarPlaceholder = styled.View`
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
`;

const FormSection = styled.View`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const Label = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) =>
    theme.typography.fontWeight.medium};
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

const HelperText = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const ErrorText = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.error};
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const LogoutLink = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const LogoutLinkText = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

// Uncontrolled input component to prevent IME interruption
const UncontrolledInput = React.memo(
  React.forwardRef<
    TextInput,
    {
      defaultValue: string;
      onChangeText: (text: string) => void;
      onBlur: () => void;
      placeholder: string;
      placeholderTextColor: string;
    }
  >(
    (
      { defaultValue, onChangeText, onBlur, placeholder, placeholderTextColor },
      ref
    ) => {
      return (
        <Input
          ref={ref}
          placeholder={placeholder}
          defaultValue={defaultValue}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholderTextColor={placeholderTextColor}
          autoCorrect={false}
          spellCheck={false}
          textContentType="none"
          autoComplete="off"
        />
      );
    }
  )
);

UncontrolledInput.displayName = 'UncontrolledInput';

interface SetupNicknameBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal>;
  onNicknameSet?: () => void;
  onLogout?: () => void;
}

export const SetupNicknameBottomSheet: React.FC<
  SetupNicknameBottomSheetProps
> = ({ bottomSheetRef, onNicknameSet, onLogout }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { user, updateUser, logout } = useAuth();
  const { isKeyboardVisible } = useKeyboardVisibility();

  const nicknameInputRef = useRef<TextInput>(null);
  const nicknameValueRef = useRef('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  // Initialize nickname value from user nickname or email (extract name part before @)
  useEffect(() => {
    if (user) {
      if (user.nickname && user.nickname.trim() !== '') {
        nicknameValueRef.current = user.nickname;
      } else if (user.email) {
        const emailName = user.email.split('@')[0];
        nicknameValueRef.current = emailName;
      }
    }
  }, [user]);

  const snapPoints = useMemo(() => ['100%'], []);
  const keyboardBehavior = useMemo(() => 'extend' as const, []);
  const keyboardBlurBehavior = useMemo(() => 'restore' as const, []);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <Backdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    bottomSheetRef.current?.dismiss();
    nicknameValueRef.current = '';
    setError(null);
    setFormKey((prev) => prev + 1);
  }, [bottomSheetRef]);

  // Update ref during typing (no re-render)
  const handleNicknameChangeText = useCallback(
    (text: string) => {
      nicknameValueRef.current = text;
      if (error) {
        setError(null);
      }
    },
    [error]
  );

  // Sync ref to state on blur (not needed for this use case, but following pattern)
  const handleNicknameBlur = useCallback(() => {
    // No-op, we'll use the ref value on submit
  }, []);

  const handleSubmit = useCallback(async () => {
    const currentNickname = nicknameValueRef.current?.trim() || '';

    // Validation
    if (!currentNickname) {
      setError(t('setupNickname.errors.enterNickname'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get API client
      const API_BASE_URL =
        process.env.EXPO_PUBLIC_API_BASE_URL ||
        'https://home-inventory-api.logiccore.digital';
      const apiClient = new ApiClient(API_BASE_URL);
      const tokens = await getAuthTokens();
      if (!tokens) {
        throw new Error('Not authenticated');
      }
      apiClient.setAuthToken(tokens.accessToken);

      // Update nickname
      const updatedUser = await apiClient.updateNickname(currentNickname);

      // Update user state
      await updateUser(updatedUser);

      // Clear the showNicknameSetup flag
      dispatch(setShowNicknameSetup(false));

      // Close and call callback
      handleClose();
      onNicknameSet?.();
    } catch (error) {
      console.error('Error updating nickname:', error);
      setError(t('setupNickname.errors.updateFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [t, updateUser, handleClose, onNicknameSet, dispatch]);

  const handleLogout = useCallback(() => {
    handleClose();
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  }, [handleClose, onLogout, logout]);

  const renderFooter = useCallback(
    () => (
      <BottomActionBar
        actions={[
          {
            label: t('setupNickname.submit'),
            onPress: handleSubmit,
            variant: 'filled',
            icon: (
              <Ionicons name="home" size={18} color={theme.colors.surface} />
            ),
            disabled: isLoading,
          },
        ]}
        safeArea={!isKeyboardVisible}
        inBottomSheet={true}
      />
    ),
    [handleSubmit, isLoading, theme, t, isKeyboardVisible]
  );

  const defaultValue = useMemo(() => {
    if (user?.nickname && user.nickname.trim() !== '') {
      return user.nickname;
    } else if (user?.email) {
      return user.email.split('@')[0];
    }
    return '';
  }, [user]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={false}
      enableContentPanningGesture={false}
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior={keyboardBlurBehavior}
      android_keyboardInputMode="adjustResize"
      enableHandlePanningGesture={false}
      topInset={insets.top}
      index={0}
      footerComponent={renderFooter}
      enableDynamicSizing={false}
    >
      <ContentContainer>
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: theme.spacing.lg,
            paddingBottom: theme.spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnPanDownToDismiss={false}
        >
          <Header key={formKey}>
            <Title>{t('setupNickname.title')}</Title>
            <Subtitle>{t('setupNickname.subtitle')}</Subtitle>
          </Header>

          <View
            style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}
          >
            <AvatarContainer>
              <AvatarPlaceholder>
                <Ionicons
                  name="person"
                  size={60}
                  color={theme.colors.textSecondary}
                />
              </AvatarPlaceholder>
            </AvatarContainer>
          </View>

          <FormSection>
            <Label>{t('setupNickname.nicknameLabel')}</Label>
            <UncontrolledInput
              ref={nicknameInputRef}
              defaultValue={defaultValue}
              onChangeText={handleNicknameChangeText}
              onBlur={handleNicknameBlur}
              placeholder={defaultValue}
              placeholderTextColor={theme.colors.textSecondary}
            />
            <HelperText>{t('setupNickname.nicknameHelper')}</HelperText>
            {error && <ErrorText>{error}</ErrorText>}
          </FormSection>

          <LogoutLink onPress={handleLogout}>
            <Ionicons
              name="log-out-outline"
              size={16}
              color={theme.colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <LogoutLinkText>{t('setupNickname.logoutLink')}</LogoutLinkText>
          </LogoutLink>
        </BottomSheetScrollView>
      </ContentContainer>
    </BottomSheetModal>
  );
};
