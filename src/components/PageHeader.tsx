import React from 'react';
import { TouchableOpacity, Image } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface PageHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  avatarUrl?: string;
  onSharePress?: () => void;
  onSettingsPress?: () => void;
  onAvatarPress?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
  showRightButtons?: boolean;
}

const HeaderContainer = styled.View<{ topInset: number }>`
  background-color: ${({ theme }) => theme.colors.primaryLightest};
  padding-top: ${({ topInset }) => topInset + 10}px;
  padding-horizontal: ${({ theme }) => theme.spacing.lg}px;
  padding-bottom: ${({ theme }) => theme.spacing.lg}px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const LeftSection = styled.View`
  flex-direction: row;
  align-items: center;
  flex: 1;
`;

const IconContainer = styled.View`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.borderRadius.full}px;
  background-color: ${({ theme }) => theme.colors.primaryExtraLight};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }) => theme.spacing.md}px;
`;

const Icon = styled(Ionicons)`
  color: ${({ theme }) => theme.colors.primary};
`;

const TextContainer = styled.View`
  flex: 1;
  justify-content: center;
`;

const Title = styled.Text`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl}px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: #1a1a1a;
  line-height: 28px;
`;

const Subtitle = styled.Text`
  font-size: ${({ theme }) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 2px;
`;

const RightSection = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
`;

const ActionButton = styled(TouchableOpacity)`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.borderRadius.full}px;
  background-color: ${({ theme }) => theme.colors.surface};
  align-items: center;
  justify-content: center;
  elevation: 2;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
`;

const ActionIcon = styled(Ionicons)`
  color: ${({ theme }) => theme.colors.textLight};
`;

const BackButton = styled(ActionButton)`
  margin-right: ${({ theme }) => theme.spacing.md}px;
`;

const BackIcon = styled(Ionicons)`
  color: ${({ theme }) => theme.colors.textLight};
`;

const AvatarButton = styled(ActionButton)`
  overflow: hidden;
  border: 1px solid white;
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

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  subtitle,
  avatarUrl,
  onSharePress,
  onSettingsPress,
  onAvatarPress,
  showBackButton = false,
  onBackPress,
  showRightButtons = true,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleSharePress = () => {
    if (onSharePress) {
      onSharePress();
    } else {
      console.log('Share button pressed');
    }
  };

  const handleSettingsPress = () => {
    if (onSettingsPress) {
      onSettingsPress();
    } else {
      console.log('Settings button pressed');
    }
  };

  const handleAvatarPress = () => {
    if (onAvatarPress) {
      onAvatarPress();
    } else {
      console.log('Avatar button pressed');
    }
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <HeaderContainer topInset={insets.top}>
      <LeftSection>
        {showBackButton ? (
          <BackButton onPress={handleBackPress}>
            <BackIcon name="arrow-back" size={24} />
          </BackButton>
        ) : (
          <IconContainer>
            <Icon name={icon} size={22} />
          </IconContainer>
        )}
        <TextContainer>
          <Title>{title}</Title>
          <Subtitle>{subtitle}</Subtitle>
        </TextContainer>
      </LeftSection>
      {showRightButtons && (
        <RightSection>
          <ActionButton onPress={handleSharePress}>
            <ActionIcon name="share-outline" size={24} />
          </ActionButton>
          <ActionButton onPress={handleSettingsPress}>
            <ActionIcon name="settings-outline" size={24} />
          </ActionButton>
          <AvatarButton onPress={handleAvatarPress}>
            {avatarUrl ? (
              <AvatarImage source={{ uri: avatarUrl }} />
            ) : (
              <AvatarPlaceholder>
                <Ionicons name="person" size={24} color="white" />
              </AvatarPlaceholder>
            )}
          </AvatarButton>
        </RightSection>
      )}
    </HeaderContainer>
  );
};


