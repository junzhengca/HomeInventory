import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Image } from 'expo-image';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StyledProps } from '../utils/styledComponents';

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

const HeaderContainer = styled(View)<{ topInset: number }>`
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryLightest};
  padding-top: ${({ topInset }: { topInset: number }) => topInset + 10}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  padding-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const LeftSection = styled(View)`
  flex-direction: row;
  align-items: center;
  flex: 1;
`;

const IconContainer = styled(View)`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryExtraLight};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const Icon = styled(Ionicons)`
  color: ${({ theme }: StyledProps) => theme.colors.primary};
`;

const TextContainer = styled(View)`
  flex: 1;
  justify-content: center;
`;

const Title = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.xxl}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: #1a1a1a;
  line-height: 28px;
`;

const Subtitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-top: 2px;
`;

const RightSection = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const ActionButton = styled(TouchableOpacity)`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  align-items: center;
  justify-content: center;
  elevation: 2;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
`;

const ActionIcon = styled(Ionicons)`
  color: ${({ theme }: StyledProps) => theme.colors.textLight};
`;

const BackButton = styled(ActionButton)`
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const BackIcon = styled(Ionicons)`
  color: ${({ theme }: StyledProps) => theme.colors.textLight};
`;

const AvatarButton = styled(ActionButton)`
  overflow: hidden;
  border: 1px solid white;
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
          <AvatarButton onPress={handleAvatarPress}>
            {avatarUrl ? (
              <AvatarImage source={{ uri: avatarUrl }} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <AvatarPlaceholder>
                <Ionicons name="person" size={20} color="white" />
              </AvatarPlaceholder>
            )}
          </AvatarButton>
        </RightSection>
      )}
    </HeaderContainer>
  );
};


