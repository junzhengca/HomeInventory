import React from 'react';
import { TouchableOpacity, ScrollView } from 'react-native';
import styled from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import type {
  StyledProps,
  StyledPropsWith,
} from '../../utils/styledComponents';
import { itemStatuses } from '../../data/itemStatuses';

const StatusScrollView = styled(ScrollView)`
  flex-direction: row;
  margin: 0;
  padding: 0;
`;

const StatusButton = styled(TouchableOpacity)<{ isSelected: boolean }>`
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
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

export interface StatusFieldProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * Status selection field with horizontal scrollable pills.
 *
 * @example
 * <StatusField
 *   selectedId={formData.status}
 *   onSelect={(id) => updateField('status', id)}
 * />
 */
export const StatusField: React.FC<StatusFieldProps> = ({
  selectedId,
  onSelect,
}) => {
  const { t } = useTranslation();

  return (
    <StatusScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 0 }}
    >
      {itemStatuses.map((status) => (
        <StatusButton
          key={status.id}
          isSelected={selectedId === status.id}
          onPress={() => onSelect(status.id)}
          activeOpacity={0.7}
        >
          <StatusText isSelected={selectedId === status.id}>
            {t(`statuses.${status.id}`)}
          </StatusText>
        </StatusButton>
      ))}
    </StatusScrollView>
  );
};
