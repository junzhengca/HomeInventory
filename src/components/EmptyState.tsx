import React from 'react';
import { View, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import type { StyledProps } from '../utils/styledComponents';

const Container = styled(View)`
  flex: 1;
  align-items: center;
  justify-content: flex-start;
  padding: ${({ theme }: StyledProps) => theme.spacing.xxl}px;
  padding-top: ${({ theme }: StyledProps) => theme.spacing.xxl * 1.5}px;
  min-height: 300px;
`;

const IconContainer = styled(View)`
  width: 120px;
  height: 120px;
  border-radius: 60px;
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryExtraLight};
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const Icon = styled(Ionicons)`
  color: ${({ theme }: StyledProps) => theme.colors.primary};
`;

const Title = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.xl}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  text-align: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const Description = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  text-align: center;
  line-height: ${({ theme }: StyledProps) => theme.typography.lineHeight.relaxed * theme.typography.fontSize.md}px;
  max-width: 280px;
`;

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description }) => {
  return (
    <Container>
      <IconContainer>
        <Icon name={icon} size={56} />
      </IconContainer>
      <Title>{title}</Title>
      <Description>{description}</Description>
    </Container>
  );
};

