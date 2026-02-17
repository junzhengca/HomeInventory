import React, { useRef, useCallback, useState, useEffect } from 'react';
import { ScrollView, ActivityIndicator, View, Text, Alert } from 'react-native';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import type { StyledProps } from '../utils/styledComponents';
import { uiLogger } from '../utils/Logger';

import {
  PageHeader,
  ThemeChooser,
  CurrencySelector,
  LanguageSelector,
  SettingsToggleItem,
  SettingsTextButton,
  EditHomeBottomSheet,
  HomeSwitcher,
  PermissionConfigPanel,
  EmptyState,
  Button,
  MemberList,
  InviteMenuBottomSheet,
  HorizontalSplitter,
  IconContainer,
  Toggle,
  SectionTitle,
} from '../components';
import { useSettings, useAuth } from '../store/hooks';
import { useHome } from '../hooks/useHome';
import { useToast } from '../hooks/useToast';
import { calculateBottomPadding } from '../utils/layout';
import { RootStackParamList } from '../navigation/types';
import { Member } from '../types/api';

const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const Content = styled(ScrollView)`
  flex: 1;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const SettingsSectionCard = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const VersionText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.regular};
  color: ${({ theme }: StyledProps) => theme.colors.textLight};
  text-align: center;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const LoadingContainer = styled(View)`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const LoginPromptContainer = styled(View)`
  align-items: center;
  justify-content: center;
  padding: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const ButtonContainer = styled(View)`
  width: 100%;
  max-width: 300px;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const CardFootnote = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.regular};
  color: ${({ theme }: StyledProps) => theme.colors.textLight};
  text-align: center;
  margin-top: 0px;
  margin-bottom: 0px;
`;

const SectionWrapper = styled(View)`
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const PermissionRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const LeftSection = styled(View)`
  flex-direction: row;
  align-items: center;
  flex: 1;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const TextContainer = styled(View)`
  flex: 1;
  flex-direction: column;
  margin-left: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const ItemLabel = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const ItemDescription = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.regular};
  color: ${({ theme }: StyledProps) => theme.colors.textLight};
`;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, isLoading } = useSettings();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user, isAuthenticated, getApiClient } = useAuth();
  const toast = useToast();

  const { currentHome, deleteHome, fetchHomes: _fetchHomes } = useHome();
  const editHomeSheetRef = useRef<BottomSheetModal>(null);
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

  useEffect(() => {
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
        toast.showToast(t('share.members.removeSuccess', 'Member removed successfully'), 'success');
        loadMembers();
      } catch (error) {
        uiLogger.error('Error removing member', error);
        toast.showToast(t('share.members.removeError', 'Failed to remove member'), 'error');
      }
    },
    [currentHome?.id, getApiClient, loadMembers, toast, t]
  );

  const handleInvitePress = useCallback(() => {
    inviteMenuBottomSheetRef.current?.present();
  }, []);

  const getInvitationLink = useCallback(() => {
    const scheme = 'com.cluttrapp.cluttr';
    return `${scheme}://?inviteCode=${invitationCode}`;
  }, [invitationCode]);

  const handleToggleInventory = useCallback(async () => {
    if (!currentHome?.id) return;

    const newValue = !canShareInventory;

    try {
      const apiClient = getApiClient();
      if (!apiClient) return;

      await apiClient.updateHomeSettings(currentHome.id, { canShareInventory: newValue });
      toast.showToast(t('share.settings.updateSuccess', 'Settings updated'), 'success');
      const apiClient2 = getApiClient();
      if (apiClient2) {
        const { homeService } = await import('../services/HomeService');
        await homeService.fetchHomes(apiClient2);
      }
    } catch (error) {
      uiLogger.error('Error updating inventory settings', error);
      toast.showToast(t('share.settings.updateError', 'Failed to update settings'), 'error');
    }
  }, [canShareInventory, currentHome?.id, getApiClient, toast, t]);

  const handleToggleTodos = useCallback(async () => {
    if (!currentHome?.id) return;

    const newValue = !canShareTodos;

    try {
      const apiClient = getApiClient();
      if (!apiClient) return;

      await apiClient.updateHomeSettings(currentHome.id, { canShareTodos: newValue });
      toast.showToast(t('share.settings.updateSuccess', 'Settings updated'), 'success');
      const apiClient2 = getApiClient();
      if (apiClient2) {
        const { homeService } = await import('../services/HomeService');
        await homeService.fetchHomes(apiClient2);
      }
    } catch (error) {
      uiLogger.error('Error updating todos settings', error);
      toast.showToast(t('share.settings.updateError', 'Failed to update settings'), 'error');
    }
  }, [canShareTodos, currentHome?.id, getApiClient, toast, t]);

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
            toast.showToast('Leave home: Mock mode - not implemented', 'info');
          },
        },
      ]
    );
  }, [toast, t]);

  const handleLoginPress = useCallback(() => {
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('Profile');
    }
  }, [navigation]);

  const handleEditHomePress = useCallback(() => {
    editHomeSheetRef.current?.present();
  }, []);

  const handleDeleteHomePress = useCallback(() => {
    if (!currentHome) return;

    Alert.alert(
      t('settings.deleteHome.title'),
      t('settings.deleteHome.message'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const apiClient = getApiClient();
            if (!apiClient) return;
            const success = await deleteHome(apiClient, currentHome.id);
            if (success) {
              toast.showToast(t('settings.deleteHome.success'));
            } else {
              Alert.alert(t('common.error'), t('settings.deleteHome.error'));
            }
          },
        },
      ]
    );
  }, [currentHome, deleteHome, getApiClient, toast, t]);

  const handleAvatarPress = () => {
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('Profile');
    }
  };

  const handleThemeChange = async (themeId: string) => {
    const success = await updateSettings({ theme: themeId });
    if (!success) {
      uiLogger.error('Failed to update theme setting');
    }
  };

  const handleCurrencyChange = async (currencyId: string) => {
    const success = await updateSettings({ currency: currencyId });
    if (!success) {
      uiLogger.error('Failed to update currency setting');
    }
  };

  const handleLanguageChange = async (languageId: string) => {
    const success = await updateSettings({ language: languageId });
    if (!success) {
      uiLogger.error('Failed to update language setting');
    }
  };

  const handleDarkModeChange = async (value: boolean) => {
    const success = await updateSettings({ darkMode: value });
    if (!success) {
      uiLogger.error('Failed to update dark mode setting');
    }
  };

  // Calculate bottom padding for scrollable content
  const bottomPadding = calculateBottomPadding(insets.bottom);

  // Get version from app.json
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  if (isLoading || !settings) {
    return (
      <Container>
        <PageHeader
          titleComponent={<HomeSwitcher />}
          showBackButton={false}
          showRightButtons={true}
          avatarUrl={user?.avatarUrl}
          ownerAvatarUrl={currentHome?.role === 'member' ? currentHome?.owner?.avatarUrl : undefined}
          onAvatarPress={handleAvatarPress}
        />
        <LoadingContainer>
          <ActivityIndicator size="large" />
        </LoadingContainer>
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
        ownerAvatarUrl={currentHome?.role === 'member' ? currentHome?.owner?.avatarUrl : undefined}
        onAvatarPress={handleAvatarPress}
      />
      <Content
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        {/* Home Settings Section */}
        {currentHome && (
          <SectionTitle title={t('settings.homeSettings')} icon="home-outline" />
        )}
        <SettingsSectionCard>
          {!isAuthenticated ? (
            <>
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
            </>
          ) : (
            <>
              <MemberList
                owner={
                  currentHome?.owner
                    ? {
                        userId: currentHome.owner.userId,
                        email: currentHome.owner.email,
                        nickname: currentHome.owner.nickname,
                        avatarUrl: currentHome.owner.avatarUrl,
                      }
                    : null
                }
                members={members.filter((member) => !member.isOwner)}
                isLoading={isLoadingMembers}
                error={membersError}
                onRemoveMember={currentHome?.role === 'owner' ? handleRemoveMember : undefined}
                onInvitePress={handleInvitePress}
                showInviteButton={currentHome?.role === 'owner'}
              />

              {currentHome?.role === 'owner' && (
                <PermissionConfigPanel
                  canShareInventory={canShareInventory}
                  canShareTodos={canShareTodos}
                  onToggleInventory={handleToggleInventory}
                  onToggleTodos={handleToggleTodos}
                  isLoading={false}
                />
              )}
              {currentHome && (
                <>
                  <HorizontalSplitter />
                  {currentHome.role === 'owner' && (
                    <>
                      <SettingsTextButton
                        label={t('settings.editHome')}
                        icon="pencil-outline"
                        onPress={handleEditHomePress}
                      />
                      <SettingsTextButton
                        label={t('settings.deleteHome.title')}
                        icon="trash-outline"
                        onPress={handleDeleteHomePress}
                        variant="destructive"
                        noMarginBottom
                      />
                    </>
                  )}
                  {currentHome.role === 'member' && (
                    <SettingsTextButton
                      label={t('share.members.leaveHome', 'Leave Home')}
                      icon="log-out-outline"
                      onPress={handleLeaveHome}
                      variant="destructive"
                      noMarginBottom
                    />
                  )}
                </>
              )}
            </>
          )}
        </SettingsSectionCard>
        {currentHome && (
          <CardFootnote>
            {t('settings.appliesToHome', { homeName: currentHome.name })}
          </CardFootnote>
        )}

        {/* Appearance Section */}
        <SectionWrapper>
          <SectionTitle title={t('settings.appearance')} icon="color-palette-outline" />
          <SettingsSectionCard>
          <ThemeChooser
            selectedThemeId={settings.theme}
            onThemeSelect={handleThemeChange}
          />
          <CurrencySelector
            selectedCurrencyId={settings.currency}
            onCurrencySelect={handleCurrencyChange}
          />
          <LanguageSelector
            selectedLanguageId={settings.language}
            onLanguageSelect={handleLanguageChange}
          />
          <PermissionRow>
            <LeftSection>
              <IconContainer icon="moon-outline" />
              <TextContainer>
                <ItemLabel>{t('settings.darkMode')}</ItemLabel>
                <ItemDescription>{t('settings.darkModeDescription')}</ItemDescription>
              </TextContainer>
            </LeftSection>
            <Toggle
              value={settings.darkMode ?? false}
              onValueChange={handleDarkModeChange}
            />
          </PermissionRow>
        </SettingsSectionCard>
        </SectionWrapper>

        {/* Version Info */}
        <VersionText>
          {t('settings.versionPrefix')} v{appVersion}
        </VersionText>
      </Content>
      <EditHomeBottomSheet
        bottomSheetRef={editHomeSheetRef}
        home={currentHome || null}
      />
      <InviteMenuBottomSheet
        bottomSheetRef={inviteMenuBottomSheetRef}
        invitationCode={invitationCode || ''}
        invitationLink={invitationCode ? getInvitationLink() : ''}
      />
    </Container>
  );
};

