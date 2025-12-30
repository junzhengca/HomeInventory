import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TouchableOpacity, Alert, View, Text, Keyboard } from 'react-native';
import styled from 'styled-components/native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import type { StyledProps, StyledPropsWith } from '../utils/styledComponents';
import { useTodos } from '../contexts/TodoContext';
import { BottomActionBar } from './BottomActionBar';

const Backdrop = styled(BottomSheetBackdrop)`
  background-color: rgba(0, 0, 0, 0.5);
`;

const Header = styled(View)`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
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

const Input = styled(BottomSheetTextInput)<{ isFocused: boolean }>`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-width: 1.5px;
  border-color: ${({ theme, isFocused }: StyledPropsWith<{ isFocused: boolean }>) =>
    isFocused ? theme.colors.inputFocus : theme.colors.border};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: 0;
  height: 48px;
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

interface EditTodoBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  todoId: string;
  initialText: string;
  onTodoUpdated?: () => void;
}

export const EditTodoBottomSheet: React.FC<EditTodoBottomSheetProps> = ({
  bottomSheetRef,
  todoId,
  initialText,
  onTodoUpdated,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { updateTodo } = useTodos();
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Update text when initialText changes
  useEffect(() => {
    setText(initialText);
  }, [initialText]);

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

  const handleTodoTextChange = useCallback((newText: string) => {
    setText(newText);
  }, []);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    bottomSheetRef.current?.dismiss();
    setText('');
    setIsFocused(false);
  }, [bottomSheetRef]);

  // Reset text when bottom sheet index changes to 0 (opened)
  const handleSheetChanges = useCallback((index: number) => {
    if (index === 0) {
      setText(initialText);
    }
  }, [initialText]);

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) {
      Alert.alert(t('notes.editTodo.errors.title'), t('notes.editTodo.errors.enterText'));
      return;
    }

    setIsLoading(true);
    try {
      await updateTodo(todoId, text.trim());
      handleClose();
      if (onTodoUpdated) {
        onTodoUpdated();
      }
    } catch (error) {
      console.error('Error updating todo:', error);
      Alert.alert(t('notes.editTodo.errors.title'), t('notes.editTodo.errors.updateFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [text, todoId, updateTodo, handleClose, onTodoUpdated, t]);

  const snapPoints = useMemo(() => ['40%'], []);

  // Handle keyboard behavior - use 'interactive' for better keyboard handling
  const keyboardBehavior = useMemo(() => 'interactive' as const, []);
  const keyboardBlurBehavior = useMemo(() => 'restore' as const, []);

  const renderBackdrop = useCallback(
    (props: Parameters<typeof BottomSheetBackdrop>[0]) => <Backdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  const renderFooter = useCallback(
    () => (
      <BottomActionBar
        actions={[
          {
            label: t('notes.editTodo.submit'),
            onPress: handleSubmit,
            variant: 'filled',
            icon: <Ionicons name="checkmark" size={18} color={theme.colors.surface} />,
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
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
      enableContentPanningGesture={false}
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior={keyboardBlurBehavior}
      android_keyboardInputMode="adjustResize"
      enableHandlePanningGesture={false}
      topInset={insets.top}
      index={0}
      footerComponent={renderFooter}
      enableDynamicSizing={false}
      onChange={handleSheetChanges}
    >
      <ContentContainer>
        <View style={{ padding: theme.spacing.lg }}>
          <Header>
            <HeaderLeft>
              <Title>{t('notes.editTodo.title')}</Title>
              <Subtitle>{t('notes.editTodo.subtitle')}</Subtitle>
            </HeaderLeft>
            <CloseButton onPress={handleClose}>
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </CloseButton>
          </Header>

          <FormSection>
            <Label>{t('notes.editTodo.placeholders.text')}</Label>
            <Input
              placeholder={t('notes.editTodo.placeholders.text')}
              value={text}
              onChangeText={handleTodoTextChange}
              placeholderTextColor={theme.colors.textLight}
              isFocused={isFocused}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoFocus={true}
              autoCorrect={false}
            />
          </FormSection>
        </View>
      </ContentContainer>
    </BottomSheetModal>
  );
};

