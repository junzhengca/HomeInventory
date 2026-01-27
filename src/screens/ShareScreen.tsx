import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { StyledProps } from '../utils/styledComponents';
import {
  PageHeader,
  PermissionConfigPanel,
  EmptyState,
  Button,
  MemberList,
  InviteMenuBottomSheet,
} from '../components';
import { calculateBottomPadding } from '../utils/layout';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../store/hooks';
import { useToast } from '../hooks/useToast';
import { Member } from '../types/api';

const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const Content = styled(ScrollView)`
  flex: 1;
  padding: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const LoadingContainer = styled(View)`
  flex: 1;
  align-items: center;
  justify-content: center;
`;

const LoginPromptContainer = styled(View)`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const ButtonContainer = styled(View)`
  width: 100%;
  max-width: 300px;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ShareScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user, isAuthenticated, getApiClient } = useAuth();
  const { showToast } = useToast();
  const inviteMenuBottomSheetRef = useRef<BottomSheetModal | null>(null);

  const [canShareInventory, setCanShareInventory] = useState(false);
  const [canShareTodos, setCanShareTodos] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitationCode, setInvitationCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiClient = getApiClient();
      if (!apiClient) {
        console.error('Failed to get API client');
        setIsLoading(false);
        return;
      }

      const response = await apiClient.getInvitationCode();
      setCanShareInventory(response.settings.canShareInventory);
      setCanShareTodos(response.settings.canShareTodos);
      setInvitationCode(response.invitationCode);
    } catch (error) {
      console.error('Error loading settings:', error);
      showToast(t('share.permissions.toast.updateError'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [getApiClient, showToast, t]);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError(null);
    try {
      const apiClient = getApiClient();
      if (!apiClient) {
        console.error('Failed to get API client');
        setMembersError(t('share.members.loadError'));
        setMembersLoading(false);
        return;
      }

      const response = await apiClient.listMembers();
      setMembers(response.members);
    } catch (error) {
      console.error('Error loading members:', error);
      setMembersError(t('share.members.loadError'));
    } finally {
      setMembersLoading(false);
    }
  }, [getApiClient, t]);

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      try {
        const apiClient = getApiClient();
        if (!apiClient) {
          throw new Error('Failed to get API client');
        }

        await apiClient.removeMember(memberId);
        showToast(t('share.members.removeSuccess'), 'success');
        // Reload members after removal
        await loadMembers();
      } catch (error) {
        console.error('Error removing member:', error);
        showToast(t('share.members.removeError'), 'error');
      }
    },
    [getApiClient, loadMembers, showToast, t]
  );

  const handleInvitePress = useCallback(() => {
    if (!invitationCode) {
      showToast(t('share.invite.loadingError'), 'error');
      return;
    }
    inviteMenuBottomSheetRef.current?.present();
  }, [invitationCode, showToast, t]);

  const getInvitationLink = useCallback(() => {
    // Generate invitation link - using deep link scheme
    // This will create a link like: com.cluttrapp.cluttr://?inviteCode=123456
    // We use root path to avoid "Unmatched Route" error in Expo Router
    // We use inviteCode param to avoid collision with OAuth 'code' param
    const scheme = 'com.cluttrapp.cluttr'; // Matches app.json scheme
    return `${scheme}://?inviteCode=${invitationCode}`;
  }, [invitationCode]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
      loadMembers();
    } else {
      setIsLoading(false);
    }
  }, [loadSettings, loadMembers, isAuthenticated]);

  const handleToggleInventory = useCallback(() => {
    const newValue = !canShareInventory;
    const itemLabel = t('share.permissions.itemLibrary.label');
    const title = newValue
      ? t('share.permissions.confirm.enableTitle')
      : t('share.permissions.confirm.disableTitle');
    const message = newValue
      ? t('share.permissions.confirm.enableMessage', { item: itemLabel })
      : t('share.permissions.confirm.disableMessage', { item: itemLabel });

    Alert.alert(title, message, [
      {
        text: t('share.permissions.confirm.cancel'),
        style: 'cancel',
      },
      {
        text: t('share.permissions.confirm.confirm'),
        onPress: async () => {
          setIsUpdating(true);
          try {
            const apiClient = getApiClient();
            if (!apiClient) {
              throw new Error('Failed to get API client');
            }

            await apiClient.updateAccountSettings({
              canShareInventory: newValue,
            });

            setCanShareInventory(newValue);
            showToast(t('share.permissions.toast.updateSuccess'), 'success');
          } catch (error) {
            console.error('Error updating inventory sharing:', error);
            showToast(t('share.permissions.toast.updateError'), 'error');
          } finally {
            setIsUpdating(false);
          }
        },
      },
    ]);
  }, [canShareInventory, getApiClient, showToast, t]);

  const handleToggleTodos = useCallback(() => {
    const newValue = !canShareTodos;
    const itemLabel = t('share.permissions.shoppingList.label');
    const title = newValue
      ? t('share.permissions.confirm.enableTitle')
      : t('share.permissions.confirm.disableTitle');
    const message = newValue
      ? t('share.permissions.confirm.enableMessage', { item: itemLabel })
      : t('share.permissions.confirm.disableMessage', { item: itemLabel });

    Alert.alert(title, message, [
      {
        text: t('share.permissions.confirm.cancel'),
        style: 'cancel',
      },
      {
        text: t('share.permissions.confirm.confirm'),
        onPress: async () => {
          setIsUpdating(true);
          try {
            const apiClient = getApiClient();
            if (!apiClient) {
              throw new Error('Failed to get API client');
            }

            await apiClient.updateAccountSettings({
              canShareTodos: newValue,
            });

            setCanShareTodos(newValue);
            showToast(t('share.permissions.toast.updateSuccess'), 'success');
          } catch (error) {
            console.error('Error updating todos sharing:', error);
            showToast(t('share.permissions.toast.updateError'), 'error');
          } finally {
            setIsUpdating(false);
          }
        },
      },
    ]);
  }, [canShareTodos, getApiClient, showToast, t]);

  const handleAvatarPress = () => {
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('Profile');
    }
  };

  const handleLoginPress = () => {
    // Navigate directly to Profile page
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('Profile');
    }
  };

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <Container>
        <PageHeader
          icon="share-outline"
          title={t('share.title')}
          subtitle={t('share.subtitle')}
          showBackButton={false}
          showRightButtons={false}
        />
        <Content style={{ paddingBottom: calculateBottomPadding(insets.bottom) }}>
          <LoginPromptContainer>
            <EmptyState
              icon="lock-closed"
              title={t('share.loginRequired.title')}
              description={t('share.loginRequired.description')}
            />
            <ButtonContainer>
              <Button
                onPress={handleLoginPress}
                label={t('login.submit')}
                icon="log-in"
                variant="primary"
              />
            </ButtonContainer>
          </LoginPromptContainer>
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader
        icon="share-outline"
        title={t('share.title')}
        subtitle={t('share.subtitle')}
        showBackButton={false}
        showRightButtons={true}
        avatarUrl={user?.avatarUrl}
        onAvatarPress={handleAvatarPress}
      />
      <Content
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: calculateBottomPadding(insets.bottom) }}
      >
        {isLoading ? (
          <LoadingContainer>
            <ActivityIndicator size="large" />
          </LoadingContainer>
        ) : (
          <>
            <MemberList
              owner={user}
              members={members}
              isLoading={membersLoading}
              error={membersError}
              onRemoveMember={handleRemoveMember}
              onInvitePress={handleInvitePress}
            />
            <PermissionConfigPanel
              canShareInventory={canShareInventory}
              canShareTodos={canShareTodos}
              onToggleInventory={handleToggleInventory}
              onToggleTodos={handleToggleTodos}
              isLoading={isUpdating}
            />
          </>
        )}
      </Content>
      <InviteMenuBottomSheet
        bottomSheetRef={inviteMenuBottomSheetRef}
        invitationCode={invitationCode || ''}
        invitationLink={invitationCode ? getInvitationLink() : ''}
      />
    </Container>
  );
};
