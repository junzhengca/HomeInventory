import * as SecureStore from 'expo-secure-store';
import { fileSystemService } from './FileSystemService';
import { User } from '../types/api';
import { authLogger } from '../utils/Logger';

const ACCESS_TOKEN_KEY = 'access_token';
const USER_FILE = 'user.json';

interface AuthTokens {
  accessToken: string;
}

class AuthService {
  public constructor() {}

  /**
   * Get stored authentication tokens
   */
  async getAuthTokens(): Promise<AuthTokens | null> {
    try {
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

      if (!accessToken) {
        return null;
      }

      // Trim whitespace from token to prevent auth errors
      const trimmedToken = accessToken.trim();
      if (!trimmedToken) {
        authLogger.warn('Access token is empty after trimming');
        return null;
      }

      return {
        accessToken: trimmedToken,
      };
    } catch (error) {
      authLogger.error('Error getting auth tokens:', error);
      return null;
    }
  }

  /**
   * Save authentication tokens
   */
  async saveAuthTokens(accessToken: string): Promise<boolean> {
    try {
      // Validate that token is a string and not empty
      if (!accessToken || typeof accessToken !== 'string') {
        authLogger.error('Error saving auth tokens: accessToken is invalid', {
          type: typeof accessToken,
          value: accessToken,
        });
        return false;
      }

      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      return true;
    } catch (error) {
      authLogger.error('Error saving auth tokens:', error);
      return false;
    }
  }

  /**
   * Clear stored authentication tokens
   */
  async clearAuthTokens(): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      return true;
    } catch (error) {
      authLogger.error('Error clearing auth tokens:', error);
      return false;
    }
  }

  /**
   * Get stored user data
   */
  async getUser(): Promise<User | null> {
    return fileSystemService.readFile<User>(USER_FILE);
  }

  /**
   * Save user data
   */
  async saveUser(user: User): Promise<boolean> {
    return fileSystemService.writeFile(USER_FILE, user);
  }

  /**
   * Clear stored user data
   */
  async clearUser(): Promise<boolean> {
    return fileSystemService.deleteFile(USER_FILE);
  }

  /**
   * Get stored active home ID
   */
  async getActiveHomeId(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACTIVE_HOME_ID_KEY);
    } catch (error) {
      authLogger.error('Error getting active home ID:', error);
      return null;
    }
  }

  /**
   * Save active home ID
   */
  async saveActiveHomeId(homeId: string): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(ACTIVE_HOME_ID_KEY, homeId);
      return true;
    } catch (error) {
      authLogger.error('Error saving active home ID:', error);
      return false;
    }
  }

  /**
   * Remove active home ID
   */
  async removeActiveHomeId(): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(ACTIVE_HOME_ID_KEY);
      return true;
    } catch (error) {
      authLogger.error('Error removing active home ID:', error);
      return false;
    }
  }

  /**
   * Clear all authentication data (tokens and user)
   */
  async clearAllAuthData(): Promise<void> {
    await Promise.all([
      this.clearAuthTokens(),
      this.clearUser(),
      this.removeActiveHomeId(),
    ]);
  }

  /**
   * Clear all user data on logout (items, todos, categories, homes, etc.)
   * Preserves settings only.
   */
  async clearAllUserData(): Promise<void> {
    try {
      // Get all JSON files
      const files = await fileSystemService.listJsonFiles();

      // Files to preserve (settings-related)
      const filesToPreserve = ['settings.json'];

      // Delete all files except settings
      for (const file of files) {
        if (!filesToPreserve.includes(file)) {
          await fileSystemService.deleteFile(file);
          authLogger.info(`Deleted user data file: ${file}`);
        }
      }

      // Clear SecureStore active home ID
      await this.removeActiveHomeId();

      authLogger.info('All user data cleared (settings preserved)');
    } catch (error) {
      authLogger.error('Error clearing user data:', error);
    }
  }
}

const ACTIVE_HOME_ID_KEY = 'active_home_id';

export const authService = new AuthService();
export type { AuthService };
