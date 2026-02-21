import React from 'react';
import { View, Text, TouchableOpacity, StyleProp, ViewStyle, ActivityIndicator } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { StyledProps } from '../../utils/styledComponents';

interface GlassButtonProps {
    onPress: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    text?: string;
    tintColor?: string;
    textColor?: string;
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
    loading?: boolean;
}

const StyledGlassView = styled(GlassView)`
  border-radius: 20px;
`;

const ContentContainer = styled(TouchableOpacity) <{ hasText: boolean }>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding-horizontal: ${({ theme, hasText }: StyledProps & { hasText: boolean }) =>
        hasText ? theme.spacing.md : 0}px;
  height: 40px;
  min-width: 40px;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
`;

const ButtonText = styled(Text) <{ tintColor?: string }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme, tintColor }: StyledProps & { tintColor?: string }) =>
        tintColor || theme.colors.text};
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

export const GlassButton: React.FC<GlassButtonProps> = ({
    onPress,
    icon,
    text,
    tintColor,
    textColor,
    style,
    disabled,
    loading
}) => {
    const theme = useTheme();
    const iconColor = textColor || tintColor || theme.colors.text;

    return (
        <View style={style}>
            <StyledGlassView
                key={theme.colors.background} // Force re-render on theme change
                glassEffectStyle={'regular'}
                isInteractive={true}
                tintColor={tintColor}
            >
                <ContentContainer
                    onPress={onPress}
                    disabled={disabled}
                    hasText={!!text}
                    activeOpacity={0.7}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color={iconColor} />
                    ) : (
                        <>
                            {icon && (
                                <Ionicons
                                    name={icon}
                                    size={20}
                                    color={iconColor}
                                    style={text ? { marginRight: 4 } : {}}
                                />
                            )}
                            {text && (
                                <ButtonText tintColor={textColor}>
                                    {text}
                                </ButtonText>
                            )}
                        </>
                    )}
                </ContentContainer>
            </StyledGlassView>
        </View>
    );
};
