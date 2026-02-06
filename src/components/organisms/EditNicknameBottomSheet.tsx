import React, {
  useRef,
  useCallback,
  useMemo,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Keyboard, type TextInput } from 'react-native';
import styled from 'styled-components/native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import type { StyledProps } from '../../utils/styledComponents';
import { useAuth } from '../../store/hooks';
import { BottomSheetHeader, FormSection, UncontrolledInput, Button } from '../atoms';
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

export interface EditNicknameBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  onNicknameUpdated?: () => void;
}

export interface EditNicknameBottomSheetRef {
  present: (nickname: string) => void;
}

/**
 * Edit nickname bottom sheet - allows users to change their display name.
 * Unlike SetupNicknameBottomSheet, this can be dismissed by the user.
 *
 * Uses uncontrolled inputs with refs to prevent IME composition interruption
 * for Chinese/Japanese input methods.
 *
 * Pattern: Form is populated BEFORE the modal is presented via the present() method.
 * This ensures the form is fully initialized with current values when shown.
 */
export const EditNicknameBottomSheet = forwardRef<
  EditNicknameBottomSheetRef,
  EditNicknameBottomSheetProps
>(({ bottomSheetRef, onNicknameUpdated }, ref) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user, updateUser, getApiClient } = useAuth();

  const nicknameInputRef = useRef<TextInput>(null);
  const nicknameValueRef = useRef('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  // State for initial nickname (triggers form population in useEffect)
  const [initialNickname, setInitialNickname] = useState<string | null>(null);

  // Default value state for uncontrolled input
  const [defaultNickname, setDefaultNickname] = useState('');

  const snapPoints = useMemo(() => ['50%'], []);
  const keyboardBehavior = useMemo(() => 'interactive' as const, []);
  const keyboardBlurBehavior = useMemo(() => 'restore' as const, []);

  // Populate form when initialNickname changes
  useEffect(() => {
    if (initialNickname !== null) {
      // Update ref for form submission
      nicknameValueRef.current = initialNickname;

      // Update state for defaultValue prop
      setDefaultNickname(initialNickname);

      // Update validity state
      setIsValid(initialNickname.trim().length > 0);
      setError(null);
    }
  }, [initialNickname]);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <Backdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef]);

  const handleSheetClose = useCallback(() => {
    // Reset form state when modal closes
    nicknameValueRef.current = '';
    setInitialNickname(null);
    setDefaultNickname('');
    setError(null);
    setIsValid(false);
  }, []);

  // Update ref during typing (no re-render)
  const handleNicknameChangeText = useCallback(
    (text: string) => {
      nicknameValueRef.current = text;
      const trimmed = text.trim();
      const valid = !!trimmed;
      setIsValid(valid);
      if (valid) {
        setError(null);
      } else {
        setError(t('editNickname.errors.enterNickname'));
      }
    },
    [t]
  );

  // Sync ref to state on blur (not needed for this use case, but following pattern)
  const handleNicknameBlur = useCallback(() => {
    // No-op, we'll use the ref value on submit
  }, []);

  const handleSubmit = useCallback(async () => {
    const currentNickname = nicknameValueRef.current?.trim() || '';

    // Validation
    if (!currentNickname) {
      setError(t('editNickname.errors.enterNickname'));
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

      // Close and call callback
      handleClose();
      handleSheetClose();
      onNicknameUpdated?.();
    } catch (error) {
      uiLogger.error('Error updating nickname', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      uiLogger.error('Error details', {
        message: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      });
      setError(t('editNickname.errors.updateFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [t, updateUser, handleClose, handleSheetClose, onNicknameUpdated, getApiClient]);

  const currentNickname = useMemo(() => {
    return user?.nickname || '';
  }, [user]);

  // Expose present method via imperative handle
  useImperativeHandle(
    ref,
    () => ({
      present: (nickname: string) => {
        // Set initial nickname - this triggers form population in useEffect
        setInitialNickname(nickname);

        // Present the bottom sheet immediately
        // The form will be populated on the next render cycle
        setTimeout(() => {
          bottomSheetRef.current?.present();
        }, 0);
      },
    }),
    [bottomSheetRef]
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
      enableContentPanningGesture={false}
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior={keyboardBlurBehavior}
      android_keyboardInputMode="adjustResize"
      enableHandlePanningGesture={false}
      handleComponent={null}
      topInset={insets.top}
      enableDynamicSizing={false}
      backgroundStyle={{ backgroundColor: 'transparent' }}
      onChange={(index) => {
        if (index === -1) {
          handleSheetClose();
        }
      }}
    >
      <ContentContainer>
        <BottomSheetHeader
          title={t('editNickname.title')}
          subtitle={t('editNickname.subtitle')}
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
          <FormSection label={t('editNickname.nicknameLabel')}>
            <UncontrolledInput
              ref={nicknameInputRef}
              defaultValue={defaultNickname}
              onChangeText={handleNicknameChangeText}
              onBlur={handleNicknameBlur}
              placeholder={currentNickname}
              placeholderTextColor={theme.colors.textSecondary}
              error={!!error}
              errorMessage={error ?? undefined}
            />
            <HelperText>{t('editNickname.nicknameHelper')}</HelperText>
          </FormSection>

          <Button
            label={t('editNickname.submit')}
            onPress={handleSubmit}
            variant="primary"
            icon="checkmark"
            disabled={isLoading || !isValid}
          />
        </BottomSheetScrollView>
      </ContentContainer>
    </BottomSheetModal>
  );
});

EditNicknameBottomSheet.displayName = 'EditNicknameBottomSheet';
