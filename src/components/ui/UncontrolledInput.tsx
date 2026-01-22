import React, { memo } from 'react';
import styled from 'styled-components/native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import type { TextInput, StyleProp } from 'react-native';
import type { StyledProps } from '../../utils/styledComponents';

const Input = styled(BottomSheetTextInput)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.border};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

export interface UncontrolledInputProps {
  defaultValue: string;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  placeholder: string;
  placeholderTextColor: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  onSubmitEditing?: () => void;
  style?: StyleProp<unknown>;
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
 * />
 */
export const UncontrolledInput = memo(
  React.forwardRef<TextInput, UncontrolledInputProps>(
    (
      {
        defaultValue,
        onChangeText,
        onBlur,
        placeholder,
        placeholderTextColor,
        keyboardType = 'default',
        onSubmitEditing,
        style,
      },
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
          keyboardType={keyboardType}
          onSubmitEditing={onSubmitEditing}
          autoCorrect={false}
          spellCheck={false}
          textContentType="none"
          autoComplete="off"
          style={style}
        />
      );
    }
  )
);

UncontrolledInput.displayName = 'UncontrolledInput';
