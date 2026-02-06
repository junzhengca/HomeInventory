import React, {
  useRef,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { Keyboard, type TextInput } from 'react-native';
import styled from 'styled-components/native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import type { StyledProps } from '../../utils/styledComponents';
import { useAuth, useAppDispatch } from '../../store/hooks';
import { BottomSheetHeader, FormSection, UncontrolledInput, Button } from '../atoms';
import { setShowNicknameSetup } from '../../store/slices/authSlice';
import { uiLogger } from '../../utils/Logger';

const Backdrop = styled(BottomSheetBackdrop)`
  background-color: rgba(0, 0, 0, 0.5);
`;

const ContentContainer = styled.View`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-top-left-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  border-top-right-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  overflow: hidden;
`;

const HelperText = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
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

export interface SetupNicknameBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
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
  const { user, updateUser, logout, getApiClient } = useAuth();

  const nicknameInputRef = useRef<TextInput>(null);
  const nicknameValueRef = useRef('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const snapPoints = useMemo(() => ['50%'], []);
  const keyboardBehavior = useMemo(() => 'interactive' as const, []);
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
      // Get API client from Redux (already initialized with correct base URL and token)
      const apiClient = getApiClient();
      if (!apiClient) {
        throw new Error('API client not initialized');
      }

      // Update nickname
      uiLogger.info('Updating nickname');
      const updatedUser = await apiClient.updateNickname(currentNickname);

      // Update user state
      await updateUser(updatedUser);

      // Clear the showNicknameSetup flag
      dispatch(setShowNicknameSetup(false));

      // Close and call callback
      handleClose();
      onNicknameSet?.();
    } catch (error) {
      uiLogger.error('Error updating nickname', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      uiLogger.error('Error details', {
        message: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      });
      setError(t('setupNickname.errors.updateFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [t, updateUser, handleClose, onNicknameSet, dispatch, getApiClient]);

  const handleLogout = useCallback(() => {
    handleClose();
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  }, [handleClose, onLogout, logout]);

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
      handleComponent={null}
      topInset={insets.top}
      index={0}
      enableDynamicSizing={false}
    >
      <ContentContainer>
        <BottomSheetHeader
          title={t('setupNickname.title')}
          subtitle={t('setupNickname.subtitle')}
          onClose={handleClose}
        />
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnPanDownToDismiss={false}
        >
          <FormSection label={t('setupNickname.nicknameLabel')}>
            <UncontrolledInput
              ref={nicknameInputRef}
              defaultValue={defaultValue}
              onChangeText={handleNicknameChangeText}
              onBlur={handleNicknameBlur}
              placeholder={defaultValue}
              placeholderTextColor={theme.colors.textSecondary}
              error={!!error}
              errorMessage={error ?? undefined}
            />
            <HelperText>{t('setupNickname.nicknameHelper')}</HelperText>
          </FormSection>

          <Button
            label={t('setupNickname.submit')}
            onPress={handleSubmit}
            variant="primary"
            icon="home"
            disabled={isLoading}
          />

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
