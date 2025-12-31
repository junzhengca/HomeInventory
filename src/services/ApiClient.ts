import {
  LoginRequest,
  SignupRequest,
  RefreshTokenRequest,
  LogoutRequest,
  UploadImageRequest,
  UpdatePasswordRequest,
  UpdateAvatarUrlRequest,
  AuthResponse,
  User,
  UploadImageResponse,
} from '../types/api';
import { isTokenExpired } from '../utils/jwtUtils';

interface RequestOptions {
  method: string;
  body?: unknown;
  requiresAuth?: boolean;
}

export class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  private onTokenRefresh?: (tokens: { accessToken: string; refreshToken: string }) => void;
  private onAuthError?: () => void;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Set the authentication token for subsequent requests
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * Get the current authentication token
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Set the refresh token
   */
  setRefreshToken(token: string | null): void {
    this.refreshToken = token;
  }

  /**
   * Get the current refresh token
   */
  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /**
   * Set callback for token refresh
   */
  setOnTokenRefresh(callback: (tokens: { accessToken: string; refreshToken: string }) => void): void {
    this.onTokenRefresh = callback;
  }

  /**
   * Set callback for authentication errors
   */
  setOnAuthError(callback: () => void): void {
    this.onAuthError = callback;
  }

  /**
   * Attempt to refresh the access token
   */
  private async attemptTokenRefresh(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await this.refreshAccessToken(this.refreshToken);
      this.authToken = response.accessToken;
      this.refreshToken = response.refreshToken;

      if (this.onTokenRefresh) {
        this.onTokenRefresh({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        });
      }

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      if (this.onAuthError) {
        this.onAuthError();
      }
      return false;
    }
  }

  /**
   * Internal request helper
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions,
    retryOn401 = true
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Check if token is expired before making request
    if (options.requiresAuth && this.authToken && isTokenExpired(this.authToken)) {
      const refreshed = await this.attemptTokenRefresh();
      if (!refreshed) {
        throw new Error('Token expired and refresh failed');
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add Bearer token if auth is required and token is available
    if (options.requiresAuth && this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    const fetchOptions: {
      method: string;
      headers: Record<string, string>;
      body?: string;
    } = {
      method: options.method,
      headers,
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, fetchOptions);

      // Handle 401 Unauthorized - try to refresh token and retry once
      if (response.status === 401 && options.requiresAuth && retryOn401) {
        const refreshed = await this.attemptTokenRefresh();
        if (refreshed) {
          // Retry the request with new token
          if (this.authToken) {
            headers.Authorization = `Bearer ${this.authToken}`;
          }
          const retryResponse = await fetch(url, {
            ...fetchOptions,
            headers,
          });

          if (!retryResponse.ok) {
            // If retry also fails, it's a real auth error
            if (retryResponse.status === 401 && this.onAuthError) {
              this.onAuthError();
            }
            let errorMessage = `Request failed with status ${retryResponse.status}`;
            try {
              const errorData = await retryResponse.json();
              errorMessage = errorData.message || errorMessage;
            } catch {
              // If response is not JSON, use default error message
            }
            throw new Error(errorMessage);
          }

          // Handle empty responses (e.g., 204 No Content)
          if (retryResponse.status === 204 || retryResponse.headers.get('content-length') === '0') {
            return {} as T;
          }

          return await retryResponse.json();
        } else {
          // Refresh failed, throw error
          throw new Error('Authentication failed');
        }
      }

      if (!response.ok) {
        // Handle 401 that we couldn't retry
        if (response.status === 401 && options.requiresAuth && this.onAuthError) {
          this.onAuthError();
        }
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use default error message
        }
        throw new Error(errorMessage);
      }

      // Handle empty responses (e.g., 204 No Content)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const request: LoginRequest = { email, password };
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: request,
      requiresAuth: false,
    });
  }

  /**
   * Sign up with email and password
   */
  async signup(email: string, password: string): Promise<AuthResponse> {
    const request: SignupRequest = { email, password };
    return this.request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: request,
      requiresAuth: false,
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    const request: RefreshTokenRequest = { refreshToken };
    return this.request<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
      body: request,
      requiresAuth: false,
    });
  }

  /**
   * Logout with refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    const request: LogoutRequest = { refreshToken };
    return this.request<void>('/api/auth/logout', {
      method: 'POST',
      body: request,
      requiresAuth: false,
    });
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<User> {
    return this.request<User>('/api/auth/me', {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * Upload an image
   */
  async uploadImage(image: string): Promise<UploadImageResponse> {
    const request: UploadImageRequest = { image };
    return this.request<UploadImageResponse>('/api/images/upload', {
      method: 'POST',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * Update user password
   */
  async updatePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<User> {
    const request: UpdatePasswordRequest = { currentPassword, newPassword };
    return this.request<User>('/api/auth/me', {
      method: 'PATCH',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * Update user avatar URL
   */
  async updateAvatarUrl(avatarUrl: string): Promise<User> {
    const request: UpdateAvatarUrlRequest = { avatarUrl };
    return this.request<User>('/api/auth/me', {
      method: 'PATCH',
      body: request,
      requiresAuth: true,
    });
  }
}

