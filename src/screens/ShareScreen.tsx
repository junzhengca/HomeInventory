import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Alert, ActivityIndicator, ScrollView, Animated, Dimensions, Text, TouchableOpacity } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import type { StyledProps } from '../utils/styledComponents';
import {
  PageHeader,
  PermissionConfigPanel,
  EmptyState,
  Button,
  MemberList,
  InviteMenuBottomSheet,
  HomeCard,
} from '../components';
import { calculateBottomPadding } from '../utils/layout';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../store/hooks';
import { useToast } from '../hooks/useToast';
import { Member } from '../types/api';
import { useAppDispatch, useAppSelector, useSync } from '../store/hooks';
import { setActiveHomeId } from '../store/slices/authSlice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const AnimatedContainer = styled(Animated.View)`
  flex: 1;
  flex-direction: row;
  width: ${SCREEN_WIDTH * 2}px;
`;

const PageView = styled(View)`
  width: ${SCREEN_WIDTH}px;
  flex: 1;
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

const SwitchHomeHeader = styled(View)`
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  padding-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const SwitchTitle = styled(Text)`
  font-size: 24px;
  font-weight: bold;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: 4px;
`;

const SwitchSubtitle = styled(Text)`
  font-size: 14px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
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
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp>();
  const { user, isAuthenticated, getApiClient } = useAuth();
  const activeHomeId = useAppSelector((state) => state.auth.activeHomeId);
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


  const { enabled: syncEnabled, enableSync } = useSync();
  const accounts = useAppSelector((state: any) => state.home?.homes || []);
  const [isSwitchingHome, setIsSwitchingHome] = useState(false);
  const panAnim = useRef(new Animated.Value(0)).current;

  const currentHome = accounts.find((a: any) =>
    activeHomeId ? a.id === activeHomeId : a.isOwner
  ) || (user ? { id: user.id, name: user.nickname || user.email, email: user.email, avatarUrl: user.avatarUrl, isOwner: true, createdAt: user.createdAt, permissions: { canShareInventory: true, canShareTodos: true } } : null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiClient = getApiClient();
      if (!apiClient) {
        console.error('Failed to get API client');
        setIsLoading(false);
        return;
      }

      // Use activeHomeId or fallback to currentHome.id (which is user.id for personal home)
      const homeId = activeHomeId || currentHome?.id;
      if (!homeId) {
        console.error('No homeId available for loading settings');
        setIsLoading(false);
        return;
      }

      const response = await apiClient.getInvitationCode(homeId);
      setCanShareInventory(response.settings.canShareInventory);
      setCanShareTodos(response.settings.canShareTodos);
      setInvitationCode(response.invitationCode);
    } catch (error) {
      console.error('Error loading settings:', error);
      showToast(t('share.permissions.toast.updateError'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [getApiClient, showToast, t, activeHomeId, currentHome?.id]);

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

      const homeId = activeHomeId || currentHome?.id;
      if (!homeId) {
        console.error('No homeId available for loading members');
        setMembersLoading(false);
        return;
      }

      const response = await apiClient.listMembers(homeId);
      setMembers(response.members);
    } catch (error) {
      console.error('Error loading members:', error);
      // If 403 or 404, it might be a new locally created home that hasn't synced yet
      // So we just show no members (except owner which is handled by UI)
      const status = (error as any)?.status;
      if (status === 403 || status === 404) {
        setMembers([]);
      } else {
        setMembersError(t('share.members.loadError'));
      }
    } finally {
      setMembersLoading(false);
    }
  }, [getApiClient, t, activeHomeId, currentHome?.id]);

  const loadAccounts = useCallback(() => {
    dispatch({ type: 'home/LOAD_HOMES' });
  }, [dispatch]);

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      try {
        const apiClient = getApiClient();
        if (!apiClient) {
          throw new Error('Failed to get API client');
        }

        const homeId = activeHomeId || currentHome?.id;
        if (!homeId) {
          throw new Error('No homeId available for removing member');
        }

        await apiClient.removeMember(homeId, memberId);
        showToast(t('share.members.removeSuccess'), 'success');
        // Reload members after removal
        await loadMembers();
      } catch (error) {
        console.error('Error removing member:', error);
        showToast(t('share.members.removeError'), 'error');
      }
    },
    [getApiClient, loadMembers, showToast, t, activeHomeId, currentHome?.id]
  );

  const handleInvitePress = useCallback(() => {
    if (!invitationCode) {
      showToast(t('share.invite.loadingError'), 'error');
      return;
    }

    if (!syncEnabled) {
      Alert.alert(
        t('share.invite.syncRequired.title'),
        t('share.invite.syncRequired.message'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('common.confirmation'),
            onPress: () => {
              enableSync();
              // We can present the sheet immediately, or wait for sync to start?
              // The requirement says: "if they confirm, sync would be turned on and we continue."
              // So we proceed.
              inviteMenuBottomSheetRef.current?.present();
            },
          },
        ]
      );
      return;
    }

    inviteMenuBottomSheetRef.current?.present();
  }, [invitationCode, showToast, t, syncEnabled, enableSync]);

  const getInvitationLink = useCallback(() => {
    const scheme = 'com.cluttrapp.cluttr'; // Matches app.json scheme
    return `${scheme}://?inviteCode=${invitationCode}`;
  }, [invitationCode]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
      loadMembers();
      loadAccounts();
    } else {
      setIsLoading(false);
    }
  }, [loadSettings, loadMembers, loadAccounts, isAuthenticated, activeHomeId]);

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
            const homeId = activeHomeId || currentHome?.id;
            if (!apiClient || !homeId) {
              throw new Error('Failed to get API client or homeId');
            }

            await apiClient.updateAccountSettings(homeId, {
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
  }, [canShareInventory, getApiClient, showToast, t, activeHomeId, currentHome?.id]);

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
            const homeId = activeHomeId || currentHome?.id;
            if (!apiClient || !homeId) {
              throw new Error('Failed to get API client or homeId');
            }

            await apiClient.updateAccountSettings(homeId, {
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
  }, [canShareTodos, getApiClient, showToast, t, activeHomeId, currentHome?.id]);

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
          onPress: async () => {
            setIsUpdating(true);
            try {
              const apiClient = getApiClient();
              const homeId = activeHomeId || currentHome?.id;
              if (!apiClient || !homeId || !user) {
                throw new Error('Missing client, home or user info');
              }

              // To leave, we remove ourselves (memberId = user.id) from the account (userId = homeId)
              await apiClient.removeMember(homeId, user.id);

              showToast(t('share.members.leaveSuccess', 'Left home successfully'), 'success');

              // Switch back to own home
              dispatch(setActiveHomeId(null));

            } catch (error) {
              console.error('Error leaving home:', error);
              showToast(t('share.members.leaveError', 'Failed to leave home'), 'error');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  }, [getApiClient, activeHomeId, currentHome?.id, user, showToast, t, dispatch]);

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

  const handleSwitchHomePress = () => {
    setIsSwitchingHome(true);
    Animated.timing(panAnim, {
      toValue: -SCREEN_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleBackToSharePress = () => {
    Animated.timing(panAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsSwitchingHome(false);
    });
  };

  const handleAccountSelect = (accountId: string) => {
    // If selecting own account, set to null (default)
    const newActiveId = accountId === user?.id ? null : accountId;
    dispatch(setActiveHomeId(newActiveId));
    handleBackToSharePress();
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
        icon={isSwitchingHome ? "chevron-back" : "share-outline"}
        title={isSwitchingHome ? t('share.home.switchTitle') : t('share.title')}
        subtitle={isSwitchingHome ? t('share.home.switchSubtitle') : t('share.subtitle')}
        showBackButton={isSwitchingHome}
        onBackPress={isSwitchingHome ? handleBackToSharePress : undefined}
        showRightButtons={!isSwitchingHome}
        avatarUrl={user?.avatarUrl}
        ownerAvatarUrl={!isSwitchingHome && activeHomeId ? accounts.find((a: any) => a.userId === activeHomeId)?.avatarUrl : undefined}
        onAvatarPress={handleAvatarPress}
      />

      <AnimatedContainer style={{ transform: [{ translateX: panAnim }] }}>
        {/* Main Share View */}
        <PageView>
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
                <HomeCard
                  name={currentHome?.nickname || currentHome?.email || t('share.home.currentHome')}
                  isActive={true}
                  showSwitchButton={true}
                  onSwitchPress={handleSwitchHomePress}
                  canShareInventory={canShareInventory}
                  canShareTodos={canShareTodos}
                />

                <MemberList
                  owner={currentHome ? {
                    id: currentHome.id,
                    email: currentHome.email || '',
                    nickname: (currentHome as any).name || currentHome.nickname,
                    avatarUrl: currentHome.avatarUrl,
                    createdAt: (currentHome as any).createdAt,
                  } : null}
                  members={members}
                  isLoading={membersLoading}
                  error={membersError}
                  onRemoveMember={currentHome?.isOwner ? handleRemoveMember : undefined}
                  onInvitePress={handleInvitePress}
                  showInviteButton={currentHome?.isOwner}
                />

                {!currentHome?.isOwner && (
                  <LeaveHomeButton
                    onPress={handleLeaveHome}
                    activeOpacity={0.8}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <ActivityIndicator color={theme.colors.error || '#ff4444'} />
                    ) : (
                      <>
                        <Ionicons name="log-out-outline" size={20} color={theme.colors.error || '#ff4444'} />
                        <LeaveHomeText>{t('share.members.leaveHome', 'Leave Home')}</LeaveHomeText>
                      </>
                    )}
                  </LeaveHomeButton>
                )}
                {currentHome?.isOwner && (
                  <PermissionConfigPanel
                    canShareInventory={canShareInventory}
                    canShareTodos={canShareTodos}
                    onToggleInventory={handleToggleInventory}
                    onToggleTodos={handleToggleTodos}
                    isLoading={isUpdating}
                  />
                )}
              </>
            )}
          </Content>
        </PageView>

        {/* Switch Home View */}
        <PageView>
          <Content
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: calculateBottomPadding(insets.bottom) }}
          >
            {accounts.map((account: any, index: number) => (
              <HomeCard
                key={account.id}
                name={(account as any).name || account.nickname || account.email}
                isActive={activeHomeId ? account.id === activeHomeId : account.isOwner}
                onPress={() => handleAccountSelect(account.id)}
                canShareInventory={account.permissions?.canShareInventory}
                canShareTodos={account.permissions?.canShareTodos}
              />
            ))}

            {accounts.length === 0 && (
              <EmptyState
                icon="home-outline"
                title={t('share.members.empty.title')}
                description={t('share.members.empty.description')}
              />
            )}
          </Content>
        </PageView>
      </AnimatedContainer>

      <InviteMenuBottomSheet
        bottomSheetRef={inviteMenuBottomSheetRef}
        invitationCode={invitationCode || ''}
        invitationLink={invitationCode ? getInvitationLink() : ''}
      />
    </Container>
  );
};
