import React, { useEffect } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  measure,
  runOnUI,
  useAnimatedRef,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import type { StyledProps, StyledPropsWith } from '../../utils/styledComponents';

import { useTheme } from '../../theme/ThemeProvider';
import { GlassButton } from '../atoms/GlassButton';

const Container = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const Header = styled(View)`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const TitleContainer = styled(View)`
  flex-direction: row;
  align-items: center;
`;

const Title = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const CountBadge = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  padding-vertical: 2px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.sm}px;
  margin-left: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const CountText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
`;

interface CollapsibleFilterPanelProps {
  title: string;
  count?: number;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}

const ContentContainer = styled(View)`
  background-color: transparent;
  padding-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const CollapseButtonContainer = styled(View)`
  align-items: center;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const CollapseButton = styled(TouchableOpacity)`
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

export const CollapsibleFilterPanel: React.FC<CollapsibleFilterPanelProps> = ({
  title,
  count,
  children,
  isExpanded,
  onToggle,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const listHeight = useSharedValue(0);
  const open = useSharedValue(isExpanded);

  // Sync shared value with prop
  useEffect(() => {
    open.value = isExpanded;
  }, [isExpanded, open]);

  const animatedStyle = useAnimatedStyle(() => {
    const heightValue = open.value ? listHeight.value : 0;
    return {
      height: listHeight.value === 0 ? undefined : withTiming(heightValue, { duration: 300 }),
      opacity: withTiming(open.value ? 1 : 0, { duration: 300 }),
      overflow: 'hidden',
    };
  });

  return (
    <Container>
      <Header>
        <TitleContainer>
          <Title>{title}</Title>
          {count !== undefined && (
            <CountBadge>
              <CountText>{count}</CountText>
            </CountBadge>
          )}
        </TitleContainer>
        <GlassButton
          onPress={onToggle}
          icon={isExpanded ? "funnel" : "funnel-outline"}
          text={t('common.filter')}
          tintColor={isExpanded ? theme.colors.primary : undefined}
        />
      </Header>

      <Animated.View style={[animatedStyle, { marginHorizontal: -theme.spacing.md }]}>
        <View
          onLayout={(event) => {
            'worklet';
            listHeight.value = event.nativeEvent.layout.height;
          }}
          style={{ position: 'absolute', width: '100%', top: 0 }}
        >
          <ContentContainer>
            {children}
            <CollapseButtonContainer>
              <CollapseButton onPress={onToggle} activeOpacity={0.7}>
                <Ionicons name="chevron-up" size={20} color="#888888" />
              </CollapseButton>
            </CollapseButtonContainer>
          </ContentContainer>
        </View>
      </Animated.View>
    </Container>
  );
};
