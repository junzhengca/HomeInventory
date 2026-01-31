import React, { useCallback, useState, useEffect, useRef } from 'react';
import { ScrollView, ActivityIndicator, View, Text, Alert, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import i18n from '../i18n/i18n';
import type { StyledProps, StyledPropsWith } from '../utils/styledComponents';
import {
  PageHeader,
  LogoutButton,
  Toggle,
  LoginBottomSheet,
  SignupBottomSheet,
  EditNicknameBottomSheet,
  type EditNicknameBottomSheetRef,
  Button,
} from '../components';
import { useAuth, useSync, useAppSelector } from '../store/hooks';
import { Member } from '../types/api';
import { useTheme } from '../theme/ThemeProvider';
import { calculateBottomPadding } from '../utils/layout';
import { formatDate } from '../utils/formatters';
import { signInWithGoogle } from '../services/GoogleAuthService';

const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const Content = styled(ScrollView)`
  flex: 1;
  padding: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const ProfileSection = styled(View)`
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.lg}px;
`;

const AvatarContainer = styled(TouchableOpacity)`
  width: 100px;
  height: 100px;
  border-radius: 50px;
  overflow: hidden;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  border-width: 4px;
  border-color: ${({ theme }: StyledProps) => theme.colors.primary};
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

const UserNameContainer = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const UserName = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const EditNicknameButton = styled(TouchableOpacity)`
  padding: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const UserEmail = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const UserId = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

const InfoSection = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const SectionTitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.xl}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const InfoRow = styled(View)`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const InfoLabel = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

const InfoValue = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const SyncStatusText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const ErrorText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.error};
  margin-top: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const LoadingContainer = styled(View)`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const SyncButton = styled(TouchableOpacity) <{ disabled?: boolean }>`
  background-color: ${({ theme, disabled }: StyledPropsWith<{ disabled?: boolean }>) =>
    disabled ? theme.colors.border : theme.colors.primary};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.sm}px ${({ theme }: StyledProps) => theme.spacing.md}px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  opacity: ${({ disabled }: StyledPropsWith<{ disabled?: boolean }>) => (disabled ? 0.6 : 1)};
  margin-top: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const SyncButtonText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.surface};
`;

const AuthButtonContainer = styled(View)`
  width: 100%;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  align-items: center;
`;

const ButtonWrapper = styled(View)`
  width: 100%;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const AuthSection = styled(View)`
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.lg}px;
`;

const AuthTitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.xl}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  text-align: center;
`;

const AuthSubtitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  text-align: center;
`;

export const ProfileScreen: React.FC = () => {
  const { user, isAuthenticated, isLoading, error, logout, updateUser, googleLogin, getApiClient } = useAuth();
  const { enabled: syncEnabled, loading: syncLoading, lastSyncTime, error: syncError, enableSync, disableSync, syncAll } = useSync();
  const activeHomeId = useAppSelector((state) => state.auth.activeHomeId);
  const accounts = useAppSelector((state) => state.auth.accessibleAccounts);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const theme = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [localSyncEnabled, setLocalSyncEnabled] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const loginBottomSheetRef = useRef<BottomSheetModal | null>(null);
  const signupBottomSheetRef = useRef<BottomSheetModal | null>(null);
  const editNicknameBottomSheetModalRef = useRef<BottomSheetModal | null>(null);
  const editNicknameBottomSheetRef = useRef<EditNicknameBottomSheetRef | null>(null);

  // Check if sync should be forced
  // 1. User is member of another home (not owner)
  const isMemberOfOtherHome = accounts.some(a => !a.isOwner);
  // 2. User's home has other members (excluding self)
  // We need to fetch members to know this. Ideally backend sends member count in user profile or account list.
  // For now, we fetch members.
  const hasOtherMembers = members.length > 0; // members list from API excludes owner

  const isForcedSync = isMemberOfOtherHome || hasOtherMembers;

  const loadMembers = useCallback(async () => {
    try {
      const apiClient = getApiClient();
      if (!apiClient) return;

      // List members for the current active home (or default context if activeHomeId is null)
      const response = await apiClient.listMembers(activeHomeId || undefined);
      setMembers(response.members);
    } catch (error) {
      console.error('Error loading members in Profile:', error);
    }
  }, [getApiClient, activeHomeId]);

  useEffect(() => {
    if (isAuthenticated) {
      loadMembers();
    }
  }, [isAuthenticated, loadMembers]);

  // Force enable sync if required
  useEffect(() => {
    if (isAuthenticated && isForcedSync && !syncEnabled && !syncLoading) {
      console.log('Forcing sync enabled due to membership status');
      enableSync();
    }
  }, [isAuthenticated, isForcedSync, syncEnabled, syncLoading, enableSync]);

  const getLocale = useCallback(() => {
    return i18n.language === 'zh' || i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US';
  }, []);

  const handleAvatarPress = useCallback(async () => {
    try {
      // Request permissions
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            t('profile.avatar.uploadError.title'),
            t('profile.avatar.uploadError.permissionDenied')
          );
          return;
        }
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        return;
      }

      const imageUri = result.assets[0].uri;
      setIsUploading(true);

      // Resize image to max 1024x1024 to reduce payload size
      // Since we're using square aspect ratio (1:1), 1024x1024 is appropriate
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1024, height: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Convert resized image to base64
      const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
        encoding: 'base64',
      });

      // Get API client and upload image
      const apiClient = getApiClient();
      if (!apiClient) {
        throw new Error('Failed to initialize API client');
      }

      // Upload image
      const uploadResponse = await apiClient.uploadImage(base64);
      if (!uploadResponse.url) {
        throw new Error('Upload response missing URL');
      }

      // Update avatar URL
      const updatedUser = await apiClient.updateAvatarUrl(uploadResponse.url);

      // Update user state
      await updateUser(updatedUser);

      Alert.alert(
        t('profile.avatar.uploadSuccess.title'),
        t('profile.avatar.uploadSuccess.message')
      );
    } catch (error) {
      console.error('Avatar upload error:', error);
      Alert.alert(
        t('profile.avatar.uploadError.title'),
        t('profile.avatar.uploadError.message')
      );
    } finally {
      setIsUploading(false);
    }
  }, [t, getApiClient, updateUser]);

  const handleLogout = () => {
    Alert.alert(
      t('settings.logout.title'),
      t('settings.logout.message'),
      [
        {
          text: t('settings.logout.cancel'),
          style: 'cancel',
        },
        {
          text: t('settings.logout.confirm'),
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleSyncToggle = useCallback(async () => {
    if (isForcedSync && syncEnabled) {
      // Should be disabled in UI, but double check here
      Alert.alert(
        t('profile.sync.title'),
        t('profile.sync.forcedWarning')
      );
      return;
    }

    try {
      if (syncEnabled) {
        await disableSync();
        setLocalSyncEnabled(false);
        Alert.alert(
          t('profile.sync.alerts.disabled.title'),
          t('profile.sync.alerts.disabled.message')
        );
      } else {
        await enableSync();
        setLocalSyncEnabled(true);
        Alert.alert(
          t('profile.sync.alerts.enabled.title'),
          t('profile.sync.alerts.enabled.message')
        );
      }
    } catch (error) {
      console.error('Error toggling sync:', error);
      Alert.alert(
        t('profile.sync.alerts.error.title'),
        error instanceof Error ? error.message : t('profile.sync.alerts.error.toggleFailed')
      );
    }
  }, [syncEnabled, enableSync, disableSync, t, isForcedSync]);

  const handleManualSync = useCallback(async () => {
    try {
      await syncAll();
      Alert.alert(
        t('profile.sync.alerts.started.title'),
        t('profile.sync.alerts.started.message')
      );
    } catch (error) {
      console.error('Error triggering manual sync:', error);
      Alert.alert(
        t('profile.sync.alerts.error.title'),
        error instanceof Error ? error.message : t('profile.sync.alerts.error.syncFailed')
      );
    }
  }, [syncAll, t]);

  useEffect(() => {
    setLocalSyncEnabled(syncEnabled);
  }, [syncEnabled]);

  const handleLoginPress = useCallback(() => {
    signupBottomSheetRef.current?.dismiss();
    loginBottomSheetRef.current?.present();
  }, []);

  const handleSignupPress = useCallback(() => {
    loginBottomSheetRef.current?.dismiss();
    signupBottomSheetRef.current?.present();
  }, []);

  const handleLoginSuccess = useCallback(() => {
    // User will be automatically updated via auth state
  }, []);

  const handleSignupSuccess = useCallback(() => {
    // User will be automatically updated via auth state
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    try {
      const idToken = await signInWithGoogle();
      if (idToken) {
        // Get platform (ios or android)
        const platform = Platform.OS === 'ios' ? 'ios' : 'android';

        // Call googleLogin hook which will dispatch the action
        googleLogin(idToken, platform);

        // Close bottom sheets if open
        loginBottomSheetRef.current?.dismiss();
        signupBottomSheetRef.current?.dismiss();
      }
    } catch (error) {
      console.error('Google login error:', error);
      Alert.alert(
        t('login.errors.googleLoginFailed.title') || 'Google Login Failed',
        error instanceof Error ? error.message : t('login.errors.googleLoginFailed.message') || 'Failed to sign in with Google. Please try again.'
      );
    }
  }, [t, googleLogin]);

  // Handle auth errors from Google login
  useEffect(() => {
    if (error && !isLoading) {
      // Check if error is related to Google login (409 conflict or other auth errors)
      let errorMessage = error;
      let errorTitle = t('login.errors.googleLoginFailed.title') || 'Google Login Failed';

      if (error.includes('Email already registered with email/password')) {
        errorMessage = t('login.errors.emailAlreadyRegistered.message') || 'Email already registered with email/password. Please login with email and password.';
        errorTitle = t('login.errors.emailAlreadyRegistered.title') || 'Account Already Exists';
      } else if (error.includes('Invalid Google account')) {
        errorMessage = t('login.errors.invalidGoogleAccount.message') || 'Invalid Google account. Please try again.';
      }

      Alert.alert(errorTitle, errorMessage);
    }
  }, [error, isLoading, t]);

  // Calculate bottom padding for scrollable content
  const bottomPadding = calculateBottomPadding(insets.bottom);

  if (isLoading) {
    return (
      <Container>
        <PageHeader
          icon="person"
          title={t('profile.title')}
          subtitle={t('profile.subtitle')}
          showBackButton={false}
          showRightButtons={false}
        />
        <LoadingContainer>
          <ActivityIndicator size="large" />
        </LoadingContainer>
      </Container>
    );
  }

  if (!user || !isAuthenticated) {
    return (
      <Container>
        <PageHeader
          icon="person"
          title={t('profile.title')}
          subtitle={t('profile.subtitle')}
          showBackButton={true}
          showRightButtons={false}
        />
        <Content
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
        >
          <AuthSection>
            <AuthTitle>{t('profile.auth.title')}</AuthTitle>
            <AuthSubtitle>{t('profile.auth.subtitle')}</AuthSubtitle>
            <AuthButtonContainer>
              <ButtonWrapper>
                <Button
                  onPress={handleLoginPress}
                  label={t('login.submit')}
                  icon="log-in"
                  variant="primary"
                />
              </ButtonWrapper>
              <ButtonWrapper>
                <Button
                  onPress={handleSignupPress}
                  label={t('signup.submit')}
                  icon="person-add"
                  variant="secondary"
                />
              </ButtonWrapper>
              <ButtonWrapper>
                <Button
                  onPress={handleGoogleLogin}
                  label={t('login.loginWithGoogle')}
                  icon="logo-google"
                  variant="secondary"
                />
              </ButtonWrapper>
            </AuthButtonContainer>
          </AuthSection>
        </Content>
        <LoginBottomSheet
          bottomSheetRef={loginBottomSheetRef}
          onSignupPress={handleSignupPress}
          onLoginSuccess={handleLoginSuccess}
        />
        <SignupBottomSheet
          bottomSheetRef={signupBottomSheetRef}
          onLoginPress={handleLoginPress}
          onSignupSuccess={handleSignupSuccess}
        />
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader
        icon="person"
        title={t('profile.title')}
        subtitle={t('profile.subtitle')}
        showBackButton={true}
        showRightButtons={false}
      />
      <Content
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        <ProfileSection>
          <AvatarContainer onPress={handleAvatarPress} disabled={isUploading}>
            {isUploading ? (
              <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <ActivityIndicator size="small" color="white" />
              </View>
            ) : user.avatarUrl ? (
              <AvatarImage source={{ uri: user.avatarUrl }} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <AvatarPlaceholder>
                <Text style={{ fontSize: 40, color: 'white' }}>👤</Text>
              </AvatarPlaceholder>
            )}
          </AvatarContainer>
          <UserNameContainer>
            <UserName>{user.nickname || user.email}</UserName>
            <EditNicknameButton onPress={() => editNicknameBottomSheetRef.current?.present(user.nickname || '')}>
              <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
            </EditNicknameButton>
          </UserNameContainer>
          {user.nickname && <UserEmail>{user.email}</UserEmail>}
          {user.id && <UserId>{t('profile.userId')}: {user.id}</UserId>}
        </ProfileSection>

        <InfoSection>
          {user.nickname && (
            <InfoRow>
              <InfoLabel>{t('profile.nickname')}</InfoLabel>
              <InfoValue>{user.nickname}</InfoValue>
            </InfoRow>
          )}
          <InfoRow>
            <InfoLabel>{t('profile.email')}</InfoLabel>
            <InfoValue>{user.email}</InfoValue>
          </InfoRow>
          {user.createdAt && (
            <InfoRow>
              <InfoLabel>{t('profile.memberSince')}</InfoLabel>
              <InfoValue>{formatDate(user.createdAt, getLocale(), t)}</InfoValue>
            </InfoRow>
          )}
          {user.updatedAt && (
            <InfoRow>
              <InfoLabel>{t('profile.lastUpdated')}</InfoLabel>
              <InfoValue>{formatDate(user.updatedAt, getLocale(), t)}</InfoValue>
            </InfoRow>
          )}
        </InfoSection>

        <InfoSection>
          <SectionTitle>{t('profile.sync.title')}</SectionTitle>
          <InfoRow>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <InfoLabel>{t('profile.sync.enableSync')}</InfoLabel>
              <SyncStatusText>
                {localSyncEnabled ? t('profile.sync.status.enabled') : t('profile.sync.status.disabled')}
              </SyncStatusText>
              {lastSyncTime && localSyncEnabled && (
                <SyncStatusText>
                  {t('profile.sync.lastSync')} {new Date(lastSyncTime).toLocaleString()}
                </SyncStatusText>
              )}
              {isForcedSync && (
                <SyncStatusText style={{ color: theme.colors.primary, marginTop: 4 }}>
                  {t('profile.sync.forcedWarning')}
                </SyncStatusText>
              )}
              {syncError && (
                <ErrorText>{t('profile.sync.error')} {syncError}</ErrorText>
              )}
            </View>
            <Toggle
              value={localSyncEnabled}
              onValueChange={handleSyncToggle}
              disabled={syncLoading || isForcedSync}
            />
          </InfoRow>
          {localSyncEnabled && (
            <View style={{ marginTop: 8 }}>
              <SyncButton
                onPress={handleManualSync}
                disabled={syncLoading}
              >
                {syncLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.surface} />
                ) : (
                  <SyncButtonText>{t('profile.sync.syncNow')}</SyncButtonText>
                )}
              </SyncButton>
            </View>
          )}
        </InfoSection>

        <LogoutButton onPress={handleLogout} />
      </Content>
      <LoginBottomSheet
        bottomSheetRef={loginBottomSheetRef}
        onSignupPress={handleSignupPress}
        onLoginSuccess={handleLoginSuccess}
      />
      <SignupBottomSheet
        bottomSheetRef={signupBottomSheetRef}
        onLoginPress={handleLoginPress}
        onSignupSuccess={handleSignupSuccess}
      />
      <EditNicknameBottomSheet
        ref={editNicknameBottomSheetRef}
        bottomSheetRef={editNicknameBottomSheetModalRef}
        onNicknameUpdated={async () => {
          // Refresh user data
          const apiClient = getApiClient();
          if (apiClient) {
            const updatedUser = await apiClient.getCurrentUser();
            await updateUser(updatedUser);
          }
        }}
      />
    </Container>
  );
};

