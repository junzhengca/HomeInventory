import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Image } from 'expo-image';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StyledProps } from '../../utils/styledComponents';
import { uiLogger } from '../../utils/Logger';
import { useTheme } from '../../theme/ThemeProvider';
import { GlassButton } from '../atoms/GlassButton';

export interface PageHeaderProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  titleComponent?: React.ReactNode;
  subtitle?: string;
  avatarUrl?: string;
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
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
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

const AvatarButton = styled(View)`
  border: 2px solid ${({ theme }: StyledProps) => theme.colors.primary};
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
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

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  titleComponent,
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
  const theme = useTheme();

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
      uiLogger.info('Avatar button pressed');
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
          <GlassButton
            onPress={handleBackPress}
            icon="arrow-back"
            style={{ marginRight: theme.spacing.md }}
          />
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
          <GlassView
            glassEffectStyle="regular"
            isInteractive={true}
            style={{
              borderRadius: 50,
              padding: theme.spacing.xs,
            }}
          >
            <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8}>
              <AvatarButton>
                {avatarUrl ? (
                  <AvatarImage
                    source={{ uri: avatarUrl }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    style={{ borderRadius: 20 }}
                  />
                ) : (
                  <AvatarPlaceholder>
                    <Ionicons name="person" size={20} color="white" />
                  </AvatarPlaceholder>
                )}
              </AvatarButton>
            </TouchableOpacity>
          </GlassView>
        </RightSection>
      )}
    </HeaderContainer>
  );
};
