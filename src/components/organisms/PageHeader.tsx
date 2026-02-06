import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Image } from 'expo-image';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StyledProps } from '../../utils/styledComponents';

export interface PageHeaderProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  titleComponent?: React.ReactNode;
  subtitle?: string;
  avatarUrl?: string;
  ownerAvatarUrl?: string;
  onSharePress?: () => void;
  onSettingsPress?: () => void;
  onAvatarPress?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
  showRightButtons?: boolean;
}

const HeaderContainer = styled(View) <{ topInset: number }>`
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
  background-color: ${({ theme }: StyledProps) =>
    theme.colors.primaryExtraLight};
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
  color: ${({ theme }: StyledProps) => theme.colors.text};
  line-height: 28px;
`;

const Subtitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }: StyledProps) =>
    theme.typography.fontWeight.medium};
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

const BackButton = styled(ActionButton)`
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const BackIcon = styled(Ionicons)`
  color: ${({ theme }: StyledProps) => theme.colors.textLight};
`;

const AvatarButton = styled(ActionButton)`
  overflow: hidden;
  border: 2px solid ${({ theme }: StyledProps) => theme.colors.primary};
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

const StackedContainer = styled(View)`
  width: 44px;
  height: 44px;
`;

const MainAvatarWrapper = styled(View)`
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  border-width: 2px;
  border-color: ${({ theme }: StyledProps) => theme.colors.primary};
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryLight};
  overflow: hidden;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
`;

const OwnerAvatarWrapper = styled(View)`
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  border-width: 2px;
  border-color: ${({ theme }: StyledProps) => theme.colors.primaryLightest};
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryExtraLight};
  overflow: hidden;
  position: absolute;
  bottom: 0;
  right: 0;
  z-index: 1;
`;

const StackedAvatarImage = styled(Image)`
  width: 100%;
  height: 100%;
`;

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  titleComponent,
  subtitle,
  avatarUrl,
  ownerAvatarUrl,
  onSharePress,
  onSettingsPress,
  onAvatarPress,
  showBackButton = false,
  onBackPress,
  showRightButtons = true,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const _handleSharePress = () => {
    if (onSharePress) {
      onSharePress();
    }
  };

  const _handleSettingsPress = () => {
    if (onSettingsPress) {
      onSettingsPress();
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
        ) : icon ? (
          <IconContainer>
            <Icon name={icon} size={22} />
          </IconContainer>
        ) : null}
        <TextContainer>
          {titleComponent ? titleComponent : <Title>{title}</Title>}
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
        </TextContainer>
      </LeftSection>
      {showRightButtons && (
        <RightSection>
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8}>
            {ownerAvatarUrl ? (
              <StackedContainer>
                <MainAvatarWrapper>
                  {avatarUrl ? (
                    <StackedAvatarImage
                      source={{ uri: avatarUrl }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <Ionicons name="person" size={18} color="white" style={{ alignSelf: 'center', marginTop: 6 }} />
                  )}
                </MainAvatarWrapper>
                <OwnerAvatarWrapper>
                  <StackedAvatarImage
                    source={{ uri: ownerAvatarUrl }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                </OwnerAvatarWrapper>
              </StackedContainer>
            ) : (
              <AvatarButton disabled={true} style={{ pointerEvents: 'none' }}>
                {avatarUrl ? (
                  <AvatarImage
                    source={{ uri: avatarUrl }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <AvatarPlaceholder>
                    <Ionicons name="person" size={20} color="white" />
                  </AvatarPlaceholder>
                )}
              </AvatarButton>
            )}
          </TouchableOpacity>
        </RightSection>
      )}
    </HeaderContainer>
  );
};
