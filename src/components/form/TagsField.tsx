import React, { useState, useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import type { StyledProps } from '../../utils/styledComponents';
import { MemoizedInput } from '../ui/MemoizedInput';

const TagsContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const Tag = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryLightest};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.primary};
`;

const TagText = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.primary};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const TagRemoveButton = styled(TouchableOpacity)`
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const TagInputContainer = styled.View`
  flex-direction: row;
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const AddTagButton = styled(TouchableOpacity)`
  background-color: ${({ theme }: StyledProps) => theme.colors.primary};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  align-items: center;
  justify-content: center;
`;

const TagInput = styled(MemoizedInput)`
  flex: 1;
`;

export interface TagsFieldProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  placeholder: string;
}

/**
 * Tag management field with display chips and add input.
 *
 * @example
 * <TagsField
 *   tags={formData.tags}
 *   onAddTag={(tag) => addTag(tag)}
 *   onRemoveTag={(tag) => removeTag(tag)}
 *   placeholder="Add a tag"
 * />
 */
export const TagsField: React.FC<TagsFieldProps> = ({
  tags,
  onAddTag,
  onRemoveTag,
  placeholder,
}) => {
  const theme = useTheme();
  const [newTag, setNewTag] = useState('');

  const handleAddTag = useCallback(() => {
    if (newTag.trim()) {
      onAddTag(newTag.trim());
      setNewTag('');
    }
  }, [newTag, onAddTag]);

  const handleKeyPress = useCallback(
    (e: { nativeEvent: { key: string } }) => {
      if (e.nativeEvent.key === 'Enter') {
        handleAddTag();
      }
    },
    [handleAddTag]
  );

  return (
    <>
      {tags.length > 0 && (
        <TagsContainer>
          {tags.map((tag, index) => (
            <Tag key={index}>
              <TagText>#{tag}</TagText>
              <TagRemoveButton onPress={() => onRemoveTag(tag)}>
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={theme.colors.primary}
                />
              </TagRemoveButton>
            </Tag>
          ))}
        </TagsContainer>
      )}
      <TagInputContainer>
        <TagInput
          value={newTag}
          onChangeText={setNewTag}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textLight}
        />
        <AddTagButton onPress={handleAddTag} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color={theme.colors.surface} />
        </AddTagButton>
      </TagInputContainer>
    </>
  );
};
