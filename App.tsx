import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { RootStack } from './src/navigation/RootStack';
import { initializeDataFiles } from './src/services/DataInitializationService';
import i18n from './src/i18n/i18n';
import { store } from './src/store';
import { initializeApiClient } from './src/store/sagas/authSaga';
import { loadSettings } from './src/store/sagas/settingsSaga';
import { loadTodos } from './src/store/sagas/todoSaga';
import { loadItems } from './src/store/sagas/inventorySaga';
import { useAppDispatch } from './src/store/hooks';

// TODO: Configure your API base URL here or use environment variables
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-api-url.com';

// Inner component to handle initialization
function AppInner() {
  const dispatch = useAppDispatch();

  // Initialize Redux sagas on mount
  useEffect(() => {
    // Initialize API client and auth
    dispatch(initializeApiClient(API_BASE_URL));

    // Load settings
    dispatch(loadSettings());

    // Load todos
    dispatch(loadTodos());

    // Load inventory items
    dispatch(loadItems());
  }, [dispatch]);

  return (
    <>
      <RootStack />
      <StatusBar style="auto" />
    </>
  );
}

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
        <Provider store={store}>
          <I18nextProvider i18n={i18n}>
            <ThemeProvider>
              <BottomSheetModalProvider>
                <NavigationContainer>
                  <AppInner />
                </NavigationContainer>
              </BottomSheetModalProvider>
            </ThemeProvider>
          </I18nextProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
