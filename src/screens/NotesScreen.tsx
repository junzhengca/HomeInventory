import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { StyledProps, StyledPropsWith } from '../utils/styledComponents';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '../components/PageHeader';
import { TodoCard } from '../components/TodoCard';
import { EmptyState } from '../components/EmptyState';
import { EditTodoBottomSheet } from '../components/EditTodoBottomSheet';
import { LoginBottomSheet } from '../components/LoginBottomSheet';
import { SignupBottomSheet } from '../components/SignupBottomSheet';
import { EnableSyncBottomSheet } from '../components/EnableSyncBottomSheet';
import { SharePanel } from '../components/SharePanel';
import { useTodos, useAuth } from '../store/hooks';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { TodoItem } from '../types/inventory';

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

const SwipeableWrapper = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const CardWrapper = styled(View)`
  margin-bottom: 0;
`;

const SwipeActionsContainer = styled(View)`
  flex-direction: row;
  border-top-right-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  border-bottom-right-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  overflow: hidden;
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const ActionButton = styled(TouchableOpacity)`
  justify-content: center;
  align-items: center;
  width: 80px;
  align-self: stretch;
  position: relative;
`;

const EditAction = styled(ActionButton)`
  background-color: ${({ theme }: StyledProps) => theme.colors.warning};
  border-top-left-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  border-bottom-left-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  
  /* Shadow for depth */
  shadow-color: ${({ theme }: StyledProps) => theme.colors.warning};
  shadow-offset: 0px 2px;
  shadow-opacity: 0.2;
  shadow-radius: 4px;
  elevation: 3;
`;

const DeleteAction = styled(ActionButton)`
  background-color: ${({ theme }: StyledProps) => theme.colors.error};
  border-top-right-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  border-bottom-right-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  
  /* Shadow for depth */
  shadow-color: ${({ theme }: StyledProps) => theme.colors.error};
  shadow-offset: 0px 2px;
  shadow-opacity: 0.2;
  shadow-radius: 4px;
  elevation: 3;
`;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const NotesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { pendingTodos, completedTodos, loading, refreshTodos, addTodo, toggleTodoCompletion, removeTodo } =
    useTodos();
  const theme = useTheme();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();

  const [newTodoText, setNewTodoText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [editingTodo, setEditingTodo] = useState<{ id: string; text: string } | null>(null);
  
  const editBottomSheetRef = useRef<BottomSheetModal>(null);
  const loginBottomSheetRef = useRef<BottomSheetModal>(null);
  const signupBottomSheetRef = useRef<BottomSheetModal>(null);
  const enableSyncBottomSheetRef = useRef<BottomSheetModal>(null);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  useEffect(() => {
    refreshTodos();
  }, [refreshTodos]);

  // Stable onChangeText handler to prevent IME composition interruption
  const handleTodoTextChange = useCallback((text: string) => {
    setNewTodoText(text);
  }, []);


  const handleSignupPress = () => {
    loginBottomSheetRef.current?.dismiss();
    signupBottomSheetRef.current?.present();
  };

  const handleLoginPress = () => {
    signupBottomSheetRef.current?.dismiss();
    loginBottomSheetRef.current?.present();
  };

  const handleLoginSuccess = async () => {
    // Always show the enable sync prompt after login
    enableSyncBottomSheetRef.current?.present();
  };

  const handleSyncPromptSkip = async () => {
    // No-op: just close the modal
  };

  const handleSyncPromptEnable = async () => {
    // No-op: sync enabling is handled by EnableSyncBottomSheet
  };

  const handleAvatarPress = () => {
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('Profile');
    }
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
    Alert.alert(
      t('notes.deleteTodo.title'),
      t('notes.deleteTodo.message'),
      [
        {
          text: t('notes.deleteTodo.cancel'),
          style: 'cancel',
        },
        {
          text: t('notes.deleteTodo.confirm'),
          style: 'destructive',
          onPress: async () => {
            await removeTodo(id);
          },
        },
      ]
    );
  };

  const handleEditTodo = (id: string, text: string) => {
    setEditingTodo({ id, text });
    editBottomSheetRef.current?.present();
  };

  const handleTodoUpdated = () => {
    setEditingTodo(null);
  };

  const renderSwipeActions = (todo: TodoItem) => {
    return (
      <SwipeActionsContainer>
        <EditAction
          onPress={() => {
            handleEditTodo(todo.id, todo.text);
            swipeableRefs.current.get(todo.id)?.close();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="create" size={22} color="white" />
        </EditAction>
        <DeleteAction
          onPress={() => {
            handleDeleteTodo(todo.id);
            swipeableRefs.current.get(todo.id)?.close();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="trash" size={22} color="white" />
        </DeleteAction>
      </SwipeActionsContainer>
    );
  };

  const renderTodoItem = (todo: TodoItem, isPending: boolean = false) => {
    if (isPending) {
      return (
        <SwipeableWrapper key={todo.id}>
          <Swipeable
            ref={(ref) => {
              if (ref) {
                swipeableRefs.current.set(todo.id, ref);
              }
            }}
            renderRightActions={() => renderSwipeActions(todo)}
            rightThreshold={40}
            friction={2}
            enableTrackpadTwoFingerGesture
          >
            <CardWrapper>
              <TodoCard
                todo={todo}
                onToggle={handleToggleTodo}
                style={{ marginBottom: 0 }}
              />
            </CardWrapper>
          </Swipeable>
        </SwipeableWrapper>
      );
    } else {
      return (
        <TodoCard
          key={todo.id}
          todo={todo}
          onToggle={handleToggleTodo}
        />
      );
    }
  };

  // Calculate bottom padding: nav bar height (60) + margin (16*2) + safe area + extra spacing
  const bottomPadding = 60 + 32 + insets.bottom + 24;

  if (loading) {
    return (
      <Container>
        <PageHeader
          icon="document-text"
          title={t('notes.title')}
          subtitle={t('notes.subtitle')}
          showRightButtons={true}
          avatarUrl={user?.avatarUrl}
          onAvatarPress={handleAvatarPress}
        />
        <LoginBottomSheet
          bottomSheetRef={loginBottomSheetRef}
          onSignupPress={handleSignupPress}
          onLoginSuccess={handleLoginSuccess}
        />
        <SignupBottomSheet
          bottomSheetRef={signupBottomSheetRef}
          onLoginPress={handleLoginPress}
        />
        <EnableSyncBottomSheet
          bottomSheetRef={enableSyncBottomSheetRef}
          onSkip={handleSyncPromptSkip}
          onEnableSync={handleSyncPromptEnable}
        />
      </Container>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Container>
        <PageHeader
          icon="document-text"
          title={t('notes.title')}
          subtitle={t('notes.subtitle')}
          showRightButtons={true}
          avatarUrl={user?.avatarUrl}
          onAvatarPress={handleAvatarPress}
        />
        <Content
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
        >
          <SharePanel
            userAvatarUrl={user?.avatarUrl}
            pendingTodos={pendingTodos}
            isAuthenticated={isAuthenticated}
            onInvitePress={() => {
              // TODO: Implement invite functionality
              console.log('Invite pressed');
            }}
          />
          <AddTodoContainer isFocused={isFocused}>
            <TodoInput
              placeholder={t('notes.addTodo')}
              placeholderTextColor={theme.colors.textLight}
              value={newTodoText}
              onChangeText={handleTodoTextChange}
              onSubmitEditing={handleAddTodo}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoCorrect={false}
              spellCheck={false}
              textContentType="none"
              autoComplete="off"
            />
            <AddButton 
              onPress={handleAddTodo} 
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="add" size={18} color="white" />
            </AddButton>
          </AddTodoContainer>

          {pendingTodos.length > 0 && (
            <>
              <SectionTitle>{t('notes.pending')} ({pendingTodos.length})</SectionTitle>
              {pendingTodos.map((todo) => renderTodoItem(todo, true))}
            </>
          )}

          {completedTodos.length > 0 && (
            <>
              <SectionTitle style={{ marginTop: 20 }}>
                {t('notes.completed')} ({completedTodos.length})
              </SectionTitle>
              {completedTodos.map((todo) => renderTodoItem(todo, false))}
            </>
          )}

          {pendingTodos.length === 0 && completedTodos.length === 0 && (
            <EmptyState
              icon="clipboard-outline"
              title={t('notes.empty.title')}
              description={t('notes.empty.description')}
            />
          )}
        </Content>
        
        <EditTodoBottomSheet
          bottomSheetRef={editBottomSheetRef}
          todoId={editingTodo?.id || ''}
          initialText={editingTodo?.text || ''}
          onTodoUpdated={handleTodoUpdated}
        />
        <LoginBottomSheet
          bottomSheetRef={loginBottomSheetRef}
          onSignupPress={handleSignupPress}
          onLoginSuccess={handleLoginSuccess}
        />
        <SignupBottomSheet
          bottomSheetRef={signupBottomSheetRef}
          onLoginPress={handleLoginPress}
        />
        <EnableSyncBottomSheet
          bottomSheetRef={enableSyncBottomSheetRef}
          onSkip={handleSyncPromptSkip}
          onEnableSync={handleSyncPromptEnable}
        />
      </Container>
    </GestureHandlerRootView>
  );
};
