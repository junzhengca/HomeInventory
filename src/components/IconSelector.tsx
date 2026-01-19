import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import { categoryIcons } from '../data/categoryIcons';
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

const IconGrid = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
`;

const IconButton = styled(TouchableOpacity)<{ isSelected: boolean; iconColor?: string }>`
  width: 18%;
  aspect-ratio: 1;
  margin-right: 2.5%;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  background-color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean; iconColor?: string }>) =>
    isSelected ? theme.colors.primaryLightest : theme.colors.surface};
  border-width: 1.5px;
  border-color: ${({ theme, isSelected, iconColor }: StyledPropsWith<{ isSelected: boolean; iconColor?: string }>) =>
    isSelected ? (iconColor || theme.colors.primary) : theme.colors.border};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

interface IconSelectorProps {
  selectedIcon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onIconSelect: (icon: keyof typeof Ionicons.glyphMap) => void;
  showLabel?: boolean;
}

const NUM_COLUMNS = 5;

export const IconSelector: React.FC<IconSelectorProps> = ({
  selectedIcon,
  iconColor,
  onIconSelect,
  showLabel = true,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Container>
      {showLabel && <Label>{t('iconSelector.label')}</Label>}
      <IconGrid>
        {categoryIcons.map((icon, index) => {
          const isSelected = selectedIcon === icon;
          // Remove margin-right from last item in each row (every 5th item)
          const isLastInRow = (index + 1) % NUM_COLUMNS === 0;
          // Remove margin-bottom from items in the last row
          const totalItems = categoryIcons.length;
          const itemsInLastRow = totalItems % NUM_COLUMNS || NUM_COLUMNS;
          const lastRowStartIndex = totalItems - itemsInLastRow;
          const isLastRow = index >= lastRowStartIndex;
          
          return (
            <IconButton
              key={icon}
              isSelected={isSelected}
              iconColor={iconColor}
              onPress={() => onIconSelect(icon)}
              activeOpacity={0.7}
              style={{
                ...(isLastInRow ? { marginRight: 0 } : {}),
                ...(isLastRow ? { marginBottom: 0 } : {}),
              }}
            >
              <Ionicons
                name={icon}
                size={20}
                color={iconColor || (isSelected ? theme.colors.primary : theme.colors.textSecondary)}
              />
            </IconButton>
          );
        })}
      </IconGrid>
    </Container>
  );
};

