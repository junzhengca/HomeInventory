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
   * Request helper (public for use by SyncService)
   */
  public async request<T>(
    endpoint: string,
    options: RequestOptions,
    retryOn401 = true
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const isSyncRequest = endpoint.startsWith('/api/sync/');
    const requestStartTime = Date.now();
    
    // Verbose logging for sync requests
    if (isSyncRequest) {
      console.log('[ApiClient] ========== SYNC REQUEST START ==========');
      console.log('[ApiClient] Endpoint:', endpoint);
      console.log('[ApiClient] Full URL:', url);
      console.log('[ApiClient] Method:', options.method);
      console.log('[ApiClient] Requires Auth:', options.requiresAuth);
      if (options.body) {
        const bodyStr = JSON.stringify(options.body);
        const bodySize = new Blob([bodyStr]).size;
        console.log('[ApiClient] Request Body Size:', bodySize, 'bytes');
        console.log('[ApiClient] Request Body:', JSON.stringify(options.body, null, 2));
      } else {
        console.log('[ApiClient] Request Body: (none)');
      }
      console.log('[ApiClient] Timestamp:', new Date().toISOString());
    }
    
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

    // Log headers for sync requests (excluding sensitive token)
    if (isSyncRequest) {
      const logHeaders = { ...headers };
      if (logHeaders.Authorization) {
        logHeaders.Authorization = `Bearer [REDACTED - ${this.authToken?.length || 0} chars]`;
      }
      console.log('[ApiClient] Request Headers:', JSON.stringify(logHeaders, null, 2));
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
      const requestDuration = Date.now() - requestStartTime;
      
      // Verbose logging for sync responses
      if (isSyncRequest) {
        console.log('[ApiClient] ========== SYNC RESPONSE RECEIVED ==========');
        console.log('[ApiClient] Endpoint:', endpoint);
        console.log('[ApiClient] Status:', response.status, response.statusText);
        console.log('[ApiClient] Request Duration:', requestDuration, 'ms');
        console.log('[ApiClient] Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
      }

      // Handle 401 Unauthorized - try to refresh token and retry once
      if (response.status === 401 && options.requiresAuth && retryOn401) {
        if (isSyncRequest) {
          console.log('[ApiClient] Received 401, attempting token refresh and retry...');
        }
        const refreshed = await this.attemptTokenRefresh();
        if (refreshed) {
          // Retry the request with new token
          if (this.authToken) {
            headers.Authorization = `Bearer ${this.authToken}`;
          }
          const retryStartTime = Date.now();
          const retryResponse = await fetch(url, {
            ...fetchOptions,
            headers,
          });
          const retryDuration = Date.now() - retryStartTime;

          if (!retryResponse.ok) {
            // If retry also fails, it's a real auth error
            if (retryResponse.status === 401 && this.onAuthError) {
              this.onAuthError();
            }
            let errorMessage = `Request failed with status ${retryResponse.status}`;
            let responseBody: unknown = null;
            
            // Clone response to read body without consuming the original
            const clonedRetryResponse = retryResponse.clone();
            try {
              const errorData = await clonedRetryResponse.json();
              responseBody = errorData;
              errorMessage = errorData.message || errorMessage;
            } catch {
              // If response is not JSON, try to get text
              try {
                const text = await retryResponse.text();
                responseBody = text;
                if (text) {
                  errorMessage = text;
                }
              } catch {
                // If response is not text, use default error message
              }
            }
            
            // Verbose logging for sync error responses
            if (isSyncRequest) {
              console.error('[ApiClient] ========== SYNC REQUEST FAILED (RETRY) ==========');
              console.error('[ApiClient] Endpoint:', endpoint);
              console.error('[ApiClient] Status:', retryResponse.status, retryResponse.statusText);
              console.error('[ApiClient] Retry Duration:', retryDuration, 'ms');
              console.error('[ApiClient] Error Message:', errorMessage);
              console.error('[ApiClient] Response Body:', JSON.stringify(responseBody, null, 2));
              console.error('[ApiClient] ================================================');
            }
            
            // Create error with response body attached for verbose logging
            const error = new Error(errorMessage);
            (error as Error & { responseBody?: unknown }).responseBody = responseBody;
            (error as Error & { status?: number }).status = retryResponse.status;
            throw error;
          }

          // Handle empty responses (e.g., 204 No Content)
          if (retryResponse.status === 204 || retryResponse.headers.get('content-length') === '0') {
            if (isSyncRequest) {
              console.log('[ApiClient] Response Body: (empty - 204 No Content)');
              console.log('[ApiClient] Total Duration (with retry):', Date.now() - requestStartTime, 'ms');
              console.log('[ApiClient] ========== SYNC REQUEST COMPLETE ==========');
            }
            return {} as T;
          }

          const retryResponseData = await retryResponse.json();
          
          // Verbose logging for successful sync retry responses
          if (isSyncRequest) {
            const responseStr = JSON.stringify(retryResponseData);
            const responseSize = new Blob([responseStr]).size;
            console.log('[ApiClient] Response Body Size:', responseSize, 'bytes');
            console.log('[ApiClient] Response Body:', JSON.stringify(retryResponseData, null, 2));
            console.log('[ApiClient] Total Duration (with retry):', Date.now() - requestStartTime, 'ms');
            console.log('[ApiClient] ========== SYNC REQUEST COMPLETE ==========');
          }
          
          return retryResponseData;
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
        let responseBody: unknown = null;
        
        // Clone response to read body without consuming the original
        const clonedResponse = response.clone();
        try {
          const errorData = await clonedResponse.json();
          responseBody = errorData;
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If response is not JSON, try to get text
          try {
            const text = await response.text();
            responseBody = text;
            if (text) {
              errorMessage = text;
            }
          } catch {
            // If response is not text, use default error message
          }
        }
        
        // Verbose logging for sync error responses
        if (isSyncRequest) {
          console.error('[ApiClient] ========== SYNC REQUEST FAILED ==========');
          console.error('[ApiClient] Endpoint:', endpoint);
          console.error('[ApiClient] Status:', response.status, response.statusText);
          console.error('[ApiClient] Request Duration:', requestDuration, 'ms');
          console.error('[ApiClient] Error Message:', errorMessage);
          console.error('[ApiClient] Response Body:', JSON.stringify(responseBody, null, 2));
          console.error('[ApiClient] =========================================');
        }
        
        // Create error with response body attached for verbose logging
        const error = new Error(errorMessage);
        (error as Error & { responseBody?: unknown }).responseBody = responseBody;
        (error as Error & { status?: number }).status = response.status;
        throw error;
      }

      // Handle empty responses (e.g., 204 No Content)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        if (isSyncRequest) {
          console.log('[ApiClient] Response Body: (empty - 204 No Content)');
          console.log('[ApiClient] Request Duration:', requestDuration, 'ms');
          console.log('[ApiClient] ========== SYNC REQUEST COMPLETE ==========');
        }
        return {} as T;
      }

      const responseData = await response.json();
      
      // Verbose logging for successful sync responses
      if (isSyncRequest) {
        const responseStr = JSON.stringify(responseData);
        const responseSize = new Blob([responseStr]).size;
        console.log('[ApiClient] Response Body Size:', responseSize, 'bytes');
        console.log('[ApiClient] Response Body:', JSON.stringify(responseData, null, 2));
        console.log('[ApiClient] Request Duration:', requestDuration, 'ms');
        console.log('[ApiClient] ========== SYNC REQUEST COMPLETE ==========');
      }
      
      return responseData;
    } catch (error) {
      // Verbose logging for sync request errors (network errors, etc.)
      if (isSyncRequest) {
        const requestDuration = Date.now() - requestStartTime;
        console.error('[ApiClient] ========== SYNC REQUEST ERROR ==========');
        console.error('[ApiClient] Endpoint:', endpoint);
        console.error('[ApiClient] Request Duration:', requestDuration, 'ms');
        console.error('[ApiClient] Error Type:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('[ApiClient] Error Message:', error instanceof Error ? error.message : String(error));
        console.error('[ApiClient] Full Error:', error);
        console.error('[ApiClient] ========================================');
      }
      
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

