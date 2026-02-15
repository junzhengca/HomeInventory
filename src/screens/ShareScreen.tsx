import React, { useState, useCallback, useRef } from 'react';
import { View, Alert, ScrollView, Text, TouchableOpacity } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import type { StyledProps } from '../utils/styledComponents';
import { uiLogger } from '../utils/Logger';
import {
  PageHeader,
  PermissionConfigPanel,
  EmptyState,
  Button,
  MemberList,
  InviteMenuBottomSheet,
  HomeCard,
  HomeSwitcher,
} from '../components';
import { calculateBottomPadding } from '../utils/layout';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../store/hooks';
import { useToast } from '../hooks/useToast';

import { Member } from '../types/api';
import { useHome } from '../hooks/useHome';



const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const Content = styled(ScrollView)`
  flex: 1;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
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

const LeaveHomeButton = styled(TouchableOpacity)`
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  align-items: center;
  justify-content: center;
  flex-direction: row;
`;

const LeaveHomeText = styled(Text)`
  color: ${({ theme }: StyledProps) => theme.colors.error || '#ff4444'};
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  margin-left: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ShareScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user, isAuthenticated, getApiClient } = useAuth();

  const { currentHome } = useHome();
  const { showToast } = useToast();
  const inviteMenuBottomSheetRef = useRef<BottomSheetModal | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  const invitationCode = currentHome?.invitationCode;
  const canShareInventory = currentHome?.settings?.canShareInventory ?? true;
  const canShareTodos = currentHome?.settings?.canShareTodos ?? true;

  const loadMembers = useCallback(async () => {
    if (!currentHome?.id) return;

    setIsLoadingMembers(true);
    setMembersError(null);
    try {
      const apiClient = getApiClient();
      if (!apiClient) return;

      const response = await apiClient.listMembers(currentHome.id);
      setMembers(response.members);
    } catch (error) {
      uiLogger.error('Error loading members', error);
      setMembersError('Failed to load members');
    } finally {
      setIsLoadingMembers(false);
    }
  }, [currentHome?.id, getApiClient]);

  React.useEffect(() => {
    if (isAuthenticated) {
      loadMembers();
    }
  }, [isAuthenticated, loadMembers]);

  const handleRemoveMember = useCallback(
    async (memberUserId: string) => {
      if (!currentHome?.id) return;

      try {
        const apiClient = getApiClient();
        if (!apiClient) return;

        await apiClient.removeMember(currentHome.id, memberUserId);
        showToast(t('share.members.removeSuccess', 'Member removed successfully'), 'success');
        loadMembers();
      } catch (error) {
        uiLogger.error('Error removing member', error);
        showToast(t('share.members.removeError', 'Failed to remove member'), 'error');
      }
    },
    [currentHome?.id, getApiClient, loadMembers, showToast, t]
  );

  const handleInvitePress = useCallback(() => {
    inviteMenuBottomSheetRef.current?.present();
  }, [showToast, t]);

  const getInvitationLink = useCallback(() => {
    const scheme = 'com.cluttrapp.cluttr'; // Matches app.json scheme
    return `${scheme}://?inviteCode=${invitationCode}`;
  }, [invitationCode]);

  const handleToggleInventory = useCallback(async () => {
    if (!currentHome?.id) return;

    const newValue = !canShareInventory;

    try {
      const apiClient = getApiClient();
      if (!apiClient) return;

      await apiClient.updateHomeSettings(currentHome.id, { canShareInventory: newValue });
      showToast(t('share.settings.updateSuccess', 'Settings updated'), 'success');
      // Trigger a home fetch to refresh the settings
      const apiClient2 = getApiClient();
      if (apiClient2) {
        const { homeService } = await import('../services/HomeService');
        await homeService.fetchHomes(apiClient2);
      }
    } catch (error) {
      uiLogger.error('Error updating inventory settings', error);
      showToast(t('share.settings.updateError', 'Failed to update settings'), 'error');
    }
  }, [canShareInventory, currentHome?.id, getApiClient, showToast, t]);

  const handleToggleTodos = useCallback(async () => {
    if (!currentHome?.id) return;

    const newValue = !canShareTodos;

    try {
      const apiClient = getApiClient();
      if (!apiClient) return;

      await apiClient.updateHomeSettings(currentHome.id, { canShareTodos: newValue });
      showToast(t('share.settings.updateSuccess', 'Settings updated'), 'success');
      // Trigger a home fetch to refresh the settings
      const apiClient2 = getApiClient();
      if (apiClient2) {
        const { homeService } = await import('../services/HomeService');
        await homeService.fetchHomes(apiClient2);
      }
    } catch (error) {
      uiLogger.error('Error updating todos settings', error);
      showToast(t('share.settings.updateError', 'Failed to update settings'), 'error');
    }
  }, [canShareTodos, currentHome?.id, getApiClient, showToast, t]);

  const handleLeaveHome = useCallback(() => {
    Alert.alert(
      t('share.members.leaveConfirm.title', 'Leave Home'),
      t('share.members.leaveConfirm.message', 'Are you sure you want to leave this home?'),
      [
        {
          text: t('common.cancel', 'Cancel'),
          style: 'cancel',
        },
        {
          text: t('share.members.leaveConfirm.confirm', 'Leave'),
          style: 'destructive',
          onPress: () => {
            showToast('Leave home: Mock mode - not implemented', 'info');
          },
        },
      ]
    );
  }, [showToast, t]);

  const handleAvatarPress = () => {
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('Profile');
    }
  };

  const handleLoginPress = () => {
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('Profile');
    }
  };

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
        titleComponent={<HomeSwitcher />}
        showBackButton={false}
        showRightButtons={true}
        avatarUrl={user?.avatarUrl}
        ownerAvatarUrl={currentHome?.role === 'member' ? currentHome.owner?.avatarUrl : undefined}
        onAvatarPress={handleAvatarPress}
      />

      <Content
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: calculateBottomPadding(insets.bottom) }}
      >
        <HomeCard
          name={currentHome?.name || t('share.home.currentHome')}
          isActive={true}
          canShareInventory={canShareInventory}
          canShareTodos={canShareTodos}
        />

        <MemberList
          owner={currentHome?.owner ? {
            userId: currentHome.owner.userId,
            email: currentHome.owner.email,
            nickname: currentHome.owner.nickname,
            avatarUrl: currentHome.owner.avatarUrl,
          } : null}
          members={members.filter((member) => !member.isOwner)}
          isLoading={isLoadingMembers}
          error={membersError}
          onRemoveMember={currentHome?.role === 'owner' ? handleRemoveMember : undefined}
          onInvitePress={handleInvitePress}
          showInviteButton={currentHome?.role === 'owner'}
        />

        {currentHome?.role === 'member' && (
          <LeaveHomeButton
            onPress={handleLeaveHome}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.colors.error || '#ff4444'} />
            <LeaveHomeText>{t('share.members.leaveHome', 'Leave Home')}</LeaveHomeText>
          </LeaveHomeButton>
        )}
        {currentHome?.role === 'owner' && (
          <PermissionConfigPanel
            canShareInventory={canShareInventory}
            canShareTodos={canShareTodos}
            onToggleInventory={handleToggleInventory}
            onToggleTodos={handleToggleTodos}
            isLoading={false}
          />
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
