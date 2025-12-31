import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { TodoItem } from '../types/inventory';
import type { StyledProps, StyledPropsWith } from '../utils/styledComponents';
import { BaseCard } from './BaseCard';

const ContentContainer = styled(View)`
  flex: 1;
  flex-direction: row;
  align-items: center;
`;

const Checkbox = styled(TouchableOpacity)<{ checked: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 10px;
  border-width: 2px;
  border-color: ${({ theme, checked }: StyledPropsWith<{ checked: boolean }>) => 
    checked ? theme.colors.primary : theme.colors.border};
  background-color: ${({ theme, checked }: StyledPropsWith<{ checked: boolean }>) => 
    checked ? theme.colors.primary : 'transparent'};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const TodoText = styled(Text)<{ completed: boolean }>`
  flex: 1;
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme, completed }: StyledPropsWith<{ completed: boolean }>) => 
    (completed ? theme.typography.fontWeight.regular : theme.typography.fontWeight.bold)};
  color: ${({ theme, completed }: StyledPropsWith<{ completed: boolean }>) => 
    (completed ? theme.colors.textSecondary : theme.colors.text)};
  text-decoration-line: ${({ completed }: { completed: boolean }) => 
    (completed ? 'line-through' : 'none')};
`;

interface TodoCardProps {
  todo: TodoItem;
  onToggle?: (id: string) => void;
  style?: ViewStyle;
}

/**
 * TodoCard - A card component for displaying todo items
 * Uses the same BaseCard styling as ItemCard for consistency, with compact variant
 */
export const TodoCard: React.FC<TodoCardProps> = ({
  todo,
  onToggle,
  style,
}) => {
  return (
    <BaseCard compact style={style}>
      <ContentContainer>
        <Checkbox
          checked={todo.completed}
          onPress={() => onToggle?.(todo.id)}
          activeOpacity={0.7}
        >
          {todo.completed && <Ionicons name="checkmark" size={14} color="white" />}
        </Checkbox>
        <TodoText completed={todo.completed}>{todo.text}</TodoText>
      </ContentContainer>
    </BaseCard>
  );
};

