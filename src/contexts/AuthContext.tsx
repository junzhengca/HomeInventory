import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { ApiClient } from '../services/ApiClient';
import {
  getAuthTokens,
  saveAuthTokens,
  clearAllAuthData,
  getUser,
  saveUser,
} from '../services/AuthService';
import { User } from '../types/api';
import { isTokenExpired } from '../utils/jwtUtils';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (userData: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  apiBaseUrl: string;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, apiBaseUrl }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const apiClientRef = useRef<ApiClient | null>(null);
  const isCheckingAuthRef = useRef(false);

  const handleAuthError = useCallback(async () => {
    console.log('[Auth] Clearing auth data due to error');
    await clearAllAuthData();
    setUser(null);
    setIsAuthenticated(false);
    if (apiClientRef.current) {
      apiClientRef.current.setAuthToken(null);
      apiClientRef.current.setRefreshToken(null);
    }
  }, []);

  // Initialize API client
  useEffect(() => {
    if (!apiClientRef.current) {
      console.log('[Auth] Initializing API client...');
      apiClientRef.current = new ApiClient(apiBaseUrl);

      // Set up token refresh callback
      apiClientRef.current.setOnTokenRefresh((tokens) => {
        console.log('[Auth] Token refreshed via callback');
        saveAuthTokens(tokens.accessToken, tokens.refreshToken);
      });

      // Set up auth error callback
      apiClientRef.current.setOnAuthError(() => {
        console.log('[Auth] Auth error callback triggered');
        handleAuthError();
      });
    }
  }, [apiBaseUrl, handleAuthError]);

  const checkAuth = useCallback(async () => {
    // Prevent concurrent auth checks
    if (isCheckingAuthRef.current) {
      return;
    }

    isCheckingAuthRef.current = true;

    try {
      if (!apiClientRef.current) {
        setIsLoading(false);
        return;
      }

      const tokens = await getAuthTokens();

      if (!tokens || !tokens.refreshToken) {
        setIsLoading(false);
        return;
      }

      // Check if refresh token is expired
      if (isTokenExpired(tokens.refreshToken, true)) {
        // Refresh token is expired, clear all auth data
        console.log('[Auth] Refresh token expired, clearing auth data');
        await handleAuthError();
        setIsLoading(false);
        return;
      }

      // Refresh token is valid, check if access token needs refresh
      if (!tokens.accessToken || isTokenExpired(tokens.accessToken, false)) {
        // Access token is expired or missing, refresh it
        try {
          console.log('[Auth] Refreshing access token...');
          const refreshResponse = await apiClientRef.current.refreshAccessToken(tokens.refreshToken);

          // Save new tokens
          await saveAuthTokens(refreshResponse.accessToken, refreshResponse.refreshToken);

          // Set tokens in API client
          apiClientRef.current.setAuthToken(refreshResponse.accessToken);
          apiClientRef.current.setRefreshToken(refreshResponse.refreshToken);

          // Update tokens for verification
          tokens.accessToken = refreshResponse.accessToken;
          tokens.refreshToken = refreshResponse.refreshToken;
        } catch (error) {
          // Refresh failed, clear auth data
          console.error('[Auth] Token refresh failed:', error);
          await handleAuthError();
          setIsLoading(false);
          return;
        }
      } else {
        // Both tokens are valid, set them in API client
        apiClientRef.current.setAuthToken(tokens.accessToken);
        apiClientRef.current.setRefreshToken(tokens.refreshToken);
      }

      // Verify auth by calling /me endpoint
      try {
        const currentUser = await apiClientRef.current.getCurrentUser();
        const savedUser = await getUser();

        console.log('[Auth] /me endpoint response:', {
          hasAvatar: !!currentUser?.avatarUrl,
          avatarUrl: currentUser?.avatarUrl,
        });

        // Update user if we got new data
        if (currentUser) {
          await saveUser(currentUser);
          setUser(currentUser);
          setIsAuthenticated(true);
        } else if (savedUser) {
          setUser(savedUser);
          setIsAuthenticated(true);
        } else {
          throw new Error('No user data available from API or storage');
        }
      } catch (error) {
        // If /me returns 401, user is not authenticated
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Auth] Auth verification failed:', errorMessage, error);
        await handleAuthError();
      }
    } catch (error) {
      console.error('[Auth] Error checking auth:', error);
      await handleAuthError();
    } finally {
      setIsLoading(false);
      isCheckingAuthRef.current = false;
    }
  }, [handleAuthError]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string): Promise<void> => {
    if (!apiClientRef.current) {
      throw new Error('API client not initialized');
    }

    try {
      const response = await apiClientRef.current.login(email, password);

      // Save tokens
      await saveAuthTokens(response.accessToken, response.refreshToken);

      // Verify tokens were saved
      const savedTokens = await getAuthTokens();
      if (!savedTokens || !savedTokens.accessToken || !savedTokens.refreshToken) {
        throw new Error('Failed to save authentication tokens');
      }

      // Set tokens in API client
      apiClientRef.current.setAuthToken(response.accessToken);
      apiClientRef.current.setRefreshToken(response.refreshToken);

      // Always get full user info from /me endpoint to ensure we have complete data including avatar
      const userData = await apiClientRef.current.getCurrentUser();

      console.log('[Auth] User data from /me endpoint:', {
        hasAvatar: !!userData?.avatarUrl,
        avatarUrl: userData?.avatarUrl,
        email: userData?.email,
      });

      // Save user
      if (userData) {
        await saveUser(userData);
        setUser(userData);
      }

      setIsAuthenticated(true);
      console.log('[Auth] Login successful');
    } catch (error) {
      console.error('[Auth] Login error:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string): Promise<void> => {
    if (!apiClientRef.current) {
      throw new Error('API client not initialized');
    }

    try {
      const response = await apiClientRef.current.signup(email, password);

      // Save tokens
      await saveAuthTokens(response.accessToken, response.refreshToken);

      // Verify tokens were saved
      const savedTokens = await getAuthTokens();
      if (!savedTokens || !savedTokens.accessToken || !savedTokens.refreshToken) {
        throw new Error('Failed to save authentication tokens');
      }

      // Set tokens in API client
      apiClientRef.current.setAuthToken(response.accessToken);
      apiClientRef.current.setRefreshToken(response.refreshToken);

      // Always get full user info from /me endpoint to ensure we have complete data including avatar
      const userData = await apiClientRef.current.getCurrentUser();

      console.log('[Auth] User data from /me endpoint:', {
        hasAvatar: !!userData?.avatarUrl,
        avatarUrl: userData?.avatarUrl,
        email: userData?.email,
      });

      // Save user
      if (userData) {
        await saveUser(userData);
        setUser(userData);
      }

      setIsAuthenticated(true);
      console.log('[Auth] Signup successful');
    } catch (error) {
      console.error('[Auth] Signup error:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    if (!apiClientRef.current) {
      await handleAuthError();
      return;
    }

    try {
      const tokens = await getAuthTokens();
      if (tokens?.refreshToken) {
        try {
          await apiClientRef.current.logout(tokens.refreshToken);
        } catch (error) {
          console.error('[Auth] Logout API call failed:', error);
          // Continue with local logout even if API call fails
        }
      }
    } catch (error) {
      console.error('[Auth] Error during logout:', error);
    } finally {
      await handleAuthError();
      console.log('[Auth] Logout successful');
    }
  };

  const updateUser = async (userData: User): Promise<void> => {
    try {
      await saveUser(userData);
      setUser(userData);
    } catch (error) {
      console.error('[Auth] Error updating user:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        signup,
        logout,
        checkAuth,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

