import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Alert, ActivityIndicator, ScrollView, Animated, Dimensions, Text } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
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
import { Member, AccessibleAccount } from '../types/api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
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
  color: #000000;
  margin-bottom: 4px;
`;

const SwitchSubtitle = styled(Text)`
  font-size: 14px;
  color: #757575;
`;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ShareScreen: React.FC = () => {
  const { t } = useTranslation();
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

  const accounts = useAppSelector((state) => state.auth.accessibleAccounts);
  const [isSwitchingHome, setIsSwitchingHome] = useState(false);
  const panAnim = useRef(new Animated.Value(0)).current;

  const currentHome = accounts.find(a =>
    activeHomeId ? a.userId === activeHomeId : a.isOwner
  ) || (user ? { userId: user.id, nickname: user.nickname || user.email, email: user.email, isOwner: true } : null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiClient = getApiClient();
      if (!apiClient) {
        console.error('Failed to get API client');
        setIsLoading(false);
        return;
      }

      // Note: Backend should support userId query param for these settings
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

  const loadAccounts = useCallback(() => {
    dispatch({ type: 'auth/LOAD_ACCESSIBLE_ACCOUNTS' });
  }, [dispatch]);

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

  const accountColors = ['#E1F5FE', '#FCE4EC', '#E8F5E9', '#FFF3E0', '#F3E5F5'];

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
                  memberCount={members.length}
                  isActive={true}
                  showSwitchButton={true}
                  onSwitchPress={handleSwitchHomePress}
                />

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
        </PageView>

        {/* Switch Home View */}
        <PageView>
          <Content
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: calculateBottomPadding(insets.bottom) }}
          >
            {accounts.map((account, index) => (
              <HomeCard
                key={account.userId}
                name={account.nickname || account.email}
                memberCount={0} // We don't have member count for other homes in the accounts list
                isActive={activeHomeId ? account.userId === activeHomeId : account.isOwner}
                backgroundColor={accountColors[index % accountColors.length]}
                onPress={() => handleAccountSelect(account.userId)}
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
