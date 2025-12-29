import React from 'react';
import { ScrollView, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PageHeader } from '../components/PageHeader';
import { AccountDetailsSection } from '../components/AccountDetailsSection';
import { ThemeChooser } from '../components/ThemeChooser';
import { CurrencySelector } from '../components/CurrencySelector';
import { LanguageSelector } from '../components/LanguageSelector';
import { ExportDataButton } from '../components/ExportDataButton';
import { LogoutButton } from '../components/LogoutButton';
import { useSettings } from '../contexts/SettingsContext';

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Content = styled(ScrollView)`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.lg}px;
`;

const SettingsSection = styled.View`
  margin-bottom: ${({ theme }) => theme.spacing.xl}px;
`;

const SectionTitle = styled.Text`
  font-size: ${({ theme }) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const VersionText = styled.Text`
  font-size: ${({ theme }) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.regular};
  color: ${({ theme }) => theme.colors.textLight};
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing.lg}px;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

export const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, isLoading } = useSettings();
  const insets = useSafeAreaInsets();

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

  // Calculate bottom padding: nav bar height (60) + margin (16*2) + safe area + extra spacing
  const bottomPadding = 60 + 32 + insets.bottom + 24;

  if (isLoading || !settings) {
    return (
      <Container>
        <PageHeader
          icon="settings"
          title="Settings"
          subtitle="Make your home more comfortable"
          showBackButton={true}
          showRightButtons={false}
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
        title="Settings"
        subtitle="Make your home more comfortable"
        showBackButton={true}
        showRightButtons={false}
      />
      <Content 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        {/* Account Details Section */}
        <AccountDetailsSection />

        {/* Preferences Section */}
        <SettingsSection>
          <SectionTitle>Preferences</SectionTitle>
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
          <SectionTitle>Data & Security</SectionTitle>
          <ExportDataButton />
          <LogoutButton />
        </SettingsSection>

        {/* Version Info */}
        <VersionText>Current version v2.2.0</VersionText>
      </Content>
    </Container>
  );
};

