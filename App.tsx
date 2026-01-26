import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import { ErrorBottomSheet, SetupNicknameBottomSheet, ToastProvider } from './src/components';
import { ContextMenuProvider } from './src/components/organisms/ContextMenu/ContextMenuProvider';
import { ErrorDetails } from './src/types/api';
import i18n from './src/i18n/i18n';
import { store } from './src/store';
import { initializeApiClient, setGlobalErrorHandler } from './src/store/sagas/authSaga';
import { loadSettings } from './src/store/sagas/settingsSaga';
import { loadTodos } from './src/store/sagas/todoSaga';
import { loadItems } from './src/store/sagas/inventorySaga';
import { useAppDispatch, useAppSelector } from './src/store/hooks';
import { setShowNicknameSetup } from './src/store/slices/authSlice';

// TODO: Configure your API base URL here or use environment variables
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://homeinventoryserver-production.up.railway.app';

// Inner component to handle initialization
function AppInner() {
  const dispatch = useAppDispatch();
  const errorBottomSheetRef = useRef<BottomSheetModal | null>(null);
  const setupNicknameBottomSheetRef = useRef<BottomSheetModal | null>(null);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  const showNicknameSetup = useAppSelector((state) => state.auth.showNicknameSetup);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const darkMode = useAppSelector((state) => state.settings.settings?.darkMode);

  // Set up global error handler
  useEffect(() => {
    const handleError = (details: ErrorDetails) => {
      setErrorDetails(details);
      errorBottomSheetRef.current?.present();
    };

    setGlobalErrorHandler(handleError);

    return () => {
      setGlobalErrorHandler(() => { });
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

  // Show setup nickname bottom sheet when needed
  useEffect(() => {
    if (showNicknameSetup && isAuthenticated) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        setupNicknameBottomSheetRef.current?.present();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showNicknameSetup, isAuthenticated]);

  const handleNicknameSet = useCallback(async () => {
    dispatch(setShowNicknameSetup(false));
  }, [dispatch]);

  return (
    <>
      <RootStack />
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <ErrorBottomSheet
        bottomSheetRef={errorBottomSheetRef}
        errorDetails={errorDetails}
        onDismiss={handleErrorDismiss}
      />
      <SetupNicknameBottomSheet
        bottomSheetRef={setupNicknameBottomSheetRef}
        onNicknameSet={handleNicknameSet}
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
              <ToastProvider>
                <ContextMenuProvider>
                  <BottomSheetModalProvider>
                    <NavigationContainer>
                      <AppInner />
                    </NavigationContainer>
                  </BottomSheetModalProvider>
                </ContextMenuProvider>
              </ToastProvider>
            </ThemeProvider>
          </I18nextProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
