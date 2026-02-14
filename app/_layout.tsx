import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Appearance, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import * as SystemUI from 'expo-system-ui';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider, BottomSheetModal } from '@gorhom/bottom-sheet';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { dataInitializationService } from '../src/services/DataInitializationService';
import { homeService } from '../src/services/HomeService';
import { ErrorBottomSheet, SetupNicknameBottomSheet, ToastProvider, InvitationBottomSheet, OfflineBadge, OfflineExplanationBottomSheet } from '../src/components';
import { AuthNavigator } from '../src/navigation/AuthNavigator';
import { ContextMenuProvider } from '../src/components/organisms/ContextMenu/ContextMenuProvider';
import { ErrorDetails } from '../src/types/api';
import i18n from '../src/i18n/i18n';
import { store } from '../src/store';
import { initializeApiClient, setGlobalErrorHandler } from '../src/store/sagas/authSaga';
import { loadSettings } from '../src/store/sagas/settingsSaga';
import { loadTodos } from '../src/store/sagas/todoSaga';
import { loadItems } from '../src/store/sagas/inventorySaga';
import { useAppDispatch, useAppSelector } from '../src/store/hooks';
import { setShowNicknameSetup, setActiveHomeId } from '../src/store/slices/authSlice';
import { logger } from '../src/utils/Logger';

const appLogger = logger.scoped('general');

// TODO: Configure your API base URL here or use environment variables
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://cluttr-server-v2-production.up.railway.app';

// Inner component to handle initialization
function AppInner() {
    const dispatch = useAppDispatch();
    const errorBottomSheetRef = useRef<BottomSheetModal | null>(null);
    const setupNicknameBottomSheetRef = useRef<BottomSheetModal | null>(null);
    const invitationBottomSheetRef = useRef<BottomSheetModal | null>(null);
    const offlineExplanationBottomSheetRef = useRef<BottomSheetModal>(null);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
    const [homeSynced, setHomeSynced] = useState(false);
    const showNicknameSetup = useAppSelector((state) => state.auth.showNicknameSetup);
    const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
    const isLoading = useAppSelector((state) => state.auth.isLoading);
    const darkMode = useAppSelector((state) => state.settings.settings?.darkMode);
    const activeHomeId = useAppSelector((state) => state.auth.activeHomeId);

    // Deep Link Handling for Invitations
    useEffect(() => {
        const handleDeepLink = (event: Linking.EventType) => {
            try {
                const url = event.url;
                const parsedUrl = Linking.parse(url);

                if (parsedUrl.queryParams?.inviteCode) {
                    const code = parsedUrl.queryParams.inviteCode as string;

                    setInviteCode(code);
                    // Small delay to ensure state updates
                    setTimeout(() => {
                        invitationBottomSheetRef.current?.present();
                    }, 100);
                }
            } catch (error) {
                appLogger.error('Error handling deep link', error);
            }
        };

        // Add listener
        const subscription = Linking.addEventListener('url', handleDeepLink);

        // Handle cold start
        Linking.getInitialURL().then((url) => {
            if (url) {
                handleDeepLink({ url } as Linking.EventType);
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

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

        // Sync HomeService's initial home selection to Redux
        // This must happen before loading data so sagas have activeHomeId
        const currentHome = homeService.getCurrentHome();
        if (currentHome && !activeHomeId) {
            dispatch(setActiveHomeId(currentHome.id));
        }
        setHomeSynced(true);
    }, [dispatch, activeHomeId]);

    // Load data after home is synced
    useEffect(() => {
        if (!homeSynced) return;

        // Load settings
        dispatch(loadSettings());

        // Load todos
        dispatch(loadTodos());

        // Load inventory items
        dispatch(loadItems());
    }, [dispatch, homeSynced]);

    // Sync system appearance to prevent flashing
    useEffect(() => {
        if (darkMode !== undefined) {
            Appearance.setColorScheme(darkMode ? 'dark' : 'light');
            SystemUI.setBackgroundColorAsync(darkMode ? '#000000' : '#ffffff');
        }
    }, [darkMode]);

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

    const handleOfflineBadgePress = useCallback(() => {
        offlineExplanationBottomSheetRef.current?.present();
    }, []);

    // Show loading screen while auth and initial data is loading
    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: darkMode ? '#000000' : '#ffffff' }}>
                <StatusBar style={darkMode ? 'light' : 'dark'} />
                <ActivityIndicator size="large" color={darkMode ? '#ffffff' : '#000000'} />
            </View>
        );
    }

    if (!isAuthenticated) {
        return (
            <>
                <AuthNavigator />
                <StatusBar style={darkMode ? 'light' : 'dark'} />
                <ErrorBottomSheet
                    bottomSheetRef={errorBottomSheetRef}
                    errorDetails={errorDetails}
                    onDismiss={handleErrorDismiss}
                />
            </>
        );
    }

    return (
        <>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="ItemDetails" />
                <Stack.Screen name="ExportData" />
                <Stack.Screen name="ExportDataDetail" />
                <Stack.Screen name="Profile" />
            </Stack>
            <OfflineBadge onPress={handleOfflineBadgePress} />
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
            <InvitationBottomSheet
                bottomSheetRef={invitationBottomSheetRef}
                inviteCode={inviteCode}
                onDismiss={() => setInviteCode(null)}
            />
            <OfflineExplanationBottomSheet
                bottomSheetRef={offlineExplanationBottomSheetRef}
            />
        </>
    );
}

export default function RootLayout() {
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                await dataInitializationService.initializeDataFiles();
                await homeService.init();
                setIsInitialized(true);
            } catch (error) {
                appLogger.error('Failed to initialize data files', error);
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
                                        <AppInner />
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
