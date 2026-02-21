import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Dimensions } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    interpolate,
    Extrapolate,
} from 'react-native-reanimated';
import { useUnitPicker } from './UnitPickerContext';
import { useTheme } from '../../../theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DROPDOWN_WIDTH = 110;
const ITEM_HEIGHT = 44;

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    pickerContainer: {
        width: DROPDOWN_WIDTH,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    scrollIndicator: {
        paddingVertical: 4,
    },
    item: {
        width: '100%',
        height: ITEM_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    itemLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export const UnitDropdownOverlay: React.FC = () => {
    const { state, hidePicker } = useUnitPicker();
    const { isVisible, layout, items, selectedValue, onSelect } = state;
    const theme = useTheme();

    const animation = useSharedValue(0);

    useEffect(() => {
        const SPRING_CONFIG = {
            damping: 25,
            stiffness: 300,
            mass: 0.8,
        };
        animation.value = withSpring(isVisible ? 1 : 0, SPRING_CONFIG);
    }, [isVisible, animation]);

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: animation.value * 1, // Full opacity as requested "just like menu"
    }));

    const pickerStyle = useAnimatedStyle(() => {
        if (!layout) return { opacity: 0 };

        const scale = interpolate(animation.value, [0, 1], [0.8, 1], Extrapolate.CLAMP);
        const opacity = animation.value;

        // Position it centered horizontally to the trigger
        let left = layout.pageX + (layout.width / 2) - (DROPDOWN_WIDTH / 2);

        // Vertical positioning - try to center it around the trigger's Y
        const dropdownHeight = items.length * ITEM_HEIGHT + 40; // Approx
        let top = layout.pageY + (layout.height / 2) - (dropdownHeight / 2);

        // Bounds checking
        if (top < 60) top = 60;
        if (top + dropdownHeight > SCREEN_HEIGHT - 60) top = SCREEN_HEIGHT - dropdownHeight - 60;
        if (left < 10) left = 10;
        if (left + DROPDOWN_WIDTH > SCREEN_WIDTH - 10) left = SCREEN_WIDTH - DROPDOWN_WIDTH - 10;

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
            <Pressable style={StyleSheet.absoluteFill} onPress={hidePicker}>
                <Animated.View style={[styles.backdrop, backdropStyle, { backgroundColor: 'rgba(0,0,0,0.1)' }]} />
            </Pressable>

            <Animated.View style={[styles.pickerContainer, pickerStyle, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.scrollIndicator}>
                    <Ionicons name="chevron-up" size={14} color={theme.colors.textLight} />
                </View>

                {items.map((item) => (
                    <Pressable
                        key={item.id}
                        style={({ pressed }) => [
                            styles.item,
                            pressed && { backgroundColor: theme.colors.primaryExtraLight }
                        ]}
                        onPress={() => {
                            onSelect(item.value);
                            hidePicker();
                        }}
                    >
                        <Text style={[
                            styles.itemLabel,
                            {
                                color: item.value === selectedValue ? theme.colors.primary : theme.colors.text,
                                // If it's a Chinese character, it might need special handling but usually fine
                            }
                        ]}>
                            {item.label}
                        </Text>
                    </Pressable>
                ))}

                <View style={styles.scrollIndicator}>
                    <Ionicons name="chevron-down" size={14} color={theme.colors.textLight} />
                </View>
            </Animated.View>
        </View>
    );
};
