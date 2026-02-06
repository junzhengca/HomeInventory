import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import type { StyledProps, StyledPropsWith } from '../../utils/styledComponents';
import { useTranslation } from 'react-i18next';

const CardContainer = styled(TouchableOpacity) <{ isActive?: boolean; backgroundColor?: string }>`
  background-color: ${({ isActive, backgroundColor, theme }: StyledPropsWith<{ isActive?: boolean; backgroundColor?: string }>) =>
    isActive ? theme.colors.primary : (backgroundColor || theme.colors.primaryLightest || theme.colors.surface)};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  min-height: 140px;

  /* Shadow */
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.1;
  shadow-radius: 8px;
  elevation: 5;
`;

const ContentContainer = styled(View)`
  flex: 1;
`;

const HeaderRow = styled(View)`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const Title = styled(Text) <{ isActive?: boolean }>`
  color: ${({ isActive, theme }: StyledPropsWith<{ isActive?: boolean }>) => (isActive ? theme.colors.surface : theme.colors.text)};
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.xxl}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const Subtitle = styled(Text) <{ isActive?: boolean }>`
  color: ${({ isActive, theme }: StyledPropsWith<{ isActive?: boolean }>) => (isActive ? 'rgba(255, 255, 255, 0.7)' : theme.colors.textSecondary)};
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
`;

const Badge = styled(View)`
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.sm}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  flex-direction: row;
  align-items: center;
  margin-left: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const BadgeText = styled(Text)`
  color: #FFD700;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
`;

const SwitchButton = styled(TouchableOpacity)`
  align-items: center;
  justify-content: center;
  padding-left: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const SwitchIconContainer = styled(View)`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryExtraLight || 'rgba(0, 0, 0, 0.05)'};
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
`;

const SwitchText = styled(Text)`
  font-size: 10px;
  color: #757575;
`;

export interface HomeCardProps {
  name: string;
  isActive?: boolean;
  backgroundColor?: string;
  onPress?: () => void;
  onSwitchPress?: () => void;
  showSwitchButton?: boolean;
  canShareInventory?: boolean;
  canShareTodos?: boolean;
}

export const HomeCard: React.FC<HomeCardProps> = ({
  name,
  isActive = false,
  backgroundColor,
  onPress,
  onSwitchPress,
  showSwitchButton = false,
  canShareInventory = false,
  canShareTodos = false,
}) => {
  const { t } = useTranslation();

  const handleSwitchPress = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onSwitchPress?.();
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <CardContainer
        isActive={isActive}
        backgroundColor={backgroundColor}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.9}
        style={{ flex: 1 }}
      >
        <ContentContainer>
          <HeaderRow>
            <Ionicons
              name="home-outline"
              size={24}
              color={isActive ? "#FFFFFF" : "rgba(0, 0, 0, 0.4)"}
            />
          </HeaderRow>
          <Title isActive={isActive}>{name}</Title>
          <Subtitle isActive={isActive}>
            {[
              canShareInventory && t('share.inventory.label'),
              canShareTodos && t('share.shoppingList.label')
            ].filter(Boolean).join(' · ') || (isActive ? t('share.home.currentHome') : '')}
          </Subtitle>
        </ContentContainer>
      </CardContainer>

      {showSwitchButton && (
        <SwitchButton onPress={handleSwitchPress}>
          <SwitchIconContainer>
            <Ionicons name="grid-outline" size={24} color="#455A64" />
          </SwitchIconContainer>
          <SwitchText>{t('share.home.switch')}</SwitchText>
        </SwitchButton>
      )}
    </View>
  );
};
