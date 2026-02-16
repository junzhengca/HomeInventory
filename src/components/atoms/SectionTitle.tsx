import React from 'react';
import { View, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import type { StyledProps } from '../../utils/styledComponents';

const Container = styled(View)`
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
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

const IconText = styled(Text)`
  font-size: 18px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

const TitleText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

export interface SectionTitleProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconText?: string; // For text-based icons like currency symbol
}

/**
 * SectionTitle - A reusable component for section titles with icons
 * Displays a section title with an icon on the left, using secondary text color
 */
export const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  icon,
  iconText,
}) => {
  return (
    <Container>
      <IconContainer>
        {icon ? (
          <Icon name={icon} size={20} />
        ) : iconText ? (
          <IconText>{iconText}</IconText>
        ) : null}
      </IconContainer>
      <TitleText>{title}</TitleText>
    </Container>
  );
};
