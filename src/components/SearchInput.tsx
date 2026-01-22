import React, { useState, useCallback } from 'react';
import { TextInput, View, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from 'react-i18next';
import type { StyledProps, StyledPropsWith } from '../utils/styledComponents';

const Container = styled(View)<{ isFocused: boolean }>`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  height: 48px;
  border-width: 1.5px;
  border-color: ${({ theme, isFocused }: StyledPropsWith<{ isFocused: boolean }>) =>
    isFocused ? theme.colors.inputFocus : theme.colors.borderLight};
`;

const SearchIcon = styled(Ionicons)`
  color: ${({ theme }: StyledProps) => theme.colors.textLight};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const Input = styled(TextInput)`
  flex: 1;
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  height: 100%;
  padding-vertical: 0;
`;

const ClearButton = styled(TouchableOpacity)`
  padding: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const ClearIcon = styled(Ionicons)`
  color: ${({ theme }: StyledProps) => theme.colors.textLight};
`;

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder,
  value,
  onChangeText,
}) => {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const theme = useTheme();

  // Use translated placeholder if none provided
  const translatedPlaceholder = placeholder || t('search.placeholder');

  // Stable onChangeText handler to prevent IME composition interruption
  const handleChangeText = useCallback((text: string) => {
    if (onChangeText) {
      onChangeText(text);
    }
  }, [onChangeText]);

  const handleClear = useCallback(() => {
    if (onChangeText) {
      onChangeText('');
    }
  }, [onChangeText]);

  return (
    <Container isFocused={isFocused}>
      <SearchIcon name="search-outline" size={22} />
      <Input
        value={value}
        onChangeText={handleChangeText}
        placeholder={translatedPlaceholder}
        placeholderTextColor={theme.colors.textLight}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoCorrect={false}
        spellCheck={false}
        textContentType="none"
        autoComplete="off"
      />
      {value && value.length > 0 && (
        <ClearButton onPress={handleClear} activeOpacity={0.7}>
          <ClearIcon name="close-circle" size={20} />
        </ClearButton>
      )}
    </Container>
  );
};

