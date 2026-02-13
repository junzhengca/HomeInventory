import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Text,
  View,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  GestureHandlerRootView,
  Swipeable,
} from 'react-native-gesture-handler';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { StyledProps, StyledPropsWith } from '../utils/styledComponents';
import { useTranslation } from 'react-i18next';

import {
  PageHeader,
  TodoCard,
  EmptyState,
  LoginBottomSheet,
  SignupBottomSheet,
  HomeSwitcher,
  TodoCategoryPicker,
} from '../components';
import { useTodos, useAuth, useTodoCategories } from '../store/hooks';
import { useHome } from '../hooks/useHome';
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
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const ModeToggleContainer = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  flex-direction: row;
  height: 48px;
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
`;

const ModeButton = styled(TouchableOpacity) <{ isActive: boolean }>`
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.lg}px;
  background-color: ${({ theme, isActive }: StyledPropsWith<{ isActive: boolean }>) =>
    isActive ? theme.colors.primary : 'transparent'};
`;

const ModeText = styled(Text) <{ isActive: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: 600;
  color: ${({ theme, isActive }: StyledPropsWith<{ isActive: boolean }>) =>
    isActive ? '#FFFFFF' : theme.colors.textSecondary};
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const AddTodoContainer = styled(View) <{ isFocused: boolean }>`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  border-width: 1.5px;
  border-color: ${({
  theme,
  isFocused,
}: StyledPropsWith<{ isFocused: boolean }>) =>
    isFocused ? theme.colors.inputFocus : theme.colors.borderLight};
  overflow: hidden;
`;

const TodoInputRow = styled(View)`
  flex-direction: row;
  align-items: center;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  height: 48px;
`;

const TodoInput = styled(TextInput)`
  flex: 1;
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  height: 100%;
  padding-vertical: 0;
`;

const ToggleNotesButton = styled(TouchableOpacity) <{ isActive: boolean }>`
  background-color: ${({
  theme,
  isActive,
}: StyledPropsWith<{ isActive: boolean }>) =>
    isActive ? theme.colors.primary : theme.colors.borderLight};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  margin-left: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  height: 28px;
  width: 28px;
  align-items: center;
  justify-content: center;
`;

// Banner Components
const BannerContainer = styled(View) <{ mode: TodoMode }>`
  background-color: ${({ theme, mode }: StyledPropsWith<{ mode: TodoMode }>) =>
    mode === 'shopping' ? theme.colors.primary : theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  ${({ mode, theme }: StyledPropsWith<{ mode: TodoMode }>) =>
    mode === 'planning' ? `border-width: 1px; border-color: ${theme.colors.borderLight};` : ''}
`;

const BannerContent = styled(View)`
  flex-direction: row;
  align-items: center;
  flex: 1;
`;

const IconContainer = styled(View) <{ mode: TodoMode }>`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.lg}px;
  background-color: ${({ theme, mode }: StyledPropsWith<{ mode: TodoMode }>) =>
    mode === 'shopping' ? 'rgba(255, 255, 255, 0.2)' : theme.colors.background};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const TextContainer = styled(View)`
  flex: 1;
`;

const BannerTitle = styled(Text) <{ mode: TodoMode }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: 600;
  color: ${({ theme, mode }: StyledPropsWith<{ mode: TodoMode }>) =>
    mode === 'shopping' ? '#FFFFFF' : theme.colors.text};
  margin-bottom: 2px;
`;

const BannerSubtitle = styled(Text) <{ mode: TodoMode }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme, mode }: StyledPropsWith<{ mode: TodoMode }>) =>
    mode === 'shopping' ? 'rgba(255, 255, 255, 0.8)' : theme.colors.textSecondary};
`;

const BannerButton = styled(TouchableOpacity) <{ mode: TodoMode }>`
  background-color: ${({ theme, mode }: StyledPropsWith<{ mode: TodoMode }>) =>
    mode === 'shopping' ? '#FFFFFF' : theme.colors.primary};
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.lg}px;
`;

const BannerButtonText = styled(Text) <{ mode: TodoMode }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: 600;
  color: ${({ theme, mode }: StyledPropsWith<{ mode: TodoMode }>) =>
    mode === 'shopping' ? theme.colors.primary : '#FFFFFF'};
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

// Use regular Animated.View for height animation (non-native driver)
const NotesHeightWrapper = Animated.View;

const NotesInputContainer = styled(View)`
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-top: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  padding-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  border-top-width: 1px;
  border-top-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
`;

const NotesInput = styled(TextInput)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  min-height: 40px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const SectionTitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: 600;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const CategorySectionTitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: 600;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-top: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const SwipeableWrapper = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const CardWrapper = styled(View)`
  margin-bottom: 0;
`;

const SwipeActionsContainer = styled(View)`
  flex-direction: row;
  border-top-right-radius: ${({ theme }: StyledProps) =>
    theme.borderRadius.xxl}px;
  border-bottom-right-radius: ${({ theme }: StyledProps) =>
    theme.borderRadius.xxl}px;
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const ActionButton = styled(TouchableOpacity)`
  justify-content: center;
  align-items: center;
  width: 80px;
  align-self: stretch;
  position: relative;
`;

const DeleteAction = styled(ActionButton)`
  background-color: ${({ theme }: StyledProps) => theme.colors.error};
  border-top-left-radius: ${({ theme }: StyledProps) =>
    theme.borderRadius.xxl}px;
  border-bottom-left-radius: ${({ theme }: StyledProps) =>
    theme.borderRadius.xxl}px;
  border-top-right-radius: ${({ theme }: StyledProps) =>
    theme.borderRadius.xxl}px;
  border-bottom-right-radius: ${({ theme }: StyledProps) =>
    theme.borderRadius.xxl}px;
`;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TodoMode = 'planning' | 'shopping';

export const NotesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const {
    pendingTodos,
    completedTodos,
    loading,
    refreshTodos,
    addTodo,
    toggleTodoCompletion,
    removeTodo,
    updateTodo,
  } = useTodos();
  const { categories } = useTodoCategories();
  const theme = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentHome } = useHome();
  const canAccessNotes = React.useMemo(() => {
    if (!currentHome) return true;
    if (currentHome.role === 'owner') return true;
    return currentHome.settings?.canShareTodos ?? true;
  }, [currentHome]);

  const [mode, setMode] = useState<TodoMode>('planning');
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoNote, setNewTodoNote] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showNotesField, setShowNotesField] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const loginBottomSheetRef = useRef<BottomSheetModal | null>(null);
  const signupBottomSheetRef = useRef<BottomSheetModal | null>(null);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  // Animation values for notes field - height cannot use native driver
  const notesHeight = useRef(new Animated.Value(0)).current;
  const notesOpacity = useRef(new Animated.Value(0)).current;

  // Grouped todos for shopping mode
  const groupedPendingTodos = useMemo(() => {
    if (mode !== 'shopping') return {};

    const groups: Record<string, TodoItem[]> = {};
    const uncategorized: TodoItem[] = [];

    // Initialize groups for all categories to ensure order
    categories.forEach(cat => {
      groups[cat.id] = [];
    });

    pendingTodos.forEach(todo => {
      if (todo.categoryId && groups[todo.categoryId]) {
        groups[todo.categoryId].push(todo);
      } else {
        uncategorized.push(todo);
      }
    });

    // Remove empty groups if desired, or keep them.
    // For now, let's keep only groups that have items or are explicitly categories
    // But filter out empty ones for display to avoid clutter
    const result: Record<string, TodoItem[]> = {};

    categories.forEach(cat => {
      if (groups[cat.id].length > 0) {
        result[cat.id] = groups[cat.id];
      }
    });

    if (uncategorized.length > 0) {
      result['uncategorized'] = uncategorized;
    }

    return result;
  }, [mode, pendingTodos, categories]);

  useEffect(() => {
    refreshTodos();
  }, [refreshTodos]);

  // Animate notes field show/hide
  // Using non-native driver for both to avoid conflicts when mixing with height
  useEffect(() => {
    if (showNotesField) {
      Animated.parallel([
        Animated.timing(notesHeight, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false, // Height cannot use native driver
        }),
        Animated.timing(notesOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false, // Using false to avoid conflicts with height animation
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(notesHeight, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(notesOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [showNotesField, notesHeight, notesOpacity]);

  // Stable onChangeText handler to prevent IME composition interruption
  const handleTodoTextChange = useCallback((text: string) => {
    setNewTodoText(text);
  }, []);

  const handleTodoNoteChange = useCallback((text: string) => {
    setNewTodoNote(text);
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
    // User will be automatically updated via auth state
  };

  const handleAvatarPress = () => {
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('Profile');
    }
  };

  const handleAddTodo = async () => {
    if (newTodoText.trim()) {
      await addTodo(newTodoText.trim(), newTodoNote.trim() || undefined, selectedCategoryId || undefined);
      setNewTodoText('');
      setNewTodoNote('');
      setSelectedCategoryId(null);
      setShowNotesField(false);
    }
  };

  const handleToggleTodo = async (id: string) => {
    await toggleTodoCompletion(id);
  };

  const handleDeleteTodo = (id: string) => {
    Alert.alert(t('notes.deleteTodo.title'), t('notes.deleteTodo.message'), [
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
    ]);
  };

  const renderSwipeActions = (todo: TodoItem) => {
    return (
      <SwipeActionsContainer>
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

  const renderTodoItem = (todo: TodoItem, editable: boolean = true) => {
    // Wrap all todos in Swipeable to allow deletion
    // If not editable (shopping mode), disable swipeable or just don't allow delete?
    // User said "cannot edit todo items", implies read-only. Deletion might be considered editing.
    // For now, I'll allow deletion in planning mode only to be safe, or just keep it enabled? 
    // "Shopping mode... cannot add new items... cannot edit todo items"
    // Usually shopping mode is safe to just check off. 
    // Let's disable swipe actions in shopping mode for now.

    if (!editable) {
      return (
        <CardWrapper key={todo.id} style={{ marginBottom: 16 }}>
          <TodoCard
            todo={todo}
            onToggle={handleToggleTodo}
            onUpdate={updateTodo}
            style={{ marginBottom: 0 }}
            editable={false}
          />
        </CardWrapper>
      );
    }

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
              onUpdate={updateTodo}
              style={{ marginBottom: 0 }}
            />
          </CardWrapper>
        </Swipeable>
      </SwipeableWrapper>
    );
  };

  // Calculate bottom padding: nav bar height (60) + margin (16*2) + safe area + extra spacing
  const bottomPadding = 60 + 32 + insets.bottom + 24;

  if (loading) {
    return (
      <Container>
        <PageHeader
          titleComponent={<HomeSwitcher />}
          showRightButtons={true}
          avatarUrl={user?.avatarUrl}
          ownerAvatarUrl={currentHome?.role === 'member' ? currentHome?.owner?.avatarUrl : undefined}
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
      </Container>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Container>
        <PageHeader
          titleComponent={<HomeSwitcher />}
          showRightButtons={true}
          avatarUrl={user?.avatarUrl}
          ownerAvatarUrl={currentHome?.role === 'member' ? currentHome?.owner?.avatarUrl : undefined}
          onAvatarPress={handleAvatarPress}
        />
        {/* Check if user has access to notes */}
        {!canAccessNotes ? (
          <EmptyState
            icon="lock-closed"
            title={t('accessControl.notes.title')}
            description={t('accessControl.notes.description')}
          />
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <Content
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: bottomPadding }}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
            >
              <BannerContainer mode={mode}>
                <BannerContent>
                  <IconContainer mode={mode}>
                    <Ionicons
                      name={mode === 'shopping' ? 'cart' : 'grid-outline'}
                      size={24}
                      color={mode === 'shopping' ? '#FFFFFF' : theme.colors.primary}
                    />
                  </IconContainer>
                  <TextContainer>
                    <BannerTitle mode={mode}>
                      {t(`notes.banner.${mode}.title`)}
                    </BannerTitle>
                    <BannerSubtitle mode={mode}>
                      {t(`notes.banner.${mode}.subtitle`)}
                    </BannerSubtitle>
                  </TextContainer>
                </BannerContent>
                <BannerButton
                  mode={mode}
                  onPress={() => setMode(mode === 'planning' ? 'shopping' : 'planning')}
                  activeOpacity={0.8}
                >
                  <BannerButtonText mode={mode}>
                    {t(`notes.banner.${mode}.button`)}
                  </BannerButtonText>
                </BannerButton>
              </BannerContainer>

              {mode === 'planning' ? (
                <>
                  <AddTodoContainer isFocused={isFocused}>
                    <TodoInputRow>
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
                      <ToggleNotesButton
                        isActive={showNotesField}
                        onPress={() => setShowNotesField(!showNotesField)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={
                            showNotesField ? 'document-text' : 'document-text-outline'
                          }
                          size={18}
                          color={showNotesField ? 'white' : theme.colors.textSecondary}
                        />
                      </ToggleNotesButton>
                      <AddButton
                        onPress={handleAddTodo}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="add" size={18} color="white" />
                      </AddButton>
                    </TodoInputRow>
                    <NotesHeightWrapper
                      style={{
                        height: notesHeight.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 80],
                        }),
                        opacity: notesOpacity,
                        overflow: 'hidden',
                      }}
                      pointerEvents={showNotesField ? 'auto' : 'none'}
                    >
                      <NotesInputContainer>
                        <NotesInput
                          placeholder={t('notes.addNote')}
                          placeholderTextColor={theme.colors.textLight}
                          value={newTodoNote}
                          onChangeText={handleTodoNoteChange}
                          multiline={true}
                          autoCorrect={false}
                          spellCheck={false}
                          textContentType="none"
                          autoComplete="off"
                        />
                      </NotesInputContainer>
                    </NotesHeightWrapper>
                    <TodoCategoryPicker
                      selectedCategoryId={selectedCategoryId}
                      onSelect={setSelectedCategoryId}
                    />
                  </AddTodoContainer>

                  {pendingTodos.length > 0 && (
                    <>
                      <SectionTitle>
                        {t('notes.pending')} ({pendingTodos.length})
                      </SectionTitle>
                      {pendingTodos.map((todo) => renderTodoItem(todo))}
                    </>
                  )}

                  {completedTodos.length > 0 && (
                    <>
                      <SectionTitle style={{ marginTop: 20 }}>
                        {t('notes.completed')} ({completedTodos.length})
                      </SectionTitle>
                      {completedTodos.map((todo) => renderTodoItem(todo))}
                    </>
                  )}
                </>
              ) : (
                /* Shopping Mode */
                <>
                  {Object.entries(groupedPendingTodos).map(([catId, todos]) => {
                    const category = categories.find(c => c.id === catId);
                    const title = category ? category.name : t('notes.uncategorized', 'Uncategorized');

                    return (
                      <View key={catId} style={{ marginBottom: 16 }}>
                        <CategorySectionTitle>{title}</CategorySectionTitle>
                        {todos.map(todo => renderTodoItem(todo, false))}
                      </View>
                    );
                  })}

                  {pendingTodos.length === 0 && (
                    <EmptyState
                      icon="cart-outline"
                      title={t('notes.emptyShopping.title', 'All done!')}
                      description={t('notes.emptyShopping.description', 'No pending items to shop for.')}
                    />
                  )}
                </>
              )}

              {mode === 'planning' && pendingTodos.length === 0 && completedTodos.length === 0 && (
                <EmptyState
                  icon="clipboard-outline"
                  title={t('notes.empty.title')}
                  description={t('notes.empty.description')}
                />
              )}
            </Content>
          </KeyboardAvoidingView>
        )}

        <LoginBottomSheet
          bottomSheetRef={loginBottomSheetRef}
          onSignupPress={handleSignupPress}
          onLoginSuccess={handleLoginSuccess}
        />
        <SignupBottomSheet
          bottomSheetRef={signupBottomSheetRef}
          onLoginPress={handleLoginPress}
        />
      </Container>
    </GestureHandlerRootView>
  );
};
