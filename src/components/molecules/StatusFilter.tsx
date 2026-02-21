import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import type {
  StyledProps,
  StyledPropsWith,
} from '../../utils/styledComponents';

const StatusContainer = styled(View)`
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 0px;
  width: 100%;
  gap: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const StatusButton = styled(TouchableOpacity) <{ isSelected: boolean }>`
  padding-horizontal: 8px;
  padding-vertical: 8px;
  border-radius: 30px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: ${({
  theme,
  isSelected,
}: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : 'transparent'};
  flex: 1;

  /* Elevation for Android */
  elevation: ${({ isSelected }: { isSelected: boolean }) => (isSelected ? 4 : 0)};

  /* Shadow for iOS */
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: ${({ isSelected }: { isSelected: boolean }) => (isSelected ? 0.1 : 0)};
  shadow-radius: 2px;
`;

const StatusText = styled.Text<{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
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

  // We only show All, Out of Stock, Expiring, and En Route to fit in one row as per request
  const displayStatuses = [
    { id: 'out-of-stock', name: t('statuses.out-of-stock') },
    { id: 'expiring', name: t('statuses.expiring') },
    { id: 'en-route', name: t('statuses.en-route') },
  ];

  return (
    <StatusContainer>
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
      {displayStatuses.map((status) => (
        <StatusButton
          key={status.id}
          isSelected={selectedStatusId === status.id}
          onPress={() => onSelect(status.id)}
          activeOpacity={0.7}
        >
          <StatusText isSelected={selectedStatusId === status.id}>
            {status.name}
          </StatusText>
          <CountText isSelected={selectedStatusId === status.id}>
            {counts[status.id] || 0}
          </CountText>
        </StatusButton>
      ))}
    </StatusContainer>
  );
};
