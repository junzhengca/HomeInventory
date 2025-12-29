import React from 'react';
import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';

export type LanguageOption = {
  id: string;
  code: string;
  name: string;
  flag?: string;
};

interface LanguageSelectorProps {
  selectedLanguageId?: string;
  onLanguageSelect?: (languageId: string) => void;
}

const Container = styled.View`
  margin-bottom: ${({ theme }) => theme.spacing.xl}px;
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const IconContainer = styled.View`
  width: 24px;
  height: 24px;
  margin-right: ${({ theme }) => theme.spacing.sm}px;
  align-items: center;
  justify-content: center;
`;

const Icon = styled(Ionicons)`
  color: ${({ theme }) => theme.colors.text};
`;

const Title = styled.Text`
  font-size: ${({ theme }) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`;

const OptionsContainer = styled.View`
  flex-direction: row;
  justify-content: flex-start;
  gap: ${({ theme }) => theme.spacing.md}px;
`;

const LanguageButton = styled(TouchableOpacity)<{ isSelected: boolean }>`
  flex: 1;
  padding-vertical: ${({ theme }) => theme.spacing.md}px;
  padding-horizontal: ${({ theme }) => theme.spacing.lg}px;
  border-radius: ${({ theme }) => theme.borderRadius.xl}px;
  background-color: #ffffff;
  border-width: 2px;
  border-color: ${({ theme, isSelected }) =>
    isSelected ? theme.colors.primary : theme.colors.borderLight};
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
`;

const FlagContainer = styled.View`
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
`;

const FlagText = styled.Text`
  font-size: 18px;
`;

const LanguageButtonText = styled.Text<{ isSelected: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme, isSelected }) =>
    isSelected ? theme.colors.primary : theme.colors.textLight};
`;

const defaultLanguages: LanguageOption[] = [
  { id: 'zh-cn', code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
  { id: 'en', code: 'en', name: 'English', flag: '🇺🇸' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguageId = 'zh-cn',
  onLanguageSelect,
}) => {
  return (
    <Container>
      <Header>
        <IconContainer>
          <Icon name="globe" size={20} />
        </IconContainer>
        <Title>语言设置</Title>
      </Header>
      <OptionsContainer>
        {defaultLanguages.map((language) => (
          <LanguageButton
            key={language.id}
            isSelected={selectedLanguageId === language.id}
            onPress={() => onLanguageSelect?.(language.id)}
            activeOpacity={0.7}
          >
            {language.flag && (
              <FlagContainer>
                <FlagText>{language.flag}</FlagText>
              </FlagContainer>
            )}
            <LanguageButtonText isSelected={selectedLanguageId === language.id}>
              {language.name}
            </LanguageButtonText>
          </LanguageButton>
        ))}
      </OptionsContainer>
    </Container>
  );
};

