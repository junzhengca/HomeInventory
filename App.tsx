import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider, BottomSheetModal } from '@gorhom/bottom-sheet';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { RootStack } from './src/navigation/RootStack';
import { initializeDataFiles } from './src/services/DataInitializationService';
import { ErrorBottomSheet } from './src/components/ErrorBottomSheet';
import { ErrorDetails } from './src/types/api';
import i18n from './src/i18n/i18n';
import { store } from './src/store';
import { initializeApiClient, setGlobalErrorHandler } from './src/store/sagas/authSaga';
import { loadSettings } from './src/store/sagas/settingsSaga';
import { loadTodos } from './src/store/sagas/todoSaga';
import { loadItems } from './src/store/sagas/inventorySaga';
import { useAppDispatch } from './src/store/hooks';

// TODO: Configure your API base URL here or use environment variables
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-api-url.com';

// Inner component to handle initialization
function AppInner() {
  const dispatch = useAppDispatch();
  const errorBottomSheetRef = useRef<BottomSheetModal>(null);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);

  // Set up global error handler
  useEffect(() => {
    const handleError = (details: ErrorDetails) => {
      setErrorDetails(details);
      errorBottomSheetRef.current?.present();
    };
    
    setGlobalErrorHandler(handleError);

    return () => {
      setGlobalErrorHandler(() => {});
    };
  }, []);

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

  const handleErrorDismiss = () => {
    setErrorDetails(null);
  };

  return (
    <>
      <RootStack />
      <StatusBar style="auto" />
      <ErrorBottomSheet
        bottomSheetRef={errorBottomSheetRef}
        errorDetails={errorDetails}
        onDismiss={handleErrorDismiss}
      />
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
