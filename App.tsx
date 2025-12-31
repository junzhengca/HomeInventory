import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { I18nextProvider } from 'react-i18next';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { InventoryProvider } from './src/contexts/InventoryContext';
import { CategoryProvider } from './src/contexts/CategoryContext';
import { TodoProvider } from './src/contexts/TodoContext';
import { SelectedCategoryProvider } from './src/contexts/SelectedCategoryContext';
import { RootStack } from './src/navigation/RootStack';
import { initializeDataFiles } from './src/services/DataInitializationService';
import i18n from './src/i18n/i18n';

// TODO: Configure your API base URL here or use environment variables
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-api-url.com';

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <SettingsProvider>
            <AuthProvider apiBaseUrl={API_BASE_URL}>
              <InventoryProvider>
                <CategoryProvider>
                  <TodoProvider>
                    <SelectedCategoryProvider>
                      <ThemeProvider>
                        <BottomSheetModalProvider>
                          <NavigationContainer>
                            <RootStack />
                            <StatusBar style="auto" />
                          </NavigationContainer>
                        </BottomSheetModalProvider>
                      </ThemeProvider>
                    </SelectedCategoryProvider>
                  </TodoProvider>
                </CategoryProvider>
              </InventoryProvider>
            </AuthProvider>
          </SettingsProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

