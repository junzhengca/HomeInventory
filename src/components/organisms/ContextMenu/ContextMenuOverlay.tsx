import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Dimensions } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    withTiming,
    useSharedValue,
    interpolate,
    Extrapolate,
} from 'react-native-reanimated';
import { useContextMenu } from './ContextMenuContext';
import { useTheme } from '../../../theme/ThemeProvider';
import { ContextMenuItemData } from './types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { uiLogger } from '../../../utils/Logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ContextMenuOverlay: React.FC = () => {
    const { state, hideMenu } = useContextMenu();
    const { isVisible, layout, items } = state;
    const theme = useTheme();

    const animation = useSharedValue(0);

    const SPRING_CONFIG = {
        damping: 25,
        stiffness: 300,
        mass: 0.8,
    };

    useEffect(() => {
        animation.value = withSpring(isVisible ? 1 : 0, SPRING_CONFIG);
    }, [isVisible, animation]);

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: animation.value * 0.5,
    }));

    const menuStyle = useAnimatedStyle(() => {
        if (!layout) return { opacity: 0 };

        const scale = interpolate(animation.value, [0, 1], [0.8, 1], Extrapolate.CLAMP);
        const opacity = animation.value;

        // Basic positioning logic
        let top = layout.pageY + layout.height + 10;
        let left = layout.pageX;

        // Adjust if it goes off screen
        if (top + 200 > SCREEN_HEIGHT) {
            top = layout.pageY - 220; // Show above
        }
        if (left + 200 > SCREEN_WIDTH) {
            left = SCREEN_WIDTH - 210;
        }

        return {
            position: 'absolute',
            top,
            left,
            transform: [{ scale }],
            opacity,
        };
    });


    if (!layout && !isVisible) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents={isVisible ? 'auto' : 'none'}>
            <Pressable style={StyleSheet.absoluteFill} onPress={hideMenu}>
                <Animated.View style={[styles.backdrop, backdropStyle, { backgroundColor: '#000' }]} />
            </Pressable>


            <Animated.View style={[styles.menuContainer, menuStyle, { backgroundColor: theme.colors.surface }]}>
                {items.map((item) => (
                    <Pressable
                        key={item.id}
                        style={({ pressed }) => [
                            styles.menuItem,
                            { borderBottomColor: theme.colors.borderLight },
                            pressed && { backgroundColor: theme.colors.primaryExtraLight }
                        ]}
                        onPress={() => {
                            hideMenu();
                            // Execute action in next frame to avoid conflict with unmount/state update
                            // and ensure the menu is hidden first
                            requestAnimationFrame(() => {
                                try {
                                    item.onPress();
                                } catch (e) {
                                    uiLogger.error('Context menu action failed', e);
                                }
                            });
                        }}
                    >
                        {item.icon && (
                            <MaterialCommunityIcons
                                name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                                size={20}
                                color={item.isDestructive ? theme.colors.error : theme.colors.text}
                                style={styles.menuIcon}
                            />
                        )}
                        <Text style={[
                            styles.menuLabel,
                            { color: item.isDestructive ? theme.colors.error : theme.colors.text }
                        ]}>
                            {item.label}
                        </Text>
                    </Pressable>
                ))}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    menuContainer: {
        width: 200,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    menuIcon: {
        marginRight: 12,
    },
    menuLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
});
