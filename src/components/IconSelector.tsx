import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { categoryIcons } from '../data/categoryIcons';
import type { StyledProps, StyledPropsWith } from '../utils/styledComponents';

const Container = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
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
  margin: -${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const IconButton = styled(TouchableOpacity)<{ isSelected: boolean; iconColor?: string }>`
  width: 15%;
  aspect-ratio: 1;
  margin: 1.5%;
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
}

export const IconSelector: React.FC<IconSelectorProps> = ({
  selectedIcon,
  iconColor,
  onIconSelect,
}) => {
  const theme = useTheme();

  return (
    <Container>
      <Label>选择图标</Label>
      <IconGrid>
        {categoryIcons.map((icon) => {
          const isSelected = selectedIcon === icon;
          return (
            <IconButton
              key={icon}
              isSelected={isSelected}
              iconColor={iconColor}
              onPress={() => onIconSelect(icon)}
              activeOpacity={0.7}
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

