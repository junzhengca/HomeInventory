import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    runOnUI,
    measure,
    useAnimatedRef,
} from 'react-native-reanimated';
import type { StyledProps } from '../../utils/styledComponents';
import { useTheme } from '../../theme/ThemeProvider';

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const Container = styled.View`
  margin-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
  overflow: hidden;
`;

const HeaderButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const Title = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const IconContainer = styled(Animated.View)``;

const ContentContainer = styled(Animated.View)`
  overflow: hidden;
`;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    initialExpanded?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    children,
    initialExpanded = false,
}) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(initialExpanded);

    // Animation values
    const height = useSharedValue(0);
    const rotation = useSharedValue(initialExpanded ? 180 : 0);
    const listRef = useAnimatedRef<Animated.View>();

    const toggleExpand = () => {
        if (expanded) {
            height.value = withTiming(0);
            rotation.value = withTiming(0);
        } else {
            runOnUI(() => {
                const measured = measure(listRef);
                if (measured) {
                    height.value = withTiming(measured.height);
                }
            })();
            rotation.value = withTiming(180);
        }
        setExpanded(!expanded);
    };

    const animatedHeightStyle = useAnimatedStyle(() => ({
        height: height.value,
        opacity: withTiming(expanded ? 1 : 0),
    }));

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    return (
        <Container>
            <HeaderButton onPress={toggleExpand} activeOpacity={0.7}>
                <Title>{title}</Title>
                <IconContainer style={animatedIconStyle}>
                    <Ionicons
                        name="chevron-down"
                        size={20}
                        color={theme.colors.textSecondary}
                    />
                </IconContainer>
            </HeaderButton>

            <ContentContainer style={animatedHeightStyle}>
                <View
                    ref={listRef}
                    onLayout={() => {
                        // If initially expanded, we need to set the height once layout is known
                        if (expanded && height.value === 0) {
                            runOnUI(() => {
                                const measured = measure(listRef);
                                if (measured) {
                                    height.value = measured.height;
                                }
                            })();
                        }
                    }}
                    style={{ position: 'absolute', width: '100%', top: 0 }}
                >
                    {children}
                </View>
            </ContentContainer>
        </Container>
    );
};
