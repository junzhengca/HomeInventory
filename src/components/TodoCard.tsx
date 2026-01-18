import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ViewStyle, TextInput, Animated } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import { TodoItem } from '../types/inventory';
import type { StyledProps, StyledPropsWith } from '../utils/styledComponents';
import { BaseCard } from './BaseCard';

const ContentContainer = styled(View)`
  flex-direction: row;
  align-items: flex-start;
  width: 100%;
`;

const TextContainer = styled(View)`
  flex: 1;
  flex-direction: column;
  overflow: hidden;
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
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme, completed }: StyledPropsWith<{ completed: boolean }>) => 
    (completed ? theme.typography.fontWeight.regular : theme.typography.fontWeight.bold)};
  color: ${({ theme, completed }: StyledPropsWith<{ completed: boolean }>) => 
    (completed ? theme.colors.textSecondary : theme.colors.text)};
  text-decoration-line: ${({ completed }: { completed: boolean }) => 
    (completed ? 'line-through' : 'none')};
  line-height: ${({ theme }: StyledProps) => theme.typography.fontSize.md * 1.2}px;
  padding: 0px;
  padding-vertical: 0px;
  margin: 0px;
`;

const TodoNote = styled(Text)<{ completed: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.regular};
  color: ${({ theme, completed }: StyledPropsWith<{ completed: boolean }>) => 
    (completed ? theme.colors.textSecondary : theme.colors.textSecondary)};
  line-height: ${({ theme }: StyledProps) => theme.typography.fontSize.sm * 1.4}px;
  padding: 0px;
  padding-vertical: 0px;
  margin: 0px;
`;

const EditableTextInput = styled(TextInput)<{ completed: boolean; isEditing: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme, completed }: StyledPropsWith<{ completed: boolean }>) => 
    (completed ? theme.typography.fontWeight.regular : theme.typography.fontWeight.bold)};
  color: ${({ theme, completed }: StyledPropsWith<{ completed: boolean }>) => 
    (completed ? theme.colors.textSecondary : theme.colors.text)};
  text-decoration-line: ${({ completed }: { completed: boolean }) => 
    (completed ? 'line-through' : 'none')};
  line-height: ${({ theme }: StyledProps) => theme.typography.fontSize.md * 1.2}px;
  background-color: transparent;
  border-width: 0px;
  border-color: transparent;
  outline-width: 0px;
  outline: none;
  padding: 0px;
  padding-vertical: 0px;
  margin: 0px;
  width: 100%;
`;

const NotesHeightWrapper = Animated.View;

const NotesInputContainer = styled(View)`
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  padding-top: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  border-top-width: 1px;
  border-top-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  width: 100%;
`;

const EditableNoteInput = styled(TextInput)<{ completed: boolean; isEditing: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.regular};
  color: ${({ theme, completed }: StyledPropsWith<{ completed: boolean }>) => 
    (completed ? theme.colors.textSecondary : theme.colors.textSecondary)};
  line-height: ${({ theme }: StyledProps) => theme.typography.fontSize.sm * 1.4}px;
  background-color: transparent;
  border-width: 0px;
  border-color: transparent;
  outline-width: 0px;
  outline: none;
  padding: 0px;
  padding-vertical: 0px;
  margin: 0px;
  min-height: ${({ theme }: StyledProps) => theme.typography.fontSize.sm * 1.4}px;
  width: 100%;
`;

interface TodoCardProps {
  todo: TodoItem;
  onToggle?: (id: string) => void;
  onUpdate?: (id: string, text: string, note?: string) => void;
  style?: ViewStyle;
}

/**
 * TodoCard - A card component for displaying todo items with inline editing
 * Uses the same BaseCard styling as ItemCard for consistency, with compact variant
 * Supports inline editing of text and note fields using uncontrolled inputs
 */
export const TodoCard: React.FC<TodoCardProps> = ({
  todo,
  onToggle,
  onUpdate,
  style,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [editingField, setEditingField] = useState<'text' | 'note' | null>(null);
  const textInputRef = useRef<TextInput>(null);
  const noteInputRef = useRef<TextInput>(null);
  const textValueRef = useRef(todo.text);
  const noteValueRef = useRef(todo.note || '');

  const [currentNoteHeight, setCurrentNoteHeight] = useState(40);
  const [titleContent, setTitleContent] = useState(todo.text);
  const [noteContent, setNoteContent] = useState(todo.note || '');
  const isFocusingNoteRef = useRef(false);
  const textInputFocusedRef = useRef(false);
  const noteInputFocusedRef = useRef(false);

  // Animation values for notes field - height cannot use native driver
  // Initialize based on whether todo has a note
  const initialHeight = (!!todo.note || editingField !== null) ? 1 : 0;
  const notesHeight = useRef(new Animated.Value(initialHeight)).current;
  const notesOpacity = useRef(new Animated.Value(todo.note ? 1 : 0)).current;
  const previousNoteRef = useRef(todo.note);
  const editingFieldRef = useRef(editingField);
  const [showNotesWrapper, setShowNotesWrapper] = useState(!!todo.note || editingField === 'text' || editingField === 'note');
  
  // Keep refs in sync with state
  useEffect(() => {
    editingFieldRef.current = editingField;
  }, [editingField]);

  // Sync refs when todo changes
  useEffect(() => {
    textValueRef.current = todo.text;
    noteValueRef.current = todo.note || '';
    previousNoteRef.current = todo.note;
  }, [todo.text, todo.note]);

  // Exit editing mode if todo becomes completed
  useEffect(() => {
    if (todo.completed && editingField !== null) {
      // Save any pending changes before exiting edit mode
      const newText = textValueRef.current.trim();
      const newNote = noteValueRef.current.trim();
      if (newText && (newText !== todo.text || newNote !== (todo.note || '')) && onUpdate) {
        onUpdate(todo.id, newText, newNote || undefined);
      }
      setEditingField(null);
    }
  }, [todo.completed, todo.id, todo.text, todo.note, editingField, onUpdate]);

  // Animate notes field show/hide based on todo.note and editingField
  useEffect(() => {
    const shouldBeVisible = !!todo.note || editingField !== null;
    
    if (shouldBeVisible && !showNotesWrapper) {
      // Need to show the wrapper
      setShowNotesWrapper(true);
      Animated.parallel([
        Animated.timing(notesHeight, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(notesOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    } else if (!shouldBeVisible && showNotesWrapper) {
      // Need to hide the wrapper
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
      ]).start(() => {
        setShowNotesWrapper(false);
      });
    } else if (shouldBeVisible && showNotesWrapper) {
      // Already visible, ensure height and opacity are updated if they changed
      if (editingField === null) {
        notesHeight.setValue(1);
        notesOpacity.setValue(1);
      }
    }
  }, [todo.note, editingField, notesHeight, notesOpacity, showNotesWrapper]);

  const handleTextPress = useCallback(() => {
    if (todo.completed) return; // Prevent editing completed todos
    setTitleContent(todo.text);
    setEditingField('text');
    // Focus the input after state update
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 0);
  }, [todo.text, todo.completed]);

  const handleNotePress = useCallback(() => {
    if (todo.completed) return; // Prevent editing completed todos
    setNoteContent(todo.note || '');
    setEditingField('note');
    // Focus the input after state update
    setTimeout(() => {
      noteInputRef.current?.focus();
    }, 0);
  }, [todo.note, todo.completed]);

  const handleTextChange = useCallback((text: string) => {
    textValueRef.current = text;
    setTitleContent(text);
  }, []);

  const handleNoteChange = useCallback((text: string) => {
    noteValueRef.current = text;
    setNoteContent(text);
  }, []);

  const saveText = useCallback(() => {
    const newText = textValueRef.current.trim();
    const newNote = noteValueRef.current.trim();
    if (newText && (newText !== todo.text || newNote !== (todo.note || '')) && onUpdate) {
      onUpdate(todo.id, newText, newNote || undefined);
    }
    // Don't reset hasMeasuredRef here - let the animation complete first
    // It will be reset in the animation completion callback
    setEditingField(null);
  }, [todo.id, todo.text, todo.note, onUpdate]);

  const saveNote = useCallback(() => {
    const newText = textValueRef.current.trim();
    const newNote = noteValueRef.current.trim();
    // If editing text, save both; otherwise just save note
    if (editingField === 'text') {
      if (newText && (newText !== todo.text || newNote !== (todo.note || '')) && onUpdate) {
        onUpdate(todo.id, newText, newNote || undefined);
      }
    } else {
      if (newNote !== (todo.note || '') && onUpdate) {
        onUpdate(todo.id, todo.text, newNote || undefined);
      }
    }
    // Don't reset hasMeasuredRef here - let the animation complete first
    // It will be reset in the animation completion callback
    setEditingField(null);
  }, [todo.id, todo.text, todo.note, editingField, onUpdate]);

  const handleTextSubmit = useCallback(() => {
    saveText();
  }, [saveText]);

  const handleTextFocus = useCallback(() => {
    textInputFocusedRef.current = true;
  }, []);

  const handleTextBlur = useCallback(() => {
    textInputFocusedRef.current = false;
    // Use a small delay to check if note input is being focused
    setTimeout(() => {
      // Check current state via ref to avoid stale closure
      if (editingFieldRef.current !== 'text') {
        return; // Already changed
      }
      // Don't save if we're transitioning to note input
      if (isFocusingNoteRef.current || noteInputFocusedRef.current) {
        isFocusingNoteRef.current = false;
        // Switch to note editing mode
        setEditingField('note');
        return;
      }
      // Both inputs are blurred, save and close
      saveText();
    }, 150);
  }, [saveText]);

  const handleNoteSubmit = useCallback(() => {
    saveNote();
  }, [saveNote]);

  const handleNoteFocus = useCallback(() => {
    noteInputFocusedRef.current = true;
    // Mark that we're focusing the note input to prevent text blur from closing
    isFocusingNoteRef.current = true;
    setEditingField('note');
  }, []);

  const handleNoteBlur = useCallback(() => {
    noteInputFocusedRef.current = false;
    // Use a small delay to check if text input is being focused
    setTimeout(() => {
      // Check current state via ref to avoid stale closure
      if (editingFieldRef.current !== 'note') {
        return; // Already changed
      }
      // Check if text input is still focused
      if (textInputFocusedRef.current) {
        // Text input is focused, switch back to text editing mode
        setEditingField('text');
        return;
      }
      // Both inputs are blurred, save and close
      saveNote();
    }, 150);
  }, [saveNote]);

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
        <TextContainer>
          {editingField === 'text' ? (
            <View style={{ width: '100%' }}>
              {/* Invisible Measurement View for Title - Ensures parent container grows instantly */}
              <TodoText
                completed={todo.completed}
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: '100%',
                  pointerEvents: 'none',
                }}
              >
                {titleContent || ' '}
              </TodoText>
              <EditableTextInput
                ref={textInputRef}
                value={titleContent}
                onChangeText={handleTextChange}
                onSubmitEditing={handleTextSubmit}
                onFocus={handleTextFocus}
                onBlur={handleTextBlur}
                completed={todo.completed}
                isEditing={true}
                editable={!todo.completed}
                multiline
                scrollEnabled={false}
                blurOnSubmit={true} // Maintain enter-to-submit behavior for title
                autoCorrect={false}
                spellCheck={false}
                textContentType="none"
                autoComplete="off"
                underlineColorAndroid="transparent"
                includeFontPadding={false}
                textAlignVertical="top"
                style={{ 
                  borderWidth: 0, 
                  outline: 'none',
                  minHeight: 24,
                  width: '100%',
                }}
              />
            </View>
          ) : (
            <TouchableOpacity 
              onPress={handleTextPress} 
              activeOpacity={todo.completed ? 1 : 0.7}
              disabled={todo.completed}
            >
              <TodoText completed={todo.completed}>{todo.text}</TodoText>
            </TouchableOpacity>
          )}
          {/* Unified note area - handled by animation wrapper for both display and editing */}
          {showNotesWrapper && (
            <NotesHeightWrapper
              style={{
                height: notesHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, currentNoteHeight],
                }),
                opacity: notesOpacity,
                overflow: 'hidden',
              }}
              pointerEvents="auto"
            >
              {/* Measurement View (invisible) - ensures wrapper has correct height */}
              <View
                onLayout={(event) => {
                  const { height } = event.nativeEvent.layout;
                  if (height > 0) {
                    const measuredHeight = height;
                    if (Math.abs(currentNoteHeight - measuredHeight) > 0.1) {
                      setCurrentNoteHeight(measuredHeight);
                    }
                  }
                }}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '100%' }}
              >
                <NotesInputContainer>
                  {/* Measure based on the note text or input placeholder */}
                  {editingField === null && todo.note ? (
                    <TodoNote completed={todo.completed}>{todo.note}</TodoNote>
                  ) : (
                    <EditableNoteInput
                      key="measurement-note"
                      value={noteContent} // Controlled measurement ensures real-time growth
                      completed={todo.completed}
                      isEditing={true}
                      multiline
                      scrollEnabled={false}
                      placeholder={t('notes.addNote')}
                      underlineColorAndroid="transparent"
                      includeFontPadding={false}
                      textAlignVertical="top"
                      style={{ minHeight: 0 }}
                    />
                  )}
                </NotesInputContainer>
              </View>

              {/* Visible Note Area */}
              <TouchableOpacity
                activeOpacity={todo.completed ? 1 : 1}
                disabled={todo.completed}
                onPress={() => {
                  if (todo.completed) return; // Prevent editing completed todos
                  if (editingField === null) {
                    handleNotePress();
                  } else if (editingField === 'text') {
                    isFocusingNoteRef.current = true;
                    noteInputRef.current?.focus();
                  }
                }}
              >
                <NotesInputContainer>
                  {editingField === null && todo.note ? (
                    <TodoNote completed={todo.completed}>{todo.note}</TodoNote>
                  ) : (
                    <EditableNoteInput
                      ref={noteInputRef}
                      value={noteContent} // Controlled visible input
                      onChangeText={handleNoteChange}
                      onContentSizeChange={(event) => {
                        const { height } = event.nativeEvent.contentSize;
                        if (height > 0) {
                          const containerPadding = theme.spacing.xs * 2;
                          const totalHeight = height + containerPadding;
                          if (Math.abs(currentNoteHeight - totalHeight) > 1) {
                            setCurrentNoteHeight(totalHeight);
                          }
                        }
                      }}
                      onSubmitEditing={handleNoteSubmit}
                      onFocus={handleNoteFocus}
                      onBlur={handleNoteBlur}
                      completed={todo.completed}
                      isEditing={true}
                      editable={!todo.completed}
                      multiline
                      scrollEnabled={false}
                      placeholder={t('notes.addNote')}
                      placeholderTextColor={theme.colors.textLight}
                      autoCorrect={false}
                      spellCheck={false}
                      textContentType="none"
                      autoComplete="off"
                      underlineColorAndroid="transparent"
                      includeFontPadding={false}
                      textAlignVertical="top"
                      style={{ borderWidth: 0, outline: 'none' }}
                    />
                  )}
                </NotesInputContainer>
              </TouchableOpacity>
            </NotesHeightWrapper>
          )}
        </TextContainer>
      </ContentContainer>
    </BaseCard>
  );
};

