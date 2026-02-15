import React, { memo, useState } from 'react';
import styled from 'styled-components/native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { View, TextInput, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StyledProps } from '../../utils/styledComponents';

// Main wrapper - can be styled with flex: 1, etc.
export const UncontrolledInputWrapper = styled.View<{ hasError: boolean }>`
  width: 100%;
`;

const InputInnerWrapper = styled.View<{ hasError: boolean }>`
  position: relative;
  width: 100%;
`;

const Input = styled(BottomSheetTextInput) <{ hasError: boolean; isFocused: boolean; noBorder?: boolean; textAlign?: 'left' | 'center' | 'right' }>`
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
    textAlign === 'center'
      ? `${theme.spacing.sm}px ${theme.spacing.md}px`
      : `${theme.spacing.sm}px ${theme.spacing.xl}px ${theme.spacing.sm}px ${theme.spacing.md}px`};
  height: 48px;
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  text-align: ${({ textAlign }: { textAlign?: 'left' | 'center' | 'right' }) => textAlign || 'left'};
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

export interface UncontrolledInputProps {
  defaultValue: string;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  onFocus?: () => void;
  placeholder: string;
  placeholderTextColor: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  onSubmitEditing?: () => void;
  style?: ViewStyle;
  error?: boolean;
  errorMessage?: string;
  noBorder?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
}

/**
 * Uncontrolled input component to prevent IME composition interruption.
 * Uses defaultValue instead of value to prevent re-renders during typing.
 * Essential for Chinese/Japanese/Korean input methods in bottom sheet modals.
 *
 * @example
 * <UncontrolledInput
 *   ref={nameInputRef}
 *   defaultValue={name}
 *   onChangeText={handleNameChangeText}
 *   onBlur={handleNameBlur}
 *   placeholder="Enter name"
 *   placeholderTextColor={theme.colors.textLight}
 *   error={hasError}
 *   errorMessage="Name is required"
 * />
 */
export const UncontrolledInput = memo(
  React.forwardRef<TextInput, UncontrolledInputProps>(
    (
      {
        defaultValue,
        onChangeText,
        onBlur,
        onFocus,
        placeholder,
        placeholderTextColor,
        keyboardType = 'default',
        onSubmitEditing,
        style,
        error = false,
        errorMessage,
        noBorder = false,
        textAlign,
        secureTextEntry = false,
        multiline = false,
        numberOfLines,
      },
      ref
    ) => {
      const [isFocused, setIsFocused] = useState(false);

      return (
        <UncontrolledInputWrapper hasError={error} style={style}>
          <InputInnerWrapper hasError={error}>
            <Input
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ref={ref as any}
              placeholder={placeholder}
              defaultValue={defaultValue}
              onChangeText={onChangeText}
              onBlur={() => {
                setIsFocused(false);
                onBlur();
              }}
              onFocus={() => {
                setIsFocused(true);
                onFocus?.();
              }}
              placeholderTextColor={placeholderTextColor}
              keyboardType={keyboardType}
              onSubmitEditing={onSubmitEditing}
              autoCorrect={false}
              spellCheck={false}
              textContentType="none"
              autoComplete="off"
              hasError={error}
              isFocused={isFocused}
              noBorder={noBorder}
              textAlign={textAlign}
              secureTextEntry={secureTextEntry}
              multiline={multiline}
              numberOfLines={numberOfLines}
              textAlignVertical={multiline ? 'top' : 'center'}
            />
            {error && (
              <ErrorIcon>
                <Ionicons name="alert-circle" size={20} color="#EF5350" />
              </ErrorIcon>
            )}
          </InputInnerWrapper>
          {error && errorMessage && (
            <ErrorContainer>
              <ErrorIconSmall>
                <Ionicons name="warning" size={14} color="#EF5350" />
              </ErrorIconSmall>
              <ErrorText>{errorMessage}</ErrorText>
            </ErrorContainer>
          )}
        </UncontrolledInputWrapper>
      );
    }
  )
);

UncontrolledInput.displayName = 'UncontrolledInput';
