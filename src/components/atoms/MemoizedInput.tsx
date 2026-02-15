import React, { memo, useState } from 'react';
import styled from 'styled-components/native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StyledProps } from '../../utils/styledComponents';

const InputWrapper = styled(View)<{ hasError: boolean }>`
  position: relative;
`;

const Input = styled(BottomSheetTextInput)<{ hasError: boolean; isFocused: boolean; noBorder?: boolean; textAlign?: 'left' | 'center' | 'right' }>`
  background-color: ${({ theme, hasError }: StyledProps & { hasError: boolean }) =>
    hasError ? theme.colors.errorLight : theme.colors.surface};
  border-width: ${({ noBorder, isFocused }: { noBorder?: boolean; isFocused: boolean }) =>
    noBorder ? '0px' : isFocused ? '2px' : '1px'};
  border-color: ${({ theme, hasError, isFocused, noBorder }: StyledProps & { hasError: boolean; isFocused: boolean; noBorder?: boolean }) =>
    noBorder ? 'transparent' : hasError
      ? theme.colors.error
      : isFocused
        ? theme.colors.primary
        : theme.colors.border};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme, textAlign }: StyledProps & { textAlign?: 'left' | 'center' | 'right' }) =>
    textAlign === 'center' ? `${theme.spacing.md}px ${theme.spacing.md}px` : `${theme.spacing.md}px ${theme.spacing.xl}px ${theme.spacing.md}px ${theme.spacing.md}px`};
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  text-align: ${({ textAlign }: { textAlign?: 'left' | 'center' | 'right' }) => textAlign || 'left'};
  transition: all 0.2s ease;
`;

const ErrorIcon = styled(View)`
  position: absolute;
  right: ${({ theme }: StyledProps) => theme.spacing.md}px;
  top: 13px;
  z-index: 1;
`;

const ErrorContainer = styled(View)`
  flex-direction: row;
  align-items: center;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const ErrorIconSmall = styled(View)`
  margin-right: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const ErrorText = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.error};
  line-height: ${({ theme }: StyledProps) => theme.typography.fontSize.sm * theme.typography.lineHeight.normal}px;
  flex: 1;
`;

export interface MemoizedInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  placeholderTextColor: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  onSubmitEditing?: () => void;
  onBlur?: () => void;
  onFocus?: () => void;
  style?: React.ComponentProps<typeof View>['style'];
  error?: boolean;
  errorMessage?: string;
  noBorder?: boolean;
  textAlign?: 'left' | 'center' | 'right';
}

/**
 * Memoized input component to prevent re-renders during IME composition.
 * Essential for Chinese/Japanese input methods to prevent interruption.
 *
 * @example
 * <MemoizedInput
 *   value={name}
 *   onChangeText={setName}
 *   placeholder="Enter name"
 *   placeholderTextColor={theme.colors.textLight}
 *   error={hasError}
 *   errorMessage="Name is required"
 * />
 */
export const MemoizedInput = memo<MemoizedInputProps>(
  ({
    value,
    onChangeText,
    placeholder,
    placeholderTextColor,
    keyboardType = 'default',
    onSubmitEditing,
    onBlur,
    onFocus,
    style,
    error = false,
    errorMessage,
    noBorder = false,
    textAlign,
  }) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View>
        <InputWrapper hasError={error}>
          <Input
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={placeholderTextColor}
            keyboardType={keyboardType}
            onSubmitEditing={onSubmitEditing}
            onFocus={() => {
              setIsFocused(true);
              onFocus?.();
            }}
            onBlur={() => {
              setIsFocused(false);
              onBlur?.();
            }}
            autoCorrect={false}
            spellCheck={false}
            textContentType="none"
            autoComplete="off"
            style={style}
            hasError={error}
            isFocused={isFocused}
            noBorder={noBorder}
            textAlign={textAlign}
          />
          {error && (
            <ErrorIcon>
              <Ionicons name="alert-circle" size={20} color="#EF5350" />
            </ErrorIcon>
          )}
        </InputWrapper>
        {error && errorMessage && (
          <ErrorContainer>
            <ErrorIconSmall>
              <Ionicons name="warning" size={14} color="#EF5350" />
            </ErrorIconSmall>
            <ErrorText>{errorMessage}</ErrorText>
          </ErrorContainer>
        )}
      </View>
    );
  }
);

MemoizedInput.displayName = 'MemoizedInput';
