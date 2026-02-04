import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { homeService } from '../services/HomeService';
import { Home } from '../types/home';
import { setActiveHomeId } from '../store/slices/authSlice';
import { loadItems } from '../store/sagas/inventorySaga';
import { loadTodos } from '../store/sagas/todoSaga';

export const useHome = () => {
    const dispatch = useDispatch();
    const [homes, setHomes] = useState<Home[]>([]);
    const [currentHomeId, setCurrentHomeId] = useState<string | null>(null);
    const [currentHome, setCurrentHome] = useState<Home | undefined>(undefined);

    useEffect(() => {
        const homesSub = homeService.homes$.subscribe(setHomes);
        const idSub = homeService.currentHomeId$.subscribe((id) => {
            setCurrentHomeId(id);
            if (id) {
                // When home changes, update Redux state and reload data
                dispatch(setActiveHomeId(id));
                dispatch(loadItems());
                dispatch(loadTodos());
            }
        });

        return () => {
            homesSub.unsubscribe();
            idSub.unsubscribe();
        };
    }, [dispatch]);

    useEffect(() => {
        if (currentHomeId && homes.length > 0) {
            setCurrentHome(homes.find((h) => h.id === currentHomeId));
        } else {
            setCurrentHome(undefined);
        }
    }, [currentHomeId, homes]);

    return {
        homes,
        currentHomeId,
        currentHome,
        createHome: homeService.createHome.bind(homeService),
        switchHome: homeService.switchHome.bind(homeService),
        init: homeService.init.bind(homeService),
    };
};

