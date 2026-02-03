import { useState, useEffect } from 'react';
import { homeService } from '../services/HomeService';
import { Home } from '../types/home';

export const useHome = () => {
    const [homes, setHomes] = useState<Home[]>([]);
    const [currentHomeId, setCurrentHomeId] = useState<string | null>(null);
    const [currentHome, setCurrentHome] = useState<Home | undefined>(undefined);

    useEffect(() => {
        const homesSub = homeService.homes$.subscribe(setHomes);
        const idSub = homeService.currentHomeId$.subscribe(setCurrentHomeId);

        return () => {
            homesSub.unsubscribe();
            idSub.unsubscribe();
        };
    }, []);

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
