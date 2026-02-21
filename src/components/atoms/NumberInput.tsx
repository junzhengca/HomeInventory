import React, { memo, useCallback, useRef, useImperativeHandle, useState, useEffect } from 'react';
import { TouchableOpacity, TextInput, View, type ViewStyle } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import type { StyledProps } from '../../utils/styledComponents';
import { UncontrolledInput } from './UncontrolledInput';
import { MemoizedInput } from './MemoizedInput';
import { UnitPicker } from './UnitPicker';

const ContainerWrapper = styled(View) <{ hasError: boolean }>`
  position: relative;
`;

const Container = styled(View) <{ hasError: boolean }>`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme, hasError }: StyledProps & { hasError: boolean }) =>
    hasError ? theme.colors.errorLight : theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme, hasError }: StyledProps & { hasError: boolean }) =>
    hasError ? theme.colors.error : theme.colors.border};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  overflow: hidden;
`;

const Button = styled(TouchableOpacity) <{ disabled?: boolean; hasError?: boolean }>`
  width: 44px;
  height: 48px;
  align-items: center;
  justify-content: center;
  opacity: ${({ disabled }: { disabled?: boolean }) => (disabled ? 0.3 : 1)};
`;

const ButtonIcon = styled(Ionicons)`
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const InputContainer = styled(View)`
  flex: 1;
`;

const Separator = styled.View`
  width: 1px;
  height: 24px;
  background-color: ${({ theme }: StyledProps) => theme.colors.border};
`;

const UnitPickerWrapper = styled.View`
  height: 48px;
  min-width: 60px;
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

const commonInputStyle = {
  borderWidth: 0,
  backgroundColor: 'transparent',
  height: 48,
  paddingVertical: 0,
  paddingHorizontal: 0,
};

export interface NumberInputProps {
  defaultValue?: string; // For uncontrolled mode
  value?: string; // For controlled mode (optional)
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  placeholder: string;
  placeholderTextColor: string;
  min?: number; // Optional minimum value
  max?: number; // Optional maximum value
  style?: ViewStyle;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  error?: boolean;
  errorMessage?: string;
  // Unit picker props
  unitValue?: string;
  onUnitChange?: (unit: string) => void;
}

/**
 * NumberInput component with increment/decrement buttons.
 * Supports both controlled and uncontrolled modes for IME compatibility.
 * Users can type numbers directly or use +/- buttons to adjust the value.
 *
 * @example
 * <NumberInput
 *   ref={amountInputRef}
 *   defaultValue={amountValueRef.current}
 *   onChangeText={handleAmountChangeText}
 *   onBlur={handleAmountBlur}
 *   placeholder="1"
 *   placeholderTextColor={theme.colors.textLight}
 *   keyboardType="numeric"
 *   error={hasError}
 *   errorMessage="Quantity must be at least 1"
 * />
 */
export const NumberInput = memo(
  React.forwardRef<TextInput, NumberInputProps>(
    (
      {
        defaultValue,
        value,
        onChangeText,
        onBlur,
        placeholder,
        placeholderTextColor,
        min,
        max,
        style,
        keyboardType = 'numeric',
        error = false,
        errorMessage,
        unitValue,
        onUnitChange,
      },
      ref
    ) => {
      // For uncontrolled mode, we need to track the current value
      const currentValueRef = useRef<string>(defaultValue || value || '');
      const inputRef = useRef<TextInput>(null);

      // Determine if we're in controlled mode
      const isControlled = value !== undefined;

      // Track current numeric value in state for immediate disabled state updates
      const parseValue = useCallback((val: string | undefined): number => {
        const parsed = parseInt(val || '0', 10);
        return isNaN(parsed) ? 0 : parsed;
      }, []);

      const [currentNumericValue, setCurrentNumericValue] = useState(() =>
        parseValue(isControlled ? value : defaultValue)
      );

      // Sync state when value prop changes (controlled mode)
      useEffect(() => {
        if (isControlled) {
          setCurrentNumericValue(parseValue(value));
        }
      }, [value, isControlled, parseValue]);

      // Sync state when defaultValue changes (uncontrolled mode, for form resets)
      useEffect(() => {
        if (!isControlled && defaultValue !== undefined) {
          const newValue = parseValue(defaultValue);
          setCurrentNumericValue(newValue);
          currentValueRef.current = defaultValue;
          if (inputRef.current) {
            inputRef.current.setNativeProps({ text: defaultValue });
          }
        }
      }, [defaultValue, isControlled, parseValue]);

      // Expose ref to parent, but also keep our internal ref
      useImperativeHandle(ref, () => inputRef.current as TextInput, []);

      // Get current value (controlled takes precedence)
      const getCurrentValue = useCallback((): number => {
        if (isControlled) {
          return parseValue(value);
        }
        return parseValue(currentValueRef.current);
      }, [isControlled, value, parseValue]);

      // Update value helper - updates input immediately for instant feedback
      const updateValue = useCallback(
        (newValue: number) => {
          // Apply min/max constraints
          let constrainedValue = newValue;
          if (min !== undefined && constrainedValue < min) {
            constrainedValue = min;
          }
          if (max !== undefined && constrainedValue > max) {
            constrainedValue = max;
          }

          const valueString = constrainedValue.toString();

          // Immediately update state for instant disabled state updates
          setCurrentNumericValue(constrainedValue);

          // For uncontrolled mode: immediately update the input's displayed value using setNativeProps
          // This provides instant visual feedback without waiting for re-renders
          // For controlled mode: we can't use setNativeProps as React controls the value,
          // but the parent should update quickly via onChangeText
          if (!isControlled && inputRef.current) {
            inputRef.current.setNativeProps({ text: valueString });
            currentValueRef.current = valueString;
          }

          // Call onChangeText for state management
          // For controlled mode, this will trigger parent update and re-render
          // For uncontrolled mode, this just updates the parent's ref
          onChangeText(valueString);
        },
        [min, max, onChangeText, isControlled]
      );

      const handleDecrement = useCallback(() => {
        const current = getCurrentValue();
        updateValue(current - 1);
      }, [getCurrentValue, updateValue]);

      const handleIncrement = useCallback(() => {
        const current = getCurrentValue();
        updateValue(current + 1);
      }, [getCurrentValue, updateValue]);

      const handleChangeText = useCallback(
        (text: string) => {
          // Update ref for uncontrolled mode
          if (!isControlled) {
            currentValueRef.current = text;
          }
          // Update state immediately for disabled state calculation
          const numericValue = parseValue(text);
          setCurrentNumericValue(numericValue);
          onChangeText(text);
        },
        [onChangeText, isControlled, parseValue]
      );

      // Calculate disabled states based on current numeric value state
      const isMinDisabled = min !== undefined && currentNumericValue <= min;
      const isMaxDisabled = max !== undefined && currentNumericValue >= max;

      return (
        <View>
          <ContainerWrapper hasError={error}>
            <Container hasError={error} style={style}>
              <Button
                onPress={handleDecrement}
                disabled={isMinDisabled}
                activeOpacity={0.7}
                hasError={error}
              >
                <ButtonIcon name="remove" size={20} />
              </Button>
              <InputContainer>
                {isControlled ? (
                  <MemoizedInput
                    value={value || ''}
                    onChangeText={handleChangeText}
                    onBlur={onBlur ?? (() => { })}
                    placeholder={placeholder}
                    placeholderTextColor={placeholderTextColor}
                    keyboardType={keyboardType}
                    style={commonInputStyle}
                    error={error}
                    noBorder
                    textAlign="center"
                  />
                ) : (
                  <UncontrolledInput
                    ref={inputRef}
                    defaultValue={defaultValue || ''}
                    onChangeText={handleChangeText}
                    onBlur={onBlur ?? (() => { })}
                    placeholder={placeholder}
                    placeholderTextColor={placeholderTextColor}
                    keyboardType={keyboardType}
                    style={commonInputStyle}
                    error={error}
                    noBorder
                    textAlign="center"
                  />
                )}
              </InputContainer>
              <Button
                onPress={handleIncrement}
                disabled={isMaxDisabled}
                activeOpacity={0.7}
                hasError={error}
              >
                <ButtonIcon name="add" size={20} />
              </Button>

              {onUnitChange && (
                <>
                  <Separator />
                  <UnitPickerWrapper>
                    <UnitPicker
                      variant="compact"
                      value={unitValue || ''}
                      onValueChange={onUnitChange}
                    />
                  </UnitPickerWrapper>
                </>
              )}
            </Container>
          </ContainerWrapper>
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
  )
);

NumberInput.displayName = 'NumberInput';
