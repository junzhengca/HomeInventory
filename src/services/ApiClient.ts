import {
  LoginRequest,
  SignupRequest,
  GoogleAuthRequest,
  UploadImageRequest,
  UpdatePasswordRequest,
  UpdateAvatarUrlRequest,
  UpdateNicknameRequest,
  UpdateAccountSettingsRequest,
  RecognizeItemRequest,
  AuthResponse,
  User,
  UploadImageResponse,
  InvitationResponse,
  UpdateAccountSettingsResponse,
  ListMembersResponse,
  RegenerateInvitationResponse,
  RecognizeItemResponse,
  ErrorDetails,
  RetryAttempt,
  ValidateInvitationResponse,
  ListAccessibleAccountsResponse,
} from '../types/api';
import { apiLogger, syncLogger } from '../utils/Logger';

interface RequestOptions {
  method: string;
  body?: unknown;
  requiresAuth?: boolean;
}

export class ApiClient {
  private activeUserId: string | null = null;
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
   * Set the active user ID (for home switching)
   */
  setActiveUserId(userId: string | null): void {
    this.activeUserId = userId;
  }

  /**
   * Set the authentication token for subsequent requests
   */
  setAuthToken(token: string | null): void {
    // Trim whitespace from token to prevent auth errors
    this.authToken = token ? token.trim() : null;
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
    // Automatically append activeUserId if set and not already present
    let finalEndpoint = endpoint;
    if (this.activeUserId && !finalEndpoint.includes('userId=')) {
      const separator = finalEndpoint.includes('?') ? '&' : '?';
      finalEndpoint = `${finalEndpoint}${separator}userId=${this.activeUserId}`;
    }

    const url = `${this.baseUrl}${finalEndpoint}`;
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
      syncLogger.separator('=');
      syncLogger.start('SYNC REQUEST');
      syncLogger.verbose(`Endpoint: ${endpoint}`);
      syncLogger.verbose(`Full URL: ${url}`);
      syncLogger.verbose(`Method: ${options.method}`);
      syncLogger.verbose(`Requires Auth: ${options.requiresAuth}`);
      if (options.body) {
        const bodyStr = JSON.stringify(options.body);
        const bodySize = new Blob([bodyStr]).size;
        syncLogger.dataSize('Request Body', bodySize);
        syncLogger.verbose('Request Body:', options.body);
      } else {
        syncLogger.verbose('Request Body: (none)');
      }
      syncLogger.verbose(`Headers: ${JSON.stringify(logHeaders)}`);
    } else {
      // Standard API logging
      apiLogger.request(options.method, endpoint, { url, requiresAuth: options.requiresAuth });
      if (options.body) {
        const bodyStr = JSON.stringify(options.body);
        const bodySize = new Blob([bodyStr]).size;
        apiLogger.dataSize('Request Body', bodySize);
      }
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
          syncLogger.separator('=');
          syncLogger.debug(`RESPONSE: ${response.status} ${response.statusText}`);
          syncLogger.verbose(`Duration: ${requestDuration}ms`);
          syncLogger.verbose('Response Headers:', Object.fromEntries(response.headers.entries()));
        } else {
          // Standard API response logging
          apiLogger.response(response.status, endpoint, requestDuration);
        }

        // Handle 401 Unauthorized - trigger auth error callback and don't retry
        if (response.status === 401 && options.requiresAuth) {
          if (isSyncRequest) {
            syncLogger.warn('Received 401, triggering auth error callback...');
          } else {
            apiLogger.warn('401 Unauthorized', { endpoint, url });
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
            syncLogger.separator('=');
            syncLogger.error(`REQUEST FAILED: ${response.status} ${response.statusText}`);
            syncLogger.verbose(`Duration: ${requestDuration}ms`);
            syncLogger.verbose(`Error: ${errorMessage}`);
            syncLogger.verbose('Response Body:', responseBody);
          } else {
            apiLogger.error(`Request failed: ${response.status}`, { endpoint, url, errorMessage, responseBody });
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
              syncLogger.retry(attempt + 1, this.maxRetries, delay);
            } else {
              apiLogger.retry(attempt + 1, this.maxRetries, delay);
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
            syncLogger.verbose('Response Body: (empty - 204 No Content)');
            syncLogger.end('SYNC REQUEST', requestDuration);
          } else {
            apiLogger.debug('Empty response (204 No Content)', { endpoint, url });
          }
          return {} as T;
        }

        const responseData = await response.json();

        // Verbose logging for successful sync responses
        if (isSyncRequest) {
          const responseStr = JSON.stringify(responseData);
          const responseSize = new Blob([responseStr]).size;
          syncLogger.dataSize('Response Body', responseSize);
          syncLogger.verbose('Response Body:', responseData);
          syncLogger.end('SYNC REQUEST', requestDuration);
        } else {
          apiLogger.debug('Request successful', { endpoint, status: response.status, duration: requestDuration });
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
          syncLogger.separator('=');
          syncLogger.error(`REQUEST ERROR: ${error instanceof Error ? error.constructor.name : typeof error}`);
          syncLogger.verbose(`Duration: ${requestDuration}ms`);
          syncLogger.verbose(`Error: ${error instanceof Error ? error.message : String(error)}`);
          syncLogger.verbose('Full Error:', error);
        } else {
          apiLogger.error(`Network error: ${error instanceof Error ? error.message : String(error)}`, { endpoint, url });
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
            syncLogger.retry(attempt + 1, this.maxRetries, delay);
          } else {
            apiLogger.retry(attempt + 1, this.maxRetries, delay);
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
   * Recognize an inventory item from an image using AI
   */
  async recognizeItem(image: string): Promise<RecognizeItemResponse> {
    const request: RecognizeItemRequest = { image };
    return this.request<RecognizeItemResponse>('/api/ai/recognize-item', {
      method: 'POST',
      body: request,
      requiresAuth: false,
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

  /**
   * List members of the current user's account
   */
  async listMembers(userId?: string): Promise<ListMembersResponse> {
    const endpoint = `/api/accounts/members${userId ? `?userId=${userId}` : ''}`;
    return this.request<ListMembersResponse>(endpoint, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * List all accounts the authenticated user can access
   */
  async listAccessibleAccounts(): Promise<ListAccessibleAccountsResponse> {
    return this.request<ListAccessibleAccountsResponse>('/api/accounts', {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * Remove a member from the current user's account
   */
  async removeMember(memberId: string, userId?: string): Promise<{ success: boolean; message: string }> {
    const endpoint = `/api/accounts/members/${memberId}${userId ? `?userId=${userId}` : ''}`;
    return this.request<{ success: boolean; message: string }>(
      endpoint,
      {
        method: 'DELETE',
        requiresAuth: true,
      }
    );
  }

  /**
   * Regenerate invitation code for the current user's account
   */
  async regenerateInvitationCode(): Promise<RegenerateInvitationResponse> {
    return this.request<RegenerateInvitationResponse>('/api/invitations/regenerate', {
      method: 'POST',
      requiresAuth: true,
    });
  }

  /**
   * Validate an invitation code
   */
  async validateInvitation(code: string): Promise<ValidateInvitationResponse> {
    return this.request<ValidateInvitationResponse>(`/api/invitations/${code}`, {
      method: 'GET',
      requiresAuth: false,
    });
  }

  /**
   * Accept an invitation code
   */
  async acceptInvitation(code: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/invitations/${code}/accept`, {
      method: 'POST',
      requiresAuth: true,
    });
  }
}

