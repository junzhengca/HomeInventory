import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Image } from 'expo-image';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import type { StyledProps } from '../utils/styledComponents';

interface AccountDetailsSectionProps {
  userName?: string;
  planName?: string;
  avatarUrl?: string;
  onUpgradePress?: () => void;
}

const Container = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.lg}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  flex-direction: row;
  align-items: center;
  elevation: 2;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
`;

const AvatarContainer = styled(View)`
  width: 60px;
  height: 60px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  overflow: hidden;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryLight};
  align-items: center;
  justify-content: center;
`;

const AvatarImage = styled(Image)`
  width: 100%;
  height: 100%;
`;

const AvatarPlaceholder = styled(View)`
  width: 100%;
  height: 100%;
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryLight};
  align-items: center;
  justify-content: center;
`;

const InfoContainer = styled(View)`
  flex: 1;
`;

const UserName = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const PlanName = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.regular};
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

const UpgradeButton = styled(TouchableOpacity)`
  background-color: ${({ theme }: StyledProps) => theme.colors.primary};
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
`;

const UpgradeButtonText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: #ffffff;
`;

export const AccountDetailsSection: React.FC<AccountDetailsSectionProps> = ({
  userName = 'Felix',
  planName = 'Free version',
  avatarUrl,
  onUpgradePress,
}) => {
  return (
    <Container>
      <AvatarContainer>
        {avatarUrl ? (
          <AvatarImage source={{ uri: avatarUrl }} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <AvatarPlaceholder>
            <Ionicons name="person" size={30} color="white" />
          </AvatarPlaceholder>
        )}
      </AvatarContainer>
      <InfoContainer>
        <UserName>{userName}</UserName>
        <PlanName>{planName}</PlanName>
      </InfoContainer>
      <UpgradeButton onPress={onUpgradePress}>
        <UpgradeButtonText>Upgrade now</UpgradeButtonText>
      </UpgradeButton>
    </Container>
  );
};

