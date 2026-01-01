import * as SecureStore from 'expo-secure-store';
import { readFile, writeFile, deleteFile } from './FileSystemService';
import { User } from '../types/api';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_FILE = 'user.json';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Get stored authentication tokens
 */
export const getAuthTokens = async (): Promise<AuthTokens | null> => {
  try {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

    if (!accessToken || !refreshToken) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error('Error getting auth tokens:', error);
    return null;
  }
};

/**
 * Save authentication tokens
 */
export const saveAuthTokens = async (
  accessToken: string,
  refreshToken: string
): Promise<boolean> => {
  try {
    // Validate that tokens are strings and not empty
    if (!accessToken || typeof accessToken !== 'string') {
      console.error('Error saving auth tokens: accessToken is invalid', {
        type: typeof accessToken,
        value: accessToken,
      });
      return false;
    }

    if (!refreshToken || typeof refreshToken !== 'string') {
      console.error('Error saving auth tokens: refreshToken is invalid', {
        type: typeof refreshToken,
        value: refreshToken,
      });
      return false;
    }

    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    return true;
  } catch (error) {
    console.error('Error saving auth tokens:', error);
    return false;
  }
};

/**
 * Clear stored authentication tokens
 */
export const clearAuthTokens = async (): Promise<boolean> => {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
    return false;
  }
};

/**
 * Get stored user data
 */
export const getUser = async (): Promise<User | null> => {
  return readFile<User>(USER_FILE);
};

/**
 * Save user data
 */
export const saveUser = async (user: User): Promise<boolean> => {
  return writeFile(USER_FILE, user);
};

/**
 * Clear stored user data
 */
export const clearUser = async (): Promise<boolean> => {
  return deleteFile(USER_FILE);
};

/**
 * Clear all authentication data (tokens and user)
 */
export const clearAllAuthData = async (): Promise<void> => {
  await Promise.all([clearAuthTokens(), clearUser()]);
};

