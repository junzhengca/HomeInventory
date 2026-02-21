import React from 'react';
import { TouchableOpacity, ScrollView, View } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import type {
    StyledProps,
    StyledPropsWith,
} from '../../utils/styledComponents';
import { itemStatuses } from '../../data/itemStatuses';
import type { Theme } from '../../theme/types';

/**
 * Container with negative horizontal margins to enable edge-to-edge scrolling.
 * The ScrollView's contentContainerStyle adds horizontal padding to restore
 * proper spacing while allowing content to scroll to the screen edges.
 */
const SelectorContainer = styled(View) <{ horizontalPadding: number }>`
  margin-horizontal: -${({ horizontalPadding }: { horizontalPadding: number }) => horizontalPadding}px;
`;

const StatusScrollView = styled(ScrollView)`
  flex-direction: row;
`;

const StatusButton = styled(TouchableOpacity) <{ isSelected: boolean }>`
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  background-color: ${({
    theme,
    isSelected,
}: StyledPropsWith<{ isSelected: boolean }>) =>
        isSelected ? theme.colors.primary : theme.colors.surface};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const StatusText = styled.Text<{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
        isSelected ? theme.colors.surface : theme.colors.text};
`;

export interface StatusFormSelectorProps {
    selectedStatusId: string;
    onSelect: (statusId: string) => void;
}

/**
 * Status selector for item forms with edge-to-edge scrolling.
 * Displays all status options as horizontal scrollable pills.
 *
 * Unlike StatusField, this component:
 * - Uses negative margins for edge-to-edge scroll content
 * - Has consistent styling with other form selectors
 */
export const StatusFormSelector: React.FC<StatusFormSelectorProps> = ({
    selectedStatusId,
    onSelect,
}) => {
    const { t } = useTranslation();
    const theme = useTheme() as Theme;

    const horizontalPadding = theme.spacing.md;

    const scrollContentStyle = {
        paddingVertical: 0,
        paddingLeft: horizontalPadding,
        paddingRight: horizontalPadding,
    };

    return (
        <SelectorContainer horizontalPadding={horizontalPadding}>
            <StatusScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={scrollContentStyle}
            >
                {itemStatuses.map((status) => (
                    <StatusButton
                        key={status.id}
                        isSelected={selectedStatusId === status.id}
                        onPress={() => onSelect(status.id)}
                        activeOpacity={0.7}
                    >
                        <StatusText isSelected={selectedStatusId === status.id}>
                            {t(`statuses.${status.id}`)}
                        </StatusText>
                    </StatusButton>
                ))}
            </StatusScrollView>
        </SelectorContainer>
    );
};
