import React from 'react';
import { TouchableOpacity, Image } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';

interface AccountDetailsSectionProps {
  userName?: string;
  planName?: string;
  avatarUrl?: string;
  onUpgradePress?: () => void;
}

const Container = styled.View`
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg}px;
  padding: ${({ theme }) => theme.spacing.lg}px;
  margin-bottom: ${({ theme }) => theme.spacing.xl}px;
  flex-direction: row;
  align-items: center;
  elevation: 2;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
`;

const AvatarContainer = styled.View`
  width: 60px;
  height: 60px;
  border-radius: ${({ theme }) => theme.borderRadius.full}px;
  overflow: hidden;
  margin-right: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme }) => theme.colors.primaryLight};
  align-items: center;
  justify-content: center;
`;

const AvatarImage = styled(Image)`
  width: 100%;
  height: 100%;
`;

const AvatarPlaceholder = styled.View`
  width: 100%;
  height: 100%;
  background-color: ${({ theme }) => theme.colors.primaryLight};
  align-items: center;
  justify-content: center;
`;

const InfoContainer = styled.View`
  flex: 1;
`;

const UserName = styled.Text`
  font-size: ${({ theme }) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.xs}px;
`;

const PlanName = styled.Text`
  font-size: ${({ theme }) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.regular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const UpgradeButton = styled(TouchableOpacity)`
  background-color: ${({ theme }) => theme.colors.primary};
  padding-horizontal: ${({ theme }) => theme.spacing.md}px;
  padding-vertical: ${({ theme }) => theme.spacing.sm}px;
  border-radius: ${({ theme }) => theme.borderRadius.md}px;
`;

const UpgradeButtonText = styled.Text`
  font-size: ${({ theme }) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
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
          <AvatarImage source={{ uri: avatarUrl }} />
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

