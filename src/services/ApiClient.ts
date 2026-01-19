import {
  LoginRequest,
  SignupRequest,
  GoogleAuthRequest,
  UploadImageRequest,
  UpdatePasswordRequest,
  UpdateAvatarUrlRequest,
  UpdateNicknameRequest,
  UpdateAccountSettingsRequest,
  AuthResponse,
  User,
  UploadImageResponse,
  InvitationResponse,
  UpdateAccountSettingsResponse,
  ErrorDetails,
  RetryAttempt,
} from '../types/api';

interface RequestOptions {
  method: string;
  body?: unknown;
  requiresAuth?: boolean;
}

export class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;
  private onAuthError?: () => void;
  private onError?: (errorDetails: ErrorDetails) => void;
  private maxRetries: number = 3;
  private baseDelay: number = 1000; // 1 second
  private maxDelay: number = 10000; // 10 seconds

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
   * Set callback for authentication errors
   */
  setOnAuthError(callback: () => void): void {
    this.onAuthError = callback;
  }

  /**
   * Set callback for API errors (called when all retries are exhausted)
   */
  setOnError(callback: (errorDetails: ErrorDetails) => void): void {
    this.onError = callback;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown, status?: number): boolean {
    // Network errors (fetch failures) are always retryable
    if (!status) {
      return true;
    }

    // Don't retry on client errors (except specific retryable ones)
    if (status >= 400 && status < 500) {
      // Retry on: 429 (Too Many Requests)
      if (status === 429) {
        return true;
      }
      // Don't retry on: 400, 401, 404, 422
      return false;
    }

    // Retry on server errors (5xx) and specific status codes
    if (status >= 500) {
      return true;
    }

    // Retry on specific gateway/timeout errors
    if (status === 503 || status === 504) {
      return true;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(2, attempt),
      this.maxDelay
    );
    // Add jitter (0-1000ms) to prevent thundering herd
    const jitter = Math.random() * 1000;
    return exponentialDelay + jitter;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Request helper (public for use by SyncService)
   */
  public async request<T>(
    endpoint: string,
    options: RequestOptions
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const isSyncRequest = endpoint.startsWith('/api/sync/');
    const requestStartTime = Date.now();
    const retryAttempts: RetryAttempt[] = [];
    
    // Store request details for error reporting
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add Bearer token if auth is required and token is available
    if (options.requiresAuth && this.authToken) {
      requestHeaders.Authorization = `Bearer ${this.authToken}`;
    }

    // Create log headers (redacted) for error reporting
    const logHeaders = { ...requestHeaders };
    if (logHeaders.Authorization) {
      logHeaders.Authorization = `Bearer [REDACTED - ${this.authToken?.length || 0} chars]`;
    }

    const fetchOptions: {
      method: string;
      headers: Record<string, string>;
      body?: string;
    } = {
      method: options.method,
      headers: requestHeaders,
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

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
      console.log('[ApiClient] Request Headers:', JSON.stringify(logHeaders, null, 2));
    }

    let lastError: Error | null = null;
    let lastStatus: number | undefined = undefined;
    let lastResponseBody: unknown = null;
    let lastStatusText: string | undefined = undefined;

    // Retry loop
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
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

        // Handle 401 Unauthorized - trigger auth error callback and don't retry
        if (response.status === 401 && options.requiresAuth) {
          if (isSyncRequest) {
            console.log('[ApiClient] Received 401, triggering auth error callback...');
          }
          if (this.onAuthError) {
            this.onAuthError();
          }
          
          // Don't retry on 401
          let errorMessage = `Request failed with status ${response.status}`;
          let responseBody: unknown = null;
          
          const clonedResponse = response.clone();
          try {
            const errorData = await clonedResponse.json();
            responseBody = errorData;
            errorMessage = errorData.message || errorMessage;
          } catch {
            try {
              const text = await response.text();
              responseBody = text;
              if (text) {
                errorMessage = text;
              }
            } catch {
              // Use default error message
            }
          }
          
          const error = new Error(errorMessage);
          (error as Error & { responseBody?: unknown }).responseBody = responseBody;
          (error as Error & { status?: number }).status = response.status;
          throw error;
        }

        if (!response.ok) {
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
          
          lastStatus = response.status;
          lastStatusText = response.statusText;
          lastResponseBody = responseBody;
          
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
          
          // Check if error is retryable
          if (this.isRetryableError(null, response.status) && attempt < this.maxRetries) {
            const delay = this.calculateDelay(attempt);
            retryAttempts.push({
              attempt: attempt + 1,
              delay,
              timestamp: new Date().toISOString(),
              error: errorMessage,
            });
            
            if (isSyncRequest) {
              console.log(`[ApiClient] Retryable error, retrying in ${delay.toFixed(0)}ms (attempt ${attempt + 1}/${this.maxRetries})...`);
            }
            
            await this.sleep(delay);
            continue; // Retry the request
          }
          
          // Not retryable or max retries reached
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
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Extract status from error if available
        const errorWithStatus = error as Error & { status?: number; responseBody?: unknown };
        if (errorWithStatus.status !== undefined) {
          lastStatus = errorWithStatus.status;
          if (errorWithStatus.responseBody !== undefined) {
            lastResponseBody = errorWithStatus.responseBody;
          }
        }
        
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
        
        // Check if error is retryable (network error or retryable status code)
        const isRetryable = this.isRetryableError(error, lastStatus);
        
        if (isRetryable && attempt < this.maxRetries) {
          const delay = this.calculateDelay(attempt);
          retryAttempts.push({
            attempt: attempt + 1,
            delay,
            timestamp: new Date().toISOString(),
            error: lastError.message,
          });
          
          if (isSyncRequest) {
            console.log(`[ApiClient] Retryable error, retrying in ${delay.toFixed(0)}ms (attempt ${attempt + 1}/${this.maxRetries})...`);
          }
          
          await this.sleep(delay);
          continue; // Retry the request
        }
        
        // All retries exhausted or non-retryable error
        const totalDuration = Date.now() - requestStartTime;
        const errorType: 'network' | 'server' = lastStatus ? 'server' : 'network';
        
        // Build error details
        const errorDetails: ErrorDetails = {
          endpoint,
          method: options.method,
          requestBody: options.body,
          requestHeaders: logHeaders,
          status: lastStatus,
          statusText: lastStatusText,
          responseBody: lastResponseBody,
          errorType,
          errorMessage: lastError.message,
          retryAttempts,
          totalDuration,
          timestamp: new Date().toISOString(),
        };
        
        // Call error callback if set
        if (this.onError) {
          this.onError(errorDetails);
        }
        
        // Throw the error
        throw lastError;
      }
    }
    
    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('An unexpected error occurred');
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
   * Authenticate with Google OAuth
   */
  async googleAuth(idToken: string, platform: 'ios' | 'android'): Promise<AuthResponse> {
    const request: GoogleAuthRequest = { idToken, platform };
    return this.request<AuthResponse>('/api/auth/google', {
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

  /**
   * Update user nickname
   */
  async updateNickname(nickname: string): Promise<User> {
    const request: UpdateNicknameRequest = { nickname };
    return this.request<User>('/api/auth/me', {
      method: 'PATCH',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * Get invitation code and account settings
   */
  async getInvitationCode(): Promise<InvitationResponse> {
    return this.request<InvitationResponse>('/api/invitations', {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * Update account settings (sharing permissions)
   */
  async updateAccountSettings(
    settings: UpdateAccountSettingsRequest
  ): Promise<UpdateAccountSettingsResponse> {
    return this.request<UpdateAccountSettingsResponse>('/api/accounts/settings', {
      method: 'PATCH',
      body: settings,
      requiresAuth: true,
    });
  }
}

