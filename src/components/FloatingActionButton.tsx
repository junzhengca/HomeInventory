import React, { useState, useCallback } from 'react';
import { TouchableOpacity, View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import styled from 'styled-components/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import type { StyledProps } from '../utils/styledComponents';
import { useTranslation } from 'react-i18next';

const FABContainer = styled(View)`
  position: absolute;
  bottom: 0;
  right: 0;
  left: 0;
  top: 0;
  pointer-events: box-none;
`;

const Backdrop = styled(Pressable) <{ visible: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  pointer-events: ${({ visible }: { visible: boolean }) => (visible ? 'auto' : 'none')};
`;

const ActionsContainer = styled(Animated.View)`
  position: absolute;
  right: ${({ theme }: StyledProps) => theme.spacing.md}px;
  align-items: flex-end;
  pointer-events: box-none;
`;

const ActionButtonWrapper = styled(Animated.View)`
  position: absolute;
  right: 0;
  pointer-events: auto;
`;

const ActionButton = styled(TouchableOpacity)`
  pointer-events: auto;
`;

const ActionButtonContainer = styled(Animated.View)`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  padding-left: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-right: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  height: 48px;
  min-width: 48px;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.25;
  shadow-radius: 4px;
  elevation: 4;
`;

const ActionLabelText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  line-height: ${({ theme }: StyledProps) => theme.typography.fontSize.sm * 1.4}px;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const ActionIconContainer = styled(View)`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryLightest};
  align-items: center;
  justify-content: center;
`;

const MainFAB = styled(Animated.View)`
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background-color: ${({ theme }: StyledProps) => theme.colors.primary};
  align-items: center;
  justify-content: center;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.3;
  shadow-radius: 8px;
  elevation: 6;
  pointer-events: auto;
`;

interface FloatingActionButtonProps {
  onManualAdd: () => void;
  onAIAutomatic: () => void;
  bottomOffset?: number;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onManualAdd,
  onAIAutomatic,
  bottomOffset = 0,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  // Animation values
  const expandAnimation = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const iconRotation = useSharedValue(0);

  const toggleExpanded = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    const easing = Easing.out(Easing.ease);

    if (newExpanded) {
      expandAnimation.value = withTiming(1, { duration: 250, easing });
      backdropOpacity.value = withTiming(1, { duration: 250, easing });
      iconRotation.value = withTiming(45, { duration: 250, easing });
    } else {
      expandAnimation.value = withTiming(0, { duration: 250, easing });
      backdropOpacity.value = withTiming(0, { duration: 250, easing });
      iconRotation.value = withTiming(0, { duration: 250, easing });
    }
  }, [isExpanded, expandAnimation, backdropOpacity, iconRotation]);

  const handleBackdropPress = useCallback(() => {
    if (isExpanded) {
      toggleExpanded();
    }
  }, [isExpanded, toggleExpanded]);

  const handleManualAdd = useCallback(() => {
    toggleExpanded();
    onManualAdd();
  }, [toggleExpanded, onManualAdd]);

  const handleAIAutomatic = useCallback(() => {
    toggleExpanded();
    onAIAutomatic();
  }, [toggleExpanded, onAIAutomatic]);

  // Main FAB animated style
  const mainFABStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${iconRotation.value}deg`,
        },
      ],
    };
  });

  // Icon opacity animation for add/close transition
  const addIconOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(
      expandAnimation.value,
      [0, 0.5, 1],
      [1, 0, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const closeIconOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(
      expandAnimation.value,
      [0, 0.5, 1],
      [0, 0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  // Backdrop animated style
  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropOpacity.value,
    };
  });

  // First action button (Manual Add) animated style - closest to main FAB
  // Positioned directly above main FAB (56px FAB + 8px gap = 64px)
  const firstActionStyle = useAnimatedStyle(() => {
    const bottom = interpolate(
      expandAnimation.value,
      [0, 1],
      [0, 64],
      Extrapolation.CLAMP
    );
    const opacity = expandAnimation.value;

    return {
      bottom,
      opacity,
    };
  });

  // Second action button (AI Automatic) animated style
  // Positioned above first button (64px + 48px button + 8px gap = 120px)
  const secondActionStyle = useAnimatedStyle(() => {
    const bottom = interpolate(
      expandAnimation.value,
      [0, 1],
      [0, 120],
      Extrapolation.CLAMP
    );
    const opacity = expandAnimation.value;

    return {
      bottom,
      opacity,
    };
  });

  // Action button container animated styles
  const firstContainerStyle = useAnimatedStyle(() => {
    const opacity = expandAnimation.value;

    return {
      opacity,
    };
  });

  const secondContainerStyle = useAnimatedStyle(() => {
    const opacity = expandAnimation.value;

    return {
      opacity,
    };
  });

  const bottomPosition = insets.bottom + 100 + bottomOffset; // 80px for nav bar height + spacing

  const actionsContainerStyle = useAnimatedStyle(() => {
    return {
      bottom: bottomPosition,
    };
  });

  return (
    <FABContainer>
      <Animated.View style={[backdropStyle, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
        <Backdrop visible={isExpanded} onPress={handleBackdropPress} />
      </Animated.View>

      <ActionsContainer style={actionsContainerStyle}>
        {/* Manual Add Button - closest to main FAB */}
        <ActionButtonWrapper
          style={firstActionStyle}
          pointerEvents={isExpanded ? 'auto' : 'none'}
        >
          <ActionButton onPress={handleManualAdd} activeOpacity={0.7}>
            <ActionButtonContainer style={firstContainerStyle}>
              <ActionLabelText>{t('fab.manuallyAdd', 'Manually Add')}</ActionLabelText>
              <ActionIconContainer>
                <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
              </ActionIconContainer>
            </ActionButtonContainer>
          </ActionButton>
        </ActionButtonWrapper>

        {/* AI Automatic Button */}
        <ActionButtonWrapper
          style={secondActionStyle}
          pointerEvents={isExpanded ? 'auto' : 'none'}
        >
          <ActionButton onPress={handleAIAutomatic} activeOpacity={0.7}>
            <ActionButtonContainer style={secondContainerStyle}>
              <ActionLabelText>{t('fab.aiAutomatic', 'AI Automatic')}</ActionLabelText>
              <ActionIconContainer>
                <MaterialCommunityIcons name="auto-fix" size={20} color={theme.colors.primary} />
              </ActionIconContainer>
            </ActionButtonContainer>
          </ActionButton>
        </ActionButtonWrapper>

        {/* Main FAB */}
        <TouchableOpacity onPress={toggleExpanded} activeOpacity={0.8} style={{ position: 'absolute', bottom: 0, right: 0 }}>
          <MainFAB style={mainFABStyle}>
            <Animated.View style={[{ position: 'absolute' }, addIconOpacity]}>
              <Ionicons name="add" size={32} color={theme.colors.surface} />
            </Animated.View>
            <Animated.View style={[{ position: 'absolute' }, closeIconOpacity]}>
              <Ionicons name="close" size={32} color={theme.colors.surface} />
            </Animated.View>
          </MainFAB>
        </TouchableOpacity>
      </ActionsContainer>
    </FABContainer>
  );
};
