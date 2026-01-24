import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import type { StyledProps } from '../../utils/styledComponents';

const HeaderContainer = styled(View)`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-top: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  padding-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
`;

const CloseButton = styled(TouchableOpacity)`
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  align-items: center;
  justify-content: center;
  margin-left: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const TitleContainer = styled(View)`
  flex: 1;
  justify-content: center;
`;

const Title = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.xxl}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const Subtitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

export interface BottomSheetHeaderProps {
  title: string;
  subtitle: string;
  onClose: () => void;
  closeIcon?: keyof typeof Ionicons.glyphMap;
}

export const HEADER_HEIGHT = 96;

/**
 * Simple fixed header component for bottom sheets.
 * Provides a consistent layout with title, subtitle, and close button.
 */
export const BottomSheetHeader: React.FC<BottomSheetHeaderProps> = ({
  title,
  subtitle,
  onClose,
  closeIcon = 'close',
}) => {
  const theme = useTheme();
  return (
    <HeaderContainer>
      <TitleContainer>
        <Title>{title}</Title>
        <Subtitle numberOfLines={1}>{subtitle}</Subtitle>
      </TitleContainer>
      <CloseButton onPress={onClose}>
        <Ionicons name={closeIcon} size={20} color={theme.colors.textSecondary} />
      </CloseButton>
    </HeaderContainer>
  );
};
