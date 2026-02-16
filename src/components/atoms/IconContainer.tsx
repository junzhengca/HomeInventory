import React from 'react';
import { View } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import type { StyledProps } from '../../utils/styledComponents';

const Container = styled(View)`
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  align-items: center;
  justify-content: center;
`;

const Icon = styled(Ionicons)`
  color: ${({ theme }: StyledProps) => theme.colors.primary};
`;

export interface IconContainerProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  size?: number;
}

/**
 * IconContainer - A reusable component for icons with rounded corner containers
 * Displays an icon in a light grey rounded square container with blue icon color
 */
export const IconContainer: React.FC<IconContainerProps> = ({
  icon,
  iconColor,
  size = 22,
}) => {
  const theme = useTheme();

  return (
    <Container>
      <Icon
        name={icon}
        size={size}
        color={iconColor || theme.colors.primary}
      />
    </Container>
  );
};
