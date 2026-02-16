import React from 'react';
import { TouchableOpacity, ScrollView, View, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { StyledProps, StyledPropsWith } from '../../utils/styledComponents';
import { SectionTitle } from '../atoms';

export type ThemeOption = {
  id: string;
  name: string;
  color: string;
};

export interface ThemeChooserProps {
  selectedThemeId?: string;
  onThemeSelect?: (themeId: string) => void;
}

const Container = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const OptionsScroll = styled(ScrollView).attrs(() => ({
  horizontal: true,
  showsHorizontalScrollIndicator: false,
  contentContainerStyle: {
    paddingHorizontal: 4,
  },
}))``;

const OptionsContainer = styled(View)`
  flex-direction: row;
  gap: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const OptionContainer = styled(TouchableOpacity)<{ isSelected: boolean; color: string }>`
  align-items: center;
  justify-content: center;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  border-width: 2px;
  border-color: ${({ theme, isSelected, color }: StyledPropsWith<{ isSelected: boolean; color: string }>) => (isSelected ? color : theme.colors.borderLight)};
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  min-width: 90px;
`;

const ColorCircle = styled(View)<{ color: string }>`
  width: 52px;
  height: 52px;
  border-radius: 26px;
  background-color: ${({ color }: { color: string }) => color};
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const Checkmark = styled(Ionicons)`
  color: #ffffff;
`;

const OptionLabel = styled(Text)<{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) => (isSelected ? theme.typography.fontWeight.bold : theme.typography.fontWeight.medium)};
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) => (isSelected ? theme.colors.text : theme.colors.textSecondary)};
  text-align: center;
`;

const defaultThemes: ThemeOption[] = [
  { id: 'warm-sun', name: 'Warm Sun', color: '#FF701E' },
  { id: 'ocean', name: 'Ocean', color: '#2463EB' },
  { id: 'forest', name: 'Forest', color: '#00A67D' },
  { id: 'lilac', name: 'Lilac', color: '#8B46FF' },
];

export const ThemeChooser: React.FC<ThemeChooserProps> = ({
  selectedThemeId = 'forest',
  onThemeSelect,
}) => {
  const { t } = useTranslation();

  return (
    <Container>
      <SectionTitle title={t('settings.theme')} icon="color-palette" />
      <OptionsScroll>
        <OptionsContainer>
          {defaultThemes.map((themeOption) => {
            const isSelected = selectedThemeId === themeOption.id;
            return (
              <OptionContainer
                key={themeOption.id}
                isSelected={isSelected}
                color={themeOption.color}
                onPress={() => onThemeSelect?.(themeOption.id)}
                activeOpacity={0.7}
              >
                <ColorCircle color={themeOption.color}>
                  {isSelected && (
                    <Checkmark name="checkmark" size={24} />
                  )}
                </ColorCircle>
                <OptionLabel isSelected={isSelected}>{t(`settings.themeNames.${themeOption.id}`)}</OptionLabel>
              </OptionContainer>
            );
          })}
        </OptionsContainer>
      </OptionsScroll>
    </Container>
  );
};

