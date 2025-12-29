import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { RootStack } from './src/navigation/RootStack';
import { initializeDataFiles } from './src/services/DataInitializationService';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDataFiles();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize data files:', error);
        // Still set initialized to true to allow app to continue
        setIsInitialized(true);
      }
    };

    init();
  }, []);

  if (!isInitialized) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemeProvider>
          <NavigationContainer>
            <RootStack />
            <StatusBar style="auto" />
          </NavigationContainer>
        </ThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

