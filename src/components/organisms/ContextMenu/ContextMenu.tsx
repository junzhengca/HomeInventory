import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedRef,
    measure,
    runOnJS,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    MeasuredDimensions
} from 'react-native-reanimated';
import { useContextMenu } from './ContextMenuContext';
import { ContextMenuItemData, ContextMenuLayout } from './types';
import * as Haptics from 'expo-haptics';

interface ContextMenuProps {
    children: ReactNode;
    items: ContextMenuItemData[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ children, items }) => {
    const { showMenu } = useContextMenu();
    const animatedRef = useAnimatedRef<View>();
    const isPressed = useSharedValue(false);

    const onShowMenu = (layout: MeasuredDimensions) => {
        showMenu({
            layout: {
                x: layout.x,
                y: layout.y,
                width: layout.width,
                height: layout.height,
                pageX: layout.pageX,
                pageY: layout.pageY,
            },
            items,
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleLongPress = () => {
        'worklet';
        const layout = measure(animatedRef);
        if (layout) {
            runOnJS(onShowMenu)(layout);
        }
    };

    const longPressGesture = Gesture.LongPress()
        .minDuration(250)
        .onStart(() => {
            isPressed.value = true;
            handleLongPress();
        })
        .onFinalize(() => {
            isPressed.value = false;
        });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{
                scale: withTiming(isPressed.value ? 0.94 : 1, {
                    duration: 150,
                })
            }],
            opacity: withTiming(isPressed.value ? 0.9 : 1, {
                duration: 150,
            }),
        };
    });

    return (
        <GestureDetector gesture={longPressGesture}>
            <Animated.View ref={animatedRef} style={animatedStyle}>
                {children}
            </Animated.View>
        </GestureDetector>
    );
};
