import React from 'react';
import { TouchableOpacity, View, ViewStyle } from 'react-native';
import styled from 'styled-components/native';
import type { StyledProps, StyledPropsWith } from '../utils/styledComponents';

const CardContainer = styled(View)<{ compact?: boolean }>`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  padding: ${({ theme, compact }: StyledPropsWith<{ compact?: boolean }>) => 
    compact ? theme.spacing.sm : theme.spacing.md}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  position: relative;
  
  /* Subtle shadow for the card */
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 8px;
  elevation: 2;
`;

const TouchableCardContainer = styled(TouchableOpacity)<{ compact?: boolean }>`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  padding: ${({ theme, compact }: StyledPropsWith<{ compact?: boolean }>) => 
    compact ? theme.spacing.sm : theme.spacing.md}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
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
}

/**
 * BaseCard - A reusable card component with consistent styling
 * Used across the app for items, categories, and other card-based UI elements
 * @param compact - If true, uses smaller padding for a more compact appearance
 */
export const BaseCard: React.FC<BaseCardProps> = ({ 
  children, 
  onPress, 
  activeOpacity = 0.8,
  style,
  compact = false
}) => {
  if (onPress) {
    return (
      <TouchableCardContainer 
        onPress={onPress} 
        activeOpacity={activeOpacity}
        style={style}
        compact={compact}
      >
        {children}
      </TouchableCardContainer>
    );
  }
  
  return (
    <CardContainer style={style} compact={compact}>
      {children}
    </CardContainer>
  );
};

