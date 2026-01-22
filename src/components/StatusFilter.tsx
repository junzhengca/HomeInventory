import React from 'react';
import { TouchableOpacity, ScrollView } from 'react-native';
import styled from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import type {
  StyledProps,
  StyledPropsWith,
} from '../utils/styledComponents';
import { itemStatuses } from '../data/itemStatuses';

const StatusScrollView = styled(ScrollView).attrs(() => ({
  horizontal: true,
  showsHorizontalScrollIndicator: false,
}))`
  flex-grow: 0;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const StatusButton = styled(TouchableOpacity) <{ isSelected: boolean }>`
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  flex-direction: row;
  align-items: center;
  background-color: ${({
  theme,
  isSelected,
}: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.surface};
  border-width: 1px;
  border-color: ${({
      theme,
      isSelected,
    }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.border};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const StatusText = styled.Text<{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.surface : theme.colors.text};
`;

const CountText = styled.Text<{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.surface : theme.colors.textSecondary};
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  opacity: 0.7;
`;

export interface StatusFilterProps {
  selectedStatusId: string | null;
  onSelect: (statusId: string | null) => void;
  counts?: Record<string, number>;
}

/**
 * Status filter component with horizontal scrollable pills.
 * Includes an "All" option to show all statuses.
 */
export const StatusFilter: React.FC<StatusFilterProps> = ({
  selectedStatusId,
  onSelect,
  counts = {},
}) => {
  const { t } = useTranslation();

  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <StatusScrollView
      contentContainerStyle={{ paddingVertical: 0, alignItems: 'center' }}
    >
      <StatusButton
        isSelected={selectedStatusId === null}
        onPress={() => onSelect(null)}
        activeOpacity={0.7}
      >
        <StatusText isSelected={selectedStatusId === null}>
          {t('categories.all')}
        </StatusText>
        <CountText isSelected={selectedStatusId === null}>
          {totalCount}
        </CountText>
      </StatusButton>
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
          <CountText isSelected={selectedStatusId === status.id}>
            {counts[status.id] || 0}
          </CountText>
        </StatusButton>
      ))}
    </StatusScrollView>
  );
};
