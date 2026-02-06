import * as SecureStore from 'expo-secure-store';
import { generateId } from './idGenerator';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { storageLogger } from './Logger';

const DEVICE_ID_KEY = 'device_id';

/**
 * Get persistence device ID or generate a new one
 */
export const getDeviceId = async (): Promise<string> => {
    try {
        // 1. Try to get specific platform ID if available and stable (optional, but good for re-installs on same device if supported)
        // For simplicity and consistency across installs (if keychain persists), we try SecureStore first.
        let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);

        if (!deviceId) {
            // 2. Generate new ID
            deviceId = generateId('device');

            // 3. Save it
            await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
        }

        return deviceId;
    } catch (error) {
        storageLogger.error('Error getting device ID', error);
        // Fallback if SecureStore fails (e.g. dev client issues)
        return 'fallback-device-' + Date.now();
    }
};
