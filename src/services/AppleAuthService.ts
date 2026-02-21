import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { authLogger } from '../utils/Logger';

class AppleAuthService {
  /**
   * Check if Apple Authentication is available on this device
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }
    return AppleAuthentication.isAvailableAsync();
  }

  /**
   * Sign in with Apple
   * Returns the Apple ID token (identityToken)
   */
  async signInWithApple(): Promise<string | null> {
    try {
      // Check if Apple Authentication is available
      const available = await this.isAvailable();
      if (!available) {
        if (Platform.OS === 'ios') {
          throw new Error(
            'Apple Sign In is not available on this device. Requires iOS 13+ and a device with Apple ID.'
          );
        } else {
          throw new Error(
            'Apple Sign In is only available on iOS devices.'
          );
        }
      }

      authLogger.info('Starting Apple Sign In...');

      // Request Apple authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      authLogger.info('Apple Sign In result:', {
        user: credential.user,
        email: credential.email,
        hasIdentityToken: !!credential.identityToken,
      });

      // Extract the identity token (this is the ID token we need)
      const identityToken = credential.identityToken;

      if (!identityToken) {
        authLogger.error('Identity token not found in Apple credential');
        throw new Error(
          'Apple Sign In failed: identity token not received.'
        );
      }

      authLogger.info('Successfully received Apple identity token');
      return identityToken;
    } catch (error: unknown) {
      // Handle user cancellation
      if (
        error instanceof Error &&
        error.message.includes('ERR_REQUEST_CANCELED')
      ) {
        authLogger.info('User cancelled Apple Sign In');
        return null;
      }

      // Handle other errors
      authLogger.error('Apple Sign In error:', error);
      throw error;
    }
  }
}

export const appleAuthService = new AppleAuthService();
export type { AppleAuthService };
