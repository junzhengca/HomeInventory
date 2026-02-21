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
  margin-top: 0;
  overflow: hidden;
`;

const HeaderButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const Title = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: 600;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

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
    const listRef = useAnimatedRef<Animated.View>();

    const toggleExpand = () => {
        if (expanded) {
            height.value = withTiming(0);
        } else {
            runOnUI(() => {
                const measured = measure(listRef);
                if (measured) {
                    height.value = withTiming(measured.height);
                }
            })();
        }
        setExpanded(!expanded);
    };

    const animatedHeightStyle = useAnimatedStyle(() => ({
        height: height.value,
        opacity: withTiming(expanded ? 1 : 0),
    }));

    return (
        <Container>
            <HeaderButton onPress={toggleExpand} activeOpacity={0.7}>
                <Title>{title}</Title>
                <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={theme.colors.textSecondary}
                />
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
                    style={{ position: 'absolute', width: '100%', top: 0, paddingTop: theme.spacing.sm }}
                >
                    {children}
                </View>
            </ContentContainer>
        </Container>
    );
};
