import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StyledProps, StyledPropsWith } from '../utils/styledComponents';

import { PageHeader } from '../components/PageHeader';
import { RootStackParamList } from '../navigation/types';
import { useTodos } from '../contexts/TodoContext';
import { useTheme } from '../theme/ThemeProvider';
import { TodoItem } from '../types/inventory';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const Content = styled(ScrollView)`
  flex: 1;
  padding: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const AddTodoContainer = styled(View)<{ isFocused: boolean }>`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  height: 48px;
  border-width: 1.5px;
  border-color: ${({ theme, isFocused }: StyledPropsWith<{ isFocused: boolean }>) =>
    isFocused ? theme.colors.inputFocus : theme.colors.borderLight};
`;

const TodoInput = styled(TextInput)`
  flex: 1;
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  height: 100%;
  padding-vertical: 0;
`;

const AddButton = styled(TouchableOpacity)`
  background-color: ${({ theme }: StyledProps) => theme.colors.primary};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  margin-left: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  height: 28px;
  width: 28px;
  align-items: center;
  justify-content: center;
`;

const SectionTitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: 600;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const EmptyState = styled(View)`
  align-items: center;
  justify-content: center;
  padding: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const EmptyStateText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  text-align: center;
`;

const TodoItemContainer = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  flex-direction: row;
  align-items: center;
  position: relative;
  
  /* Subtle shadow for the card */
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 8px;
  elevation: 2;
`;

const TodoText = styled(Text)<{ completed: boolean }>`
  flex: 1;
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme, completed }: StyledPropsWith<{ completed: boolean }>) => (completed ? theme.typography.fontWeight.regular : theme.typography.fontWeight.bold)};
  color: ${({ theme, completed }: StyledPropsWith<{ completed: boolean }>) => (completed ? theme.colors.textSecondary : theme.colors.text)};
  text-decoration-line: ${({ completed }: { completed: boolean }) => (completed ? 'line-through' : 'none')};
`;

const Checkbox = styled(TouchableOpacity)`
  width: 24px;
  height: 24px;
  border-radius: 12px;
  border-width: 2px;
  border-color: ${({ theme, checked }: StyledPropsWith<{ checked: boolean }>) => (checked ? theme.colors.primary : theme.colors.border)};
  background-color: ${({ theme, checked }: StyledPropsWith<{ checked: boolean }>) => (checked ? theme.colors.primary : 'transparent')};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const DeleteButton = styled(TouchableOpacity)`
  padding: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const _SwipeActionsContainer = styled(View)`
  flex-direction: row;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const DeleteAction = styled(View)`
  background-color: #ff3b30;
  justify-content: center;
  align-items: flex-end;
  padding-right: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  width: 80px;
`;

const DeleteActionText = styled(Text)`
  color: white;
  font-weight: 600;
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
`;

export const NotesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { pendingTodos, completedTodos, loading, refreshTodos, addTodo, toggleTodoCompletion, removeTodo } =
    useTodos();
  const theme = useTheme();

  const [newTodoText, setNewTodoText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    refreshTodos();
  }, [refreshTodos]);

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  const handleAddTodo = async () => {
    if (newTodoText.trim()) {
      await addTodo(newTodoText.trim());
      setNewTodoText('');
    }
  };

  const handleToggleTodo = async (id: string) => {
    await toggleTodoCompletion(id);
  };

  const handleDeleteTodo = (id: string) => {
    Alert.alert('Delete Todo', 'Are you sure you want to delete this todo?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeTodo(id);
        },
      },
    ]);
  };

  const renderDeleteAction = () => (
    <DeleteAction>
      <DeleteActionText>Delete</DeleteActionText>
    </DeleteAction>
  );

  const renderTodoItem = (todo: TodoItem) => (
    <TodoItemContainer key={todo.id}>
      <Checkbox
        checked={todo.completed}
        onPress={() => handleToggleTodo(todo.id)}
        activeOpacity={0.7}
      >
        {todo.completed && <Ionicons name="checkmark" size={16} color="white" />}
      </Checkbox>
      <TodoText completed={todo.completed}>{todo.text}</TodoText>
      <DeleteButton onPress={() => handleDeleteTodo(todo.id)} activeOpacity={0.7}>
        <Ionicons name="trash-outline" size={20} color="#ff3b30" />
      </DeleteButton>
    </TodoItemContainer>
  );

  const renderSwipeableTodo = (todo: TodoItem) => {
    return (
      <Swipeable
        key={todo.id}
        renderRightActions={renderDeleteAction}
        onSwipeableOpen={() => handleDeleteTodo(todo.id)}
      >
        {renderTodoItem(todo)}
      </Swipeable>
    );
  };

  // Calculate bottom padding: nav bar height (60) + margin (16*2) + safe area + extra spacing
  const bottomPadding = 60 + 32 + insets.bottom + 24;

  if (loading) {
    return (
      <Container>
        <PageHeader
          icon="document-text"
          title="Notes"
          subtitle="Your todos"
          onSettingsPress={handleSettingsPress}
        />
      </Container>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Container>
        <PageHeader
          icon="document-text"
          title="Notes"
          subtitle="Your todos"
          onSettingsPress={handleSettingsPress}
        />
        <Content
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
        >
          <AddTodoContainer isFocused={isFocused}>
            <TodoInput
              placeholder="Add a new todo..."
              placeholderTextColor={theme.colors.textLight}
              value={newTodoText}
              onChangeText={setNewTodoText}
              onSubmitEditing={handleAddTodo}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoCorrect={false}
            />
            <AddButton onPress={handleAddTodo} activeOpacity={0.7}>
              <Ionicons name="add" size={18} color="white" />
            </AddButton>
          </AddTodoContainer>

          {pendingTodos.length > 0 && (
            <>
              <SectionTitle>Pending ({pendingTodos.length})</SectionTitle>
              {pendingTodos.map(renderSwipeableTodo)}
            </>
          )}

          {completedTodos.length > 0 && (
            <>
              <SectionTitle style={{ marginTop: 20 }}>
                Completed ({completedTodos.length})
              </SectionTitle>
              {completedTodos.map(renderTodoItem)}
            </>
          )}

          {pendingTodos.length === 0 && completedTodos.length === 0 && (
            <EmptyState>
              <Ionicons name="clipboard-outline" size={64} color="#ccc" />
              <EmptyStateText style={{ marginTop: 16 }}>No todos yet</EmptyStateText>
              <EmptyStateText>Add a todo above to get started!</EmptyStateText>
            </EmptyState>
          )}
        </Content>
      </Container>
    </GestureHandlerRootView>
  );
};
