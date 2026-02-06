import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { authLogger } from '../utils/Logger';

// Complete the auth session for web browsers
WebBrowser.maybeCompleteAuthSession();

/**
 * Get the appropriate Google OAuth client ID based on the platform
 */
const getGoogleClientId = (): string => {
  if (Platform.OS === 'ios') {
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    if (!iosClientId) {
      throw new Error(
        'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is not configured. Please set it in your environment variables.'
      );
    }
    return iosClientId;
  } else if (Platform.OS === 'android') {
    const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
    if (!androidClientId) {
      throw new Error(
        'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID is not configured. Please set it in your environment variables.'
      );
    }
    return androidClientId;
  } else {
    throw new Error(
      `Google OAuth is not supported on platform: ${Platform.OS}. Only iOS and Android are supported.`
    );
  }
};

/**
 * Get the redirect URI using custom scheme (not proxy)
 * The redirect URI format is: <scheme>:// (e.g., com.cluttrapp.cluttr://)
 */
const getRedirectUri = (): string => {
  // Use custom scheme (not proxy) - this works with iOS/Android client IDs
  const redirectUri = AuthSession.makeRedirectUri({});

  authLogger.info('Redirect URI (custom scheme):', redirectUri);

  if (!redirectUri || !redirectUri.includes('://')) {
    throw new Error(
      `Failed to generate redirect URI. Make sure 'scheme' is configured in app.json. Got: ${redirectUri}`
    );
  }

  return redirectUri;
};

/**
 * Sign in with Google OAuth using iOS/Android client IDs
 * Returns the Google ID token
 */
export const signInWithGoogle = async (): Promise<string | null> => {
  try {
    // Get platform-specific client ID
    const clientId = getGoogleClientId();
    const platform = Platform.OS;

    authLogger.info(
      `Using ${platform} client ID:`,
      clientId.substring(0, 20) + '...'
    );

    // Get redirect URI using custom scheme
    const redirectUri = getRedirectUri();

    authLogger.info('Redirect URI:', redirectUri);
    authLogger.info('Platform:', platform);

    // Create the auth request using Authorization Code flow with PKCE
    // iOS/Android client IDs require code flow, not implicit flow (IdToken)
    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code, // Use code flow for native clients
      redirectUri,
      usePKCE: true, // Enable PKCE for code flow (required for native clients)
    });

    // Prompt for authentication
    authLogger.info(
      'Starting OAuth flow with Authorization Code + PKCE...'
    );

    // Manually specify auth and token endpoints for Google
    const result = await request.promptAsync({
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    authLogger.info('OAuth result type:', result.type);
    authLogger.info('OAuth result:', JSON.stringify(result, null, 2));

    if (result.type === 'success') {
      // With code flow, we get an authorization code that needs to be exchanged for tokens
      const code = result.params.code;

      if (!code) {
        authLogger.error(
          'Authorization code not found in response params:',
          result.params
        );
        throw new Error(
          'Authorization code not found in OAuth response. Check that the redirect URI matches exactly in Google Cloud Console.'
        );
      }

      authLogger.info(
        'Received authorization code, exchanging for ID token...'
      );

      // Exchange the authorization code for tokens
      // Get the code verifier from the request (PKCE)
      const codeVerifier = request.codeVerifier;

      if (!codeVerifier) {
        throw new Error(
          'Code verifier not found. PKCE may not be properly configured.'
        );
      }

      // Manually exchange the authorization code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          code: code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code_verifier: codeVerifier,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        authLogger.error('Token exchange failed:', errorText);
        throw new Error(
          `Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`
        );
      }

      const tokenData = await tokenResponse.json();
      authLogger.info(
        'Token exchange result:',
        JSON.stringify({ ...tokenData, id_token: '***' }, null, 2)
      );

      // Extract the ID token from the token response
      const idToken = tokenData.id_token;

      if (idToken) {
        authLogger.info('Successfully received ID token');
        return idToken;
      } else {
        authLogger.error(
          'ID token not found in token response:',
          tokenData
        );
        throw new Error(
          'ID token not found after token exchange. The OAuth flow may have failed.'
        );
      }
    } else if (result.type === 'error') {
      const errorMessage = result.error?.message || 'Unknown error';
      const errorCode = result.error?.code;
      authLogger.error('OAuth error:', {
        errorMessage,
        errorCode,
        error: result.error,
      });
      throw new Error(
        `OAuth error: ${errorMessage}${errorCode ? ` (code: ${errorCode})` : ''}`
      );
    } else {
      // User cancelled or dismissed
      authLogger.info('User cancelled or dismissed OAuth flow');
      return null;
    }
  } catch (error) {
    authLogger.error('Error:', error);
    throw error;
  }
};
