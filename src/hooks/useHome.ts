import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { homeService } from '../services/HomeService';
import { Home } from '../types/home';
import { setActiveHomeId } from '../store/slices/authSlice';
import { loadItems } from '../store/sagas/inventorySaga';
import { loadTodos } from '../store/sagas/todoSaga';
import { RootState } from '../store';

export const useHome = () => {
    const dispatch = useDispatch();
    const [homes, setHomes] = useState<Home[]>([]);

    // Use Redux as the source of truth for the active home ID
    const activeHomeId = useSelector((state: RootState) => state.auth.activeHomeId);

    const [currentHome, setCurrentHome] = useState<Home | undefined>(undefined);

    useEffect(() => {
        const homesSub = homeService.homes$.subscribe(setHomes);
        // We removed the subscription to currentHomeId$ that was dispatching setActiveHomeId
        // to avoid infinite loops and race conditions. Redux is now the master.

        return () => {
            homesSub.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (activeHomeId && homes.length > 0) {
            setCurrentHome(homes.find((h) => h.id === activeHomeId));
        } else {
            setCurrentHome(undefined);
        }
    }, [activeHomeId, homes]);

    const handleSwitchHome = (homeId: string) => {
        // Just dispatch the action, the saga will handle persistence and service sync
        dispatch(setActiveHomeId(homeId));
    };

    const handleCreateHome = async (name: string, address?: string) => {
        // Create in service
        const newHome = await homeService.createHome(name, address);
        if (newHome) {
            // Dispatch action to update Redux and persist
            dispatch(setActiveHomeId(newHome.id));
            return newHome;
        }
        return null;
    };

    const handleUpdateHome = async (id: string, updates: Partial<Home>) => {
        return await homeService.updateHome(id, updates);
    };

    const handleDeleteHome = async (id: string) => {
        return await homeService.deleteHome(id);
    };

    return {
        homes,
        currentHomeId: activeHomeId,
        currentHome,
        createHome: handleCreateHome,
        updateHome: handleUpdateHome,
        deleteHome: handleDeleteHome,
        switchHome: handleSwitchHome,
        syncHomes: homeService.syncHomes.bind(homeService),
        init: homeService.init.bind(homeService),
    };
};

