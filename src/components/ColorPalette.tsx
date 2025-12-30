import React from 'react';
import { TouchableOpacity, ScrollView, View, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { categoryColors } from '../data/categoryColors';
import type { StyledProps, StyledPropsWith } from '../utils/styledComponents';

const Container = styled(View)`
  /* No margin-bottom - parent FormSection handles spacing */
`;

const Label = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const ColorScroll = styled(ScrollView).attrs(() => ({
  horizontal: true,
  showsHorizontalScrollIndicator: false,
  contentContainerStyle: {
    paddingRight: 16,
  },
}))``;

const ColorContainer = styled(View)`
  flex-direction: row;
  align-items: center;
`;

const ColorButton = styled(TouchableOpacity)<{ isSelected: boolean; color: string }>`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background-color: ${({ color }: { color: string }) => color};
  border-width: 3px;
  border-color: ${({ theme, isSelected, color }: StyledPropsWith<{ isSelected: boolean; color: string }>) =>
    isSelected ? color : theme.colors.borderLight};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

interface ColorPaletteProps {
  selectedColor?: string;
  onColorSelect: (color: string) => void;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  selectedColor,
  onColorSelect,
}) => {
  const { t } = useTranslation();

  return (
    <Container>
      <Label>{t('colorPalette.label')}</Label>
      <ColorScroll>
        <ColorContainer>
          {categoryColors.map((color) => {
            const isSelected = selectedColor === color;
            // Determine if we should show a white or black checkmark based on color brightness
            const showCheckmark = isSelected;
            
            return (
              <ColorButton
                key={color}
                isSelected={isSelected}
                color={color}
                onPress={() => onColorSelect(color)}
                activeOpacity={0.7}
              >
                {showCheckmark && (
                  <Ionicons name="checkmark" size={20} color="#ffffff" />
                )}
              </ColorButton>
            );
          })}
        </ColorContainer>
      </ColorScroll>
    </Container>
  );
};

