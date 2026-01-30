import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { StyledProps, StyledPropsWith } from '../../utils/styledComponents';

export type LanguageOption = {
  id: string;
  code: string;
  name: string;
  flag?: string;
};

export interface LanguageSelectorProps {
  selectedLanguageId?: string;
  onLanguageSelect?: (languageId: string) => void;
}

const Container = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const Header = styled(View)`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const IconContainer = styled(View)`
  width: 24px;
  height: 24px;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  align-items: center;
  justify-content: center;
`;

const Icon = styled(Ionicons)`
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const Title = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const OptionsContainer = styled(View)`
  flex-direction: row;
  justify-content: flex-start;
  gap: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const LanguageButton = styled(TouchableOpacity) <{ isSelected: boolean }>`
  flex: 1;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-width: 2px;
  border-color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.borderLight};
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const FlagContainer = styled(View)`
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
`;

const FlagText = styled(Text)`
  font-size: 18px;
`;

const LanguageButtonText = styled(Text) <{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.textLight};
`;

const defaultLanguages: LanguageOption[] = [
  { id: 'en', code: 'en', name: 'English', flag: '🇺🇸' },
  { id: 'zh-cn', code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
  { id: 'ja', code: 'ja', name: '日本語', flag: '🇯🇵' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguageId = 'en',
  onLanguageSelect,
}) => {
  const { t } = useTranslation();

  return (
    <Container>
      <Header>
        <IconContainer>
          <Icon name="globe" size={20} />
        </IconContainer>
        <Title>{t('language.title')}</Title>
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

