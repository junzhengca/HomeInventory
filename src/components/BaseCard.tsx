import React from 'react';
import { TouchableOpacity, View, ViewStyle } from 'react-native';
import styled from 'styled-components/native';
import type { StyledProps, StyledPropsWith } from '../utils/styledComponents';

const CardContainer = styled(View)<{ compact?: boolean; square?: boolean }>`
  flex-direction: ${({ square }: { square?: boolean }) => (square ? 'column' : 'row')};
  align-items: ${({ square }: { square?: boolean }) => (square ? 'stretch' : 'center')};
  ${({ square }: { square?: boolean }) => (square ? 'aspect-ratio: 1; flex: 1;' : '')}
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  padding: ${({ theme, compact }: StyledPropsWith<{ compact?: boolean }>) =>
    compact ? theme.spacing.sm : theme.spacing.md}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  ${({ square, theme }: StyledPropsWith<{ square?: boolean }>) =>
    square ? `margin-horizontal: ${theme.spacing.xs}px;` : ''}
  position: relative;
  
  /* Subtle shadow for the card */
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 8px;
  elevation: 2;
`;

const TouchableCardContainer = styled(TouchableOpacity)<{ compact?: boolean; square?: boolean }>`
  flex-direction: ${({ square }: { square?: boolean }) => (square ? 'column' : 'row')};
  align-items: ${({ square }: { square?: boolean }) => (square ? 'stretch' : 'center')};
  ${({ square }: { square?: boolean }) => (square ? 'aspect-ratio: 1; flex: 1;' : '')}
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  padding: ${({ theme, compact }: StyledPropsWith<{ compact?: boolean }>) =>
    compact ? theme.spacing.sm : theme.spacing.md}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  ${({ square, theme }: StyledPropsWith<{ square?: boolean }>) =>
    square ? `margin-horizontal: ${theme.spacing.xs}px;` : ''}
  position: relative;
  
  /* Subtle shadow for the card */
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 8px;
  elevation: 2;
`;

interface BaseCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  activeOpacity?: number;
  style?: ViewStyle;
  compact?: boolean;
  square?: boolean;
}

/**
 * BaseCard - A reusable card component with consistent styling
 * Used across the app for items, categories, and other card-based UI elements
 * @param compact - If true, uses smaller padding for a more compact appearance
 * @param square - If true, makes the card square (aspect ratio 1:1) and removes row layout
 */
export const BaseCard: React.FC<BaseCardProps> = ({ 
  children, 
  onPress, 
  activeOpacity = 0.8,
  style,
  compact = false,
  square = false
}) => {
  if (onPress) {
    return (
      <TouchableCardContainer 
        onPress={onPress} 
        activeOpacity={activeOpacity}
        style={style}
        compact={compact}
        square={square}
      >
        {children}
      </TouchableCardContainer>
    );
  }
  
  return (
    <CardContainer style={style} compact={compact} square={square}>
      {children}
    </CardContainer>
  );
};

