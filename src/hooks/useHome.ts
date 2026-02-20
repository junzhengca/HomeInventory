import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { homeService } from '../services/HomeService';
import { Home, HomeLoadingState } from '../types/home';
import { setActiveHomeId } from '../store/slices/authSlice';
import { RootState } from '../store';
import { ApiClient } from '../services/ApiClient';

export const useHome = () => {
    const dispatch = useDispatch();
    const [homes, setHomes] = useState<Home[]>([]);
    const [loadingState, setLoadingState] = useState<HomeLoadingState>(homeService.getLoadingState());

    // Use Redux as the source of truth for the active home ID
    const activeHomeId = useSelector((state: RootState) => state.auth.activeHomeId);
    const [currentHome, setCurrentHome] = useState<Home | undefined>(undefined);

    // Subscribe to HomeService changes
    useEffect(() => {
        const unsubscribe = homeService.subscribe(() => {
            setHomes(homeService.getHomes());
            setLoadingState(homeService.getLoadingState());
        });

        // Initial load
        setHomes(homeService.getHomes());

        return () => {
            unsubscribe();
        };
    }, []);

    // Update currentHome when activeHomeId or homes change
    useEffect(() => {
        if (activeHomeId && homes.length > 0) {
            setCurrentHome(homes.find((h) => h.id === activeHomeId));
        } else {
            setCurrentHome(undefined);
        }
    }, [activeHomeId, homes]);

    // Auto-correct stale activeHomeId: if the active home no longer exists
    // in the available homes list (e.g. removed by sync), switch to the first available
    useEffect(() => {
        if (activeHomeId && homes.length > 0 && !homes.find(h => h.id === activeHomeId)) {
            dispatch(setActiveHomeId(homes[0].id));
        }
    }, [activeHomeId, homes, dispatch]);

    // Sync loading state from service
    useEffect(() => {
        const unsubscribe = homeService.subscribe(() => {
            setLoadingState(homeService.getLoadingState());
        });
        setLoadingState(homeService.getLoadingState());
        return unsubscribe;
    }, []);

    const handleSwitchHome = useCallback((homeId: string) => {
        // Just dispatch the action, the saga will handle persistence and service sync
        dispatch(setActiveHomeId(homeId));
        homeService.switchHome(homeId);
    }, [dispatch]);

    const handleFetchHomes = useCallback(async (apiClient: ApiClient) => {
        return await homeService.fetchHomes(apiClient);
    }, []);

    const handleCreateHome = useCallback(async (apiClient: ApiClient, name: string, address?: string) => {
        const newHome = await homeService.createHome(apiClient, name, address);
        if (newHome) {
            // Dispatch action to update Redux and persist
            dispatch(setActiveHomeId(newHome.id));
            return newHome;
        }
        return null;
    }, [dispatch]);

    const handleUpdateHome = useCallback(async (apiClient: ApiClient, id: string, updates: { name?: string; address?: string }) => {
        return await homeService.updateHome(apiClient, id, updates);
    }, []);

    const handleDeleteHome = useCallback(async (apiClient: ApiClient, id: string, userId?: string) => {
        const wasActiveHome = activeHomeId === id;
        const success = await homeService.deleteHome(apiClient, id, userId);
        if (success && wasActiveHome) {
            // HomeService has already switched internally; sync Redux with the next available home
            const availableHomes = homeService.getHomes();
            if (availableHomes.length > 0) {
                dispatch(setActiveHomeId(availableHomes[0].id));
            }
        }
        return success;
    }, [activeHomeId, dispatch]);

    const handleEnsureDefaultHome = useCallback(async (apiClient: ApiClient) => {
        const home = await homeService.ensureDefaultHome(apiClient);
        if (home) {
            dispatch(setActiveHomeId(home.id));
        }
        return home;
    }, [dispatch]);

    const handleInit = useCallback(async () => {
        await homeService.init();
        // Initialize homes from service after init
        setHomes(homeService.getHomes());
        // Set initial home if not set in Redux
        if (!activeHomeId) {
            const currentHome = homeService.getCurrentHome();
            if (currentHome) {
                dispatch(setActiveHomeId(currentHome.id));
            }
        }
    }, [activeHomeId, dispatch]);

    return {
        homes,
        currentHomeId: activeHomeId,
        currentHome,
        loadingState,
        createHome: handleCreateHome,
        updateHome: handleUpdateHome,
        deleteHome: handleDeleteHome,
        switchHome: handleSwitchHome,
        fetchHomes: handleFetchHomes,
        ensureDefaultHome: handleEnsureDefaultHome,
        init: handleInit,
    };
};
