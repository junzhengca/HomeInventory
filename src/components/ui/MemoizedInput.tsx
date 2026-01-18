import React, { memo } from 'react';
import styled from 'styled-components/native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import type { StyleProp } from 'react-native';
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

export interface MemoizedInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  placeholderTextColor: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  onSubmitEditing?: () => void;
  style?: StyleProp<unknown>;
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
    style,
  }) => {
    return (
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
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
);

MemoizedInput.displayName = 'MemoizedInput';
