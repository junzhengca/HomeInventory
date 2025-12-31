import React from 'react';
import { TouchableOpacity, View, Text, Alert } from 'react-native';
import { Image } from 'expo-image';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import type { StyledProps } from '../utils/styledComponents';
import { useTranslation } from 'react-i18next';
import { TodoItem } from '../types/inventory';

interface SharePanelProps {
  userAvatarUrl?: string;
  pendingTodos: TodoItem[];
  isAuthenticated: boolean;
  onInvitePress?: () => void;
}

const PanelContainer = styled(View)`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const AvatarContainer = styled(View)`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  overflow: hidden;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  border: 1px solid ${({ theme }: StyledProps) => theme.colors.borderLight};
`;

const AvatarImage = styled(Image)`
  width: 100%;
  height: 100%;
`;

const AvatarPlaceholder = styled(View)`
  width: 100%;
  height: 100%;
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryLight};
  align-items: center;
  justify-content: center;
`;

const FamilySharingText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: 500;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  flex: 1;
`;

const ButtonsContainer = styled(View)`
  flex-direction: row;
  justify-content: flex-end;
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const ActionButton = styled(TouchableOpacity)<{ variant?: 'copy' | 'invite' }>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  background-color: ${({ theme, variant }: StyledProps & { variant?: 'copy' | 'invite' }) =>
    variant === 'invite' ? theme.colors.primary : theme.colors.surface};
  border-width: ${({ variant }: { variant?: 'copy' | 'invite' }) => (variant === 'copy' ? 1 : 0)}px;
  border-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  min-height: 28px;
  min-width: 60px;
`;

const ButtonText = styled(Text)<{ variant?: 'copy' | 'invite' }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: 500;
  color: ${({ theme, variant }: StyledProps & { variant?: 'copy' | 'invite' }) =>
    variant === 'invite' ? 'white' : theme.colors.text};
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const ButtonIcon = styled(Ionicons)<{ variant?: 'copy' | 'invite' }>`
  color: ${({ theme, variant }: StyledProps & { variant?: 'copy' | 'invite' }) =>
    variant === 'invite' ? 'white' : theme.colors.text};
`;

export const SharePanel: React.FC<SharePanelProps> = ({
  userAvatarUrl,
  pendingTodos,
  isAuthenticated,
  onInvitePress,
}) => {
  const { t } = useTranslation();

  const handleCopy = async () => {
    if (pendingTodos.length === 0) {
      Alert.alert(
        t('notes.share.noTodos.title'),
        t('notes.share.noTodos.message')
      );
      return;
    }

    // Create plaintext list of pending todos
    const todoList = pendingTodos.map((todo, index) => `${index + 1}. ${todo.text}`).join('\n');
    
    try {
      await Clipboard.setStringAsync(todoList);
      Alert.alert(
        t('notes.share.copied.title'),
        t('notes.share.copied.message', { count: pendingTodos.length })
      );
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert(
        t('notes.share.error.title'),
        t('notes.share.error.message')
      );
    }
  };

  const handleInvite = () => {
    if (onInvitePress) {
      onInvitePress();
    }
  };

  return (
    <PanelContainer>
      <AvatarContainer>
        {userAvatarUrl ? (
          <AvatarImage source={{ uri: userAvatarUrl }} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <AvatarPlaceholder>
            <Ionicons name="person" size={16} color="white" />
          </AvatarPlaceholder>
        )}
      </AvatarContainer>
      <FamilySharingText>{t('notes.share.familySharing')}</FamilySharingText>
      <ButtonsContainer>
        <ActionButton variant="copy" onPress={handleCopy} activeOpacity={0.7}>
          <ButtonIcon name="copy-outline" size={14} variant="copy" />
          <ButtonText variant="copy">{t('notes.share.copy')}</ButtonText>
        </ActionButton>
        {isAuthenticated && (
          <ActionButton variant="invite" onPress={handleInvite} activeOpacity={0.7}>
            <ButtonIcon name="person-add-outline" size={14} variant="invite" />
            <ButtonText variant="invite">{t('notes.share.invite')}</ButtonText>
          </ActionButton>
        )}
      </ButtonsContainer>
    </PanelContainer>
  );
};

