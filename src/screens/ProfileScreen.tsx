import React, { useCallback, useState } from 'react';
import { ScrollView, ActivityIndicator, View, Text, Alert, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import i18n from '../i18n/i18n';
import type { StyledProps } from '../utils/styledComponents';
import { PageHeader } from '../components/PageHeader';
import { LogoutButton } from '../components/LogoutButton';
import { useAuth } from '../contexts/AuthContext';
import { calculateBottomPadding } from '../utils/layout';
import { formatDate } from '../utils/formatters';
import { ApiClient } from '../services/ApiClient';
import { getAuthTokens } from '../services/AuthService';

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
  border-width: 3px;
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

const UserEmail = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const UserId = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

const InfoSection = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
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

const LoadingContainer = styled(View)`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

export const ProfileScreen: React.FC = () => {
  const { user, isLoading, logout, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);

  const getLocale = useCallback(() => {
    return i18n.language === 'zh' || i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US';
  }, []);

  const getApiClient = useCallback(async (): Promise<ApiClient | null> => {
    const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-api-url.com';
    const apiClient = new ApiClient(API_BASE_URL);
    const tokens = await getAuthTokens();
    if (tokens) {
      apiClient.setAuthToken(tokens.accessToken);
      apiClient.setRefreshToken(tokens.refreshToken);
      return apiClient;
    }
    return null;
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
      const apiClient = await getApiClient();
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

  // Calculate bottom padding for scrollable content
  const bottomPadding = calculateBottomPadding(insets.bottom);

  if (isLoading) {
    return (
      <Container>
        <PageHeader
          icon="person"
          title={t('profile.title')}
          subtitle={t('profile.subtitle')}
          showBackButton={true}
          showRightButtons={false}
        />
        <LoadingContainer>
          <ActivityIndicator size="large" />
        </LoadingContainer>
      </Container>
    );
  }

  if (!user) {
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
          <Text>{t('profile.noUserData')}</Text>
        </Content>
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
          <UserEmail>{user.email}</UserEmail>
          {user.id && <UserId>{t('profile.userId')}: {user.id}</UserId>}
        </ProfileSection>

        <InfoSection>
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

        <LogoutButton onPress={handleLogout} />
      </Content>
    </Container>
  );
};

