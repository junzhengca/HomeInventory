import React from 'react';
import { ScrollView, ActivityIndicator, View, Text } from 'react-native';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import type { StyledProps } from '../utils/styledComponents';

import {
  PageHeader,
  ThemeChooser,
  CurrencySelector,
  LanguageSelector,
  ExportDataButton,
  ClearDataButton,
  SettingsToggleItem,
} from '../components';
import { useSettings, useAuth, useAppSelector } from '../store/hooks';
import { calculateBottomPadding } from '../utils/layout';
import { RootStackParamList } from '../navigation/types';

const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const Content = styled(ScrollView)`
  flex: 1;
  padding: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const SettingsSection = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const SectionTitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, isLoading } = useSettings();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const activeHomeId = useAppSelector((state) => state.auth.activeHomeId);
  const accounts = useAppSelector((state) => state.auth.accessibleAccounts);

  const currentHomeOwner = accounts.find((a) => a.userId === activeHomeId);

  const handleAvatarPress = () => {
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('Profile');
    }
  };

  const handleThemeChange = async (themeId: string) => {
    const success = await updateSettings({ theme: themeId });
    if (!success) {
      console.error('Failed to update theme setting');
    }
  };

  const handleCurrencyChange = async (currencyId: string) => {
    const success = await updateSettings({ currency: currencyId });
    if (!success) {
      console.error('Failed to update currency setting');
    }
  };

  const handleLanguageChange = async (languageId: string) => {
    const success = await updateSettings({ language: languageId });
    if (!success) {
      console.error('Failed to update language setting');
    }
  };

  const handleDarkModeChange = async (value: boolean) => {
    const success = await updateSettings({ darkMode: value });
    if (!success) {
      console.error('Failed to update dark mode setting');
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
          icon="settings"
          title={t('settings.title')}
          subtitle={t('settings.subtitle')}
          showBackButton={false}
          showRightButtons={true}
          avatarUrl={user?.avatarUrl}
          ownerAvatarUrl={currentHomeOwner?.avatarUrl}
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
        icon="settings"
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        showBackButton={false}
        showRightButtons={true}
        avatarUrl={user?.avatarUrl}
        ownerAvatarUrl={currentHomeOwner?.avatarUrl}
        onAvatarPress={handleAvatarPress}
      />
      <Content
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        {/* Preferences Section */}
        <SettingsSection>
          <SectionTitle>{t('settings.preferences')}</SectionTitle>
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
        </SettingsSection>

        {/* Data & Security Section */}
        <SettingsSection>
          <SectionTitle>{t('settings.dataAndSecurity')}</SectionTitle>
          <ExportDataButton />
          <ClearDataButton />
        </SettingsSection>

        {/* Experimental Section */}
        <SettingsSection>
          <SectionTitle>{t('settings.experimental')}</SectionTitle>
          <SettingsToggleItem
            label={t('settings.darkMode')}
            description={t('settings.darkModeDescription')}
            value={settings.darkMode ?? false}
            onValueChange={handleDarkModeChange}
          />
        </SettingsSection>

        {/* Version Info */}
        <VersionText>
          {t('settings.versionPrefix')} v{appVersion}
        </VersionText>
      </Content>
    </Container>
  );
};

