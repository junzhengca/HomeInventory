import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StyledProps } from '../utils/styledComponents';

export type ToastType = 'success' | 'info' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

const AnimatedContainer = Animated.createAnimatedComponent(
  styled.View<StyledProps>`
    position: absolute;
    left: ${({ theme }: StyledProps) => theme.spacing.md}px;
    right: ${({ theme }: StyledProps) => theme.spacing.md}px;
    z-index: 9999;
  `
);

const ToastContainer = styled.View<StyledProps & { type: ToastType }>`
  background-color: ${({ theme, type }: StyledProps & { type: ToastType }) => {
    switch (type) {
      case 'success':
        return theme.colors.success;
      case 'error':
        return theme.colors.error;
      case 'info':
      default:
        return theme.colors.primary;
    }
  }};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  flex-direction: row;
  align-items: center;
  elevation: 4;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
`;

const IconContainer = styled(View)`
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const ToastText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) =>
    theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.surface};
  flex: 1;
`;

const getIconName = (type: ToastType): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'success':
      return 'checkmark-circle';
    case 'error':
      return 'close-circle';
    case 'info':
    default:
      return 'information-circle';
  }
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  visible,
  onHide,
  duration = 3000,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-200);
  const opacity = useSharedValue(0);
  const autoDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const dismissToast = useCallback(() => {
    translateY.value = withTiming(-200, {
      duration: 250,
      easing: Easing.in(Easing.ease),
    });
    opacity.value = withTiming(0, {
      duration: 250,
      easing: Easing.in(Easing.ease),
    });

    setTimeout(() => {
      onHide();
    }, 250);
  }, [translateY, opacity, onHide]);

  const cancelAutoDismiss = useCallback(() => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (visible) {
      // Slide in
      translateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });

      // Auto-dismiss
      autoDismissTimerRef.current = setTimeout(() => {
        runOnJS(dismissToast)();
      }, duration);

      return () => {
        cancelAutoDismiss();
      };
    } else {
      // Reset position when hidden
      translateY.value = -200;
      opacity.value = 0;
      cancelAutoDismiss();
    }
  }, [visible, duration, translateY, opacity, dismissToast, cancelAutoDismiss]);

  // Pan gesture for swipe up to dismiss
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // Cancel auto-dismiss when user starts interacting
      runOnJS(cancelAutoDismiss)();
    })
    .onUpdate((event) => {
      // Only allow upward swipes (negative translationY)
      if (event.translationY < 0) {
        translateY.value = event.translationY;
        // Fade out as user swipes up
        const progress = Math.min(Math.abs(event.translationY) / 100, 1);
        opacity.value = 1 - progress * 0.5;
      }
    })
    .onEnd((event) => {
      // If swiped up more than 50px, dismiss the toast
      if (event.translationY < -50) {
        runOnJS(dismissToast)();
      } else {
        // Spring back to original position
        translateY.value = withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
        opacity.value = withTiming(1, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  if (!visible) {
    return null;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <AnimatedContainer
        style={[
          animatedStyle,
          {
            top: insets.top + 8,
          },
        ]}
      >
        <ToastContainer type={type}>
          <IconContainer>
            <Ionicons name={getIconName(type)} size={20} color="white" />
          </IconContainer>
          <ToastText>{message}</ToastText>
        </ToastContainer>
      </AnimatedContainer>
    </GestureDetector>
  );
};
