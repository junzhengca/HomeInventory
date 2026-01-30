import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

interface NetworkState {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
}

export const useNetwork = (): NetworkState => {
    const [networkState, setNetworkState] = useState<NetworkState>({
        isConnected: true,
        isInternetReachable: true,
    });

    useEffect(() => {
        let isMounted = true;

        // specific initial check
        Network.getNetworkStateAsync().then((state) => {
            if (isMounted) {
                setNetworkState({
                    isConnected: state.isConnected ?? true,
                    isInternetReachable: state.isInternetReachable ?? true,
                });
            }
        });

        // Subscribe to network state changes
        // explicit type generic to help with inference if needed, though usually inferred
        const subscription = Network.addNetworkStateListener((state) => {
            if (isMounted) {
                setNetworkState({
                    isConnected: state.isConnected ?? true,
                    isInternetReachable: state.isInternetReachable ?? true,
                });
            }
        });

        return () => {
            isMounted = false;
            // subscription.remove() might be deprecated in some versions or listener returns { remove: () => ... }
            // Looking at expo docs, it returns an object with remove method.
            if (subscription && typeof subscription.remove === 'function') {
                subscription.remove();
            }
        };
    }, []);

    return networkState;
};
