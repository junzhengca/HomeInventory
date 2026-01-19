import React, { useState, useEffect, useCallback } from 'react';
import { View, Alert, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { StyledProps } from '../utils/styledComponents';
import { PageHeader } from '../components/PageHeader';
import { PermissionConfigPanel } from '../components/PermissionConfigPanel';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/Button';
import { calculateBottomPadding } from '../utils/layout';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../store/hooks';
import { useToast } from '../hooks/useToast';
import { ApiClient } from '../services/ApiClient';
import { getAuthTokens } from '../services/AuthService';

const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const Content = styled(View)`
  flex: 1;
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
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [canShareInventory, setCanShareInventory] = useState(false);
  const [canShareTodos, setCanShareTodos] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const getApiClient = useCallback(async (): Promise<ApiClient | null> => {
    const API_BASE_URL =
      process.env.EXPO_PUBLIC_API_BASE_URL ||
      'https://home-inventory-api.logiccore.digital';
    const apiClient = new ApiClient(API_BASE_URL);
    const tokens = await getAuthTokens();
    if (tokens) {
      apiClient.setAuthToken(tokens.accessToken);
      return apiClient;
    }
    return null;
  }, []);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiClient = await getApiClient();
      if (!apiClient) {
        console.error('Failed to get API client');
        setIsLoading(false);
        return;
      }

      const response = await apiClient.getInvitationCode();
      setCanShareInventory(response.settings.canShareInventory);
      setCanShareTodos(response.settings.canShareTodos);
    } catch (error) {
      console.error('Error loading settings:', error);
      showToast(t('share.permissions.toast.updateError'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [getApiClient, showToast, t]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
    } else {
      setIsLoading(false);
    }
  }, [loadSettings, isAuthenticated]);

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
            const apiClient = await getApiClient();
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
            const apiClient = await getApiClient();
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
      <Content style={{ paddingBottom: calculateBottomPadding(insets.bottom) }}>
        {isLoading ? (
          <LoadingContainer>
            <ActivityIndicator size="large" />
          </LoadingContainer>
        ) : (
          <PermissionConfigPanel
            canShareInventory={canShareInventory}
            canShareTodos={canShareTodos}
            onToggleInventory={handleToggleInventory}
            onToggleTodos={handleToggleTodos}
            isLoading={isUpdating}
          />
        )}
      </Content>
    </Container>
  );
};
