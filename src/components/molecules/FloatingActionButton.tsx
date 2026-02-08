import React, { useState, useCallback } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
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
import { GlassView } from 'expo-glass-effect';
import { useTheme } from '../../theme/ThemeProvider';
import { useSettings } from '../../store/hooks';
import type { StyledProps } from '../../utils/styledComponents';
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

// Simplified content container inside TouchableOpacity
const ActionContent = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  padding-left: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-right: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  height: 56px;
  min-width: 56px;
`;

const ActionLabelText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  line-height: ${({ theme }: StyledProps) => theme.typography.fontSize.md * 1.4}px;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const ActionIconContainer = styled(View)`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryLightest};
  align-items: center;
  justify-content: center;
`;

const MainFABContent = styled(View)`
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
`;

export interface FloatingActionButtonProps {
  onManualAdd: () => void;
  onAIAutomatic: () => void;
  bottomOffset?: number;
  isAIRecognizing?: boolean;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onManualAdd,
  onAIAutomatic,
  bottomOffset = 0,
  isAIRecognizing = false,
}) => {
  const theme = useTheme();
  const { settings } = useSettings();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  // Animation values
  const expandAnimation = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  const toggleExpanded = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    const easing = Easing.out(Easing.ease);

    if (newExpanded) {
      expandAnimation.value = withTiming(1, { duration: 250, easing });
      backdropOpacity.value = withTiming(1, { duration: 250, easing });
    } else {
      expandAnimation.value = withTiming(0, { duration: 250, easing });
      backdropOpacity.value = withTiming(0, { duration: 250, easing });
    }
  }, [isExpanded, expandAnimation, backdropOpacity]);

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
  const secondActionStyle = useAnimatedStyle(() => {
    const bottom = interpolate(
      expandAnimation.value,
      [0, 1],
      [0, 128],
      Extrapolation.CLAMP
    );
    const opacity = expandAnimation.value;

    return {
      bottom,
      opacity,
    };
  });

  const bottomPosition = insets.bottom + 100 + bottomOffset;

  const actionsContainerStyle = useAnimatedStyle(() => {
    return {
      bottom: bottomPosition,
    };
  });

  const iconColor = theme.colors.primary;

  // Styles for the GlassView wrappers
  const mainFabGlassStyle: ViewStyle = {
    borderRadius: 28,
    backgroundColor: theme.colors.primary + '20', // Faint primary for liquid effect
  };

  const actionGlassStyle: ViewStyle = {
    borderRadius: 9999, // full
    backgroundColor: theme.colors.surface + 'CC',
  };

  return (
    <FABContainer>
      <Animated.View style={[backdropStyle, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
        <Backdrop visible={isExpanded} onPress={handleBackdropPress} />
      </Animated.View>

      <ActionsContainer style={actionsContainerStyle}>
        {/* Manual Add Button */}
        <ActionButtonWrapper
          style={firstActionStyle}
          pointerEvents={isExpanded ? 'auto' : 'none'}
        >
          <GlassView
            style={actionGlassStyle}
            glassEffectStyle="regular"
            isInteractive={true}
          >
            <TouchableOpacity onPress={handleManualAdd} activeOpacity={0.7}>
              <ActionContent>
                <ActionLabelText>{t('fab.manuallyAdd', 'Manually Add')}</ActionLabelText>
                <ActionIconContainer>
                  <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                </ActionIconContainer>
              </ActionContent>
            </TouchableOpacity>
          </GlassView>
        </ActionButtonWrapper>

        {/* AI Automatic Button */}
        <ActionButtonWrapper
          style={secondActionStyle}
          pointerEvents={isExpanded ? 'auto' : 'none'}
        >
          <GlassView
            style={actionGlassStyle}
            glassEffectStyle="regular"
            isInteractive={true}
          >
            <TouchableOpacity onPress={handleAIAutomatic} activeOpacity={0.7}>
              <ActionContent>
                <ActionLabelText>{t('fab.aiAutomatic', 'AI Automatic')}</ActionLabelText>
                <ActionIconContainer>
                  <MaterialCommunityIcons name="auto-fix" size={20} color={theme.colors.primary} />
                </ActionIconContainer>
              </ActionContent>
            </TouchableOpacity>
          </GlassView>
        </ActionButtonWrapper>

        {/* Main FAB */}
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
          }}
          pointerEvents="auto"
        >
          <GlassView
            style={mainFabGlassStyle}
            glassEffectStyle="regular"
            isInteractive={true}
          >
            <TouchableOpacity
              onPress={toggleExpanded}
              activeOpacity={0.8}
              disabled={isAIRecognizing}
            >
              <MainFABContent>
                {isAIRecognizing ? (
                  <ActivityIndicator size="small" color={iconColor} />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Animated.View style={[{ position: 'absolute' }, addIconOpacity]}>
                      <Ionicons name="add" size={32} color={iconColor} />
                    </Animated.View>
                    <Animated.View style={[{ position: 'absolute' }, closeIconOpacity]}>
                      <Ionicons name="close" size={32} color={iconColor} />
                    </Animated.View>
                  </View>
                )}
              </MainFABContent>
            </TouchableOpacity>
          </GlassView>
        </Animated.View>
      </ActionsContainer>
    </FABContainer>
  );
};
