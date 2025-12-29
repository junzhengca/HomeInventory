import React, { useState } from 'react';
import { TextInput } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

const Container = styled.View<{ isFocused: boolean }>`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.xl}px;
  padding-horizontal: ${({ theme }) => theme.spacing.md}px;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
  height: 48px;
  border-width: 1.5px;
  border-color: ${({ theme, isFocused }) =>
    isFocused ? theme.colors.inputFocus : theme.colors.borderLight};
`;

const SearchIcon = styled(Ionicons)`
  color: ${({ theme }) => theme.colors.textLight};
  margin-right: ${({ theme }) => theme.spacing.sm}px;
`;

const Input = styled(TextInput)`
  flex: 1;
  font-size: ${({ theme }) => theme.typography.fontSize.md}px;
  color: ${({ theme }) => theme.colors.text};
  height: 100%;
  padding-vertical: 0;
`;

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = '找找看... (例如: 吹风机)',
  value,
  onChangeText,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const theme = useTheme();

  return (
    <Container isFocused={isFocused}>
      <SearchIcon name="search-outline" size={22} />
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textLight}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoCorrect={false}
      />
    </Container>
  );
};

