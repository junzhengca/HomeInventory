import React, { useMemo } from 'react';
import { View, Text, Pressable, ViewStyle, Alert } from 'react-native';
import styled from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import Animated, {
    useAnimatedRef,
    measure,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useUnitPicker } from '../organisms/UnitPicker/UnitPickerContext';
import { UnitItemData } from '../organisms/UnitPicker/types';
import { useTheme } from '../../theme/ThemeProvider';
import type { StyledProps } from '../../utils/styledComponents';
import { Ionicons } from '@expo/vector-icons';

const PickerTrigger = styled(Animated.View) <{ isCompact?: boolean }>`
  height: ${({ isCompact }) => (isCompact ? '100%' : '48px')};
  background-color: ${({ theme, isCompact }: StyledProps & { isCompact?: boolean }) =>
        isCompact ? 'transparent' : theme.colors.surface};
  border-width: ${({ isCompact }) => (isCompact ? '0px' : '1px')};
  border-color: ${({ theme }: StyledProps) => theme.colors.border};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.lg}px;
  padding-horizontal: ${({ theme, isCompact }: StyledProps & { isCompact?: boolean }) =>
        isCompact ? theme.spacing.sm : theme.spacing.md}px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const ValueText = styled.Text<{ isCompact?: boolean }>`
  font-size: ${({ theme, isCompact }: StyledProps & { isCompact?: boolean }) =>
        isCompact ? theme.typography.fontSize.sm : theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
`;

const PlaceholderText = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textLight};
`;

const IconWrapper = styled.View`
  margin-left: 4px;
`;

export interface UnitPickerProps {
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    style?: ViewStyle;
    variant?: 'default' | 'compact';
}

export const UnitPicker: React.FC<UnitPickerProps> = ({
    value,
    onValueChange,
    placeholder,
    style,
    variant = 'default',
}) => {
    const { t } = useTranslation();
    const { showPicker } = useUnitPicker();
    const theme = useTheme();
    const animatedRef = useAnimatedRef<View>();
    const isPressed = useSharedValue(false);
    const isCompact = variant === 'compact';

    const units = useMemo<UnitItemData[]>(() => [
        { id: 'pcs', label: t('createItem.units.pcs'), value: 'pcs' },
        { id: 'box', label: t('createItem.units.box'), value: 'box' },
        { id: 'pack', label: t('createItem.units.pack'), value: 'pack' },
        { id: 'bottle', label: t('createItem.units.bottle'), value: 'bottle' },
        { id: 'kg', label: t('createItem.units.kg'), value: 'kg' },
        { id: 'ml', label: t('createItem.units.ml'), value: 'ml' },
        { id: 'L', label: t('createItem.units.L'), value: 'L' },
        { id: 'unit', label: t('createItem.units.unit'), value: 'unit' },
        { id: 'custom', label: t('createItem.units.custom'), value: 'custom' },
    ], [t]);

    const handleCustomUnitInput = () => {
        Alert.prompt(
            t('createItem.fields.unit'),
            t('createItem.placeholders.unit'),
            [
                {
                    text: t('common.cancel'),
                    style: 'cancel',
                },
                {
                    text: t('common.confirmation'),
                    onPress: (text?: string) => {
                        if (text && text.trim()) {
                            onValueChange(text.trim());
                        }
                    },
                },
            ],
            'plain-text'
        );
    };

    const handleSelect = (selectedValue: string) => {
        if (selectedValue === 'custom') {
            handleCustomUnitInput();
        } else {
            onValueChange(selectedValue);
        }
    };

    const onShowPicker = (layout: any) => {
        const hasPreset = units.some(u => u.value === value && u.id !== 'custom');
        const isCustom = value && !hasPreset && value !== '';

        showPicker({
            layout: {
                x: layout.x,
                y: layout.y,
                width: layout.width,
                height: layout.height,
                pageX: layout.pageX,
                pageY: layout.pageY,
            },
            items: units,
            selectedValue: isCustom ? 'custom' : value,
            onSelect: handleSelect,
        });
    };

    const tapGesture = Gesture.Tap()
        .onBegin(() => {
            isPressed.value = true;
        })
        .onFinalize(() => {
            isPressed.value = false;
        })
        .onEnd(() => {
            const layout = measure(animatedRef);
            if (layout) {
                runOnJS(onShowPicker)(layout);
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: withTiming(isPressed.value ? 0.7 : 1, { duration: 100 }),
        transform: [{ scale: withTiming(isPressed.value ? 0.95 : 1, { duration: 100 }) }],
    }));

    const selectedUnit = units.find(u => u.value === value);

    return (
        <GestureDetector gesture={tapGesture}>
            <PickerTrigger
                ref={animatedRef}
                style={[animatedStyle, style]}
                isCompact={isCompact}
            >
                {value ? (
                    <ValueText isCompact={isCompact}>{selectedUnit?.label || value}</ValueText>
                ) : (
                    <PlaceholderText>{placeholder || t('createItem.placeholders.unit')}</PlaceholderText>
                )}
                <IconWrapper>
                    <Ionicons
                        name="chevron-down"
                        size={isCompact ? 12 : 16}
                        color={value ? theme.colors.text : theme.colors.textLight}
                    />
                </IconWrapper>
            </PickerTrigger>
        </GestureDetector>
    );
};
