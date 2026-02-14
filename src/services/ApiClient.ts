import {
  LoginRequest,
  SignupRequest,
  GoogleAuthRequest,
  UploadImageRequest,
  UpdateAccountSettingsRequest,
  RecognizeItemRequest,
  UpdateUserRequest,
  AuthResponse,
  User,
  UploadImageResponse,
  GetAccountPermissionsResponse,
  UpdateAccountSettingsResponse,
  ListMembersResponse,
  RegenerateInvitationCodeResponse,
  RecognizeItemResponse,
  ErrorDetails,
  RetryAttempt,
  ValidateInvitationResponse,
  ListAccessibleAccountsResponse,
  RemoveMemberResponse,
  GetInvitationCodeResponse,
  AcceptInvitationResponse,
  SyncFileType,
  PushFileRequest,
  SyncStatusResponse,
  PullFileResponse,
  PushFileResponse,
  DeleteFileDataResponse,
  SyncEntityType,
  BatchSyncRequest,
  BatchSyncResponse,
  SyncEntitiesStatusResponse,
  PullEntitiesResponse,
  PushEntitiesRequest,
  PushEntitiesResponse,
  ResetSyncResponse,
  SyncHomesResponse,
  PushHomesRequest,
  PushHomesResponse,
} from '../types/api';
import { apiLogger } from '../utils/Logger';

interface RequestOptions {
  method: string;
  body?: unknown;
  requiresAuth?: boolean;
}

class ApiClient {
  private activeUserId: string | null = null;
  private baseUrl: string;
  private authToken: string | null = null;
  private onAuthError?: (endpoint: string) => void;
  private onAccessDenied?: (resourceId?: string) => void;
  private onError?: (errorDetails: ErrorDetails) => void;
  private maxRetries: number = 3;
  private baseDelay: number = 1000; // 1 second
  private maxDelay: number = 10000; // 10 seconds

  /* @private */
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
  setOnAuthError(callback: (endpoint: string) => void): void {
    this.onAuthError = callback;
  }

  /**
   * Set callback for access denied errors (403)
   */
  setOnAccessDenied(callback: (resourceId?: string) => void): void {
    this.onAccessDenied = callback;
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
   * Request helper (public for use by services)
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

    // Standard API logging
    apiLogger.request(options.method, endpoint, { url, requiresAuth: options.requiresAuth });
    if (options.body) {
      const bodyStr = JSON.stringify(options.body);
      const bodySize = new Blob([bodyStr]).size;
      apiLogger.dataSize('Request Body', bodySize);
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

        // Standard API response logging
        apiLogger.response(response.status, endpoint, requestDuration);

        // Handle 401 Unauthorized - trigger auth error callback and don't retry
        if (response.status === 401 && options.requiresAuth) {
          apiLogger.warn('401 Unauthorized', { endpoint, url });
          if (this.onAuthError) {
            this.onAuthError(endpoint);
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

        // Handle 403 Forbidden - trigger access denied callback
        if (response.status === 403) {
          apiLogger.warn('403 Forbidden', { endpoint, url, activeUserId: this.activeUserId });
          if (this.onAccessDenied) {
            this.onAccessDenied(this.activeUserId || undefined);
          }
          // specific handling can continue or throw
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

          apiLogger.error(`Request failed: ${response.status}`, { endpoint, url, errorMessage, responseBody });

          // Check if error is retryable
          if (this.isRetryableError(null, response.status) && attempt < this.maxRetries) {
            const delay = this.calculateDelay(attempt);
            retryAttempts.push({
              attempt: attempt + 1,
              delay,
              timestamp: new Date().toISOString(),
              error: errorMessage,
            });

            apiLogger.retry(attempt + 1, this.maxRetries, delay);

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
          apiLogger.debug('Empty response (204 No Content)', { endpoint, url });
          return {} as T;
        }

        const responseData = await response.json();

        apiLogger.debug('Request successful', { endpoint, status: response.status, duration: requestDuration });

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

        apiLogger.error(`Network error: ${error instanceof Error ? error.message : String(error)}`, { endpoint, url });

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

          apiLogger.retry(attempt + 1, this.maxRetries, delay);

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

  // =============================================================================
  // Auth Endpoints
  // =============================================================================

  /**
   * POST /api/auth/login
   * Authenticate with email and password
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
   * POST /api/auth/signup
   * Create a new user account
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
   * POST /api/auth/google
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
   * GET /api/auth/me
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    return this.request<User>('/api/auth/me', {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * PATCH /api/auth/me
   * Update current user profile
   * Supports updating nickname, avatarUrl, and password
   */
  async updateUser(request: UpdateUserRequest): Promise<User> {
    return this.request<User>('/api/auth/me', {
      method: 'PATCH',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * Update user password
   * @deprecated Use updateUser() instead
   */
  async updatePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<User> {
    return this.updateUser({ currentPassword, newPassword });
  }

  /**
   * Update user avatar URL
   * @deprecated Use updateUser() instead
   */
  async updateAvatarUrl(avatarUrl: string): Promise<User> {
    return this.updateUser({ avatarUrl });
  }

  /**
   * Update user nickname
   * @deprecated Use updateUser() instead
   */
  async updateNickname(nickname: string): Promise<User> {
    return this.updateUser({ nickname });
  }

  // =============================================================================
  // Images Endpoints
  // =============================================================================

  /**
   * POST /api/images/upload
   * Upload an image to B2 storage
   */
  async uploadImage(image: string): Promise<UploadImageResponse> {
    const request: UploadImageRequest = { image };
    return this.request<UploadImageResponse>('/api/images/upload', {
      method: 'POST',
      body: request,
      requiresAuth: true,
    });
  }

  // =============================================================================
  // AI Endpoints
  // =============================================================================

  /**
   * POST /api/ai/recognize-item
   * Recognize inventory item from image using AI
   */
  async recognizeItem(image: string): Promise<RecognizeItemResponse> {
    const request: RecognizeItemRequest = { image };
    return this.request<RecognizeItemResponse>('/api/ai/recognize-item', {
      method: 'POST',
      body: request,
      requiresAuth: false,
    });
  }

  // =============================================================================
  // Home Settings & Members
  // =============================================================================

  /**
   * PATCH /api/homes/:homeId/settings
   * Update home sharing settings
   */
  async updateHomeSettings(
    homeId: string,
    settings: UpdateAccountSettingsRequest
  ): Promise<UpdateAccountSettingsResponse> {
    return this.request<UpdateAccountSettingsResponse>(`/api/homes/${homeId}/settings`, {
      method: 'PATCH',
      body: settings,
      requiresAuth: true,
    });
  }



  /**
   * GET /api/homes/:homeId/members
   * List all members of the home
   */
  async listMembers(homeId: string): Promise<ListMembersResponse> {
    return this.request<ListMembersResponse>(`/api/homes/${homeId}/members`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * DELETE /api/homes/:homeId/members/:userId
   * Remove a member from the home
   */
  async removeMember(homeId: string, userId: string): Promise<RemoveMemberResponse> {
    return this.request<RemoveMemberResponse>(`/api/homes/${homeId}/members/${userId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  }



  // =============================================================================
  // Invitations Endpoints
  // =============================================================================

  /**
   * GET /api/homes/:homeId/invitation
   * Get the invitation info for the home
   */
  async getInvitation(homeId: string): Promise<GetInvitationCodeResponse> {
    return this.request<GetInvitationCodeResponse>(`/api/homes/${homeId}/invitation`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * POST /api/homes/:homeId/invitation/regenerate
   * Regenerate the invitation code for the home
   */
  async regenerateInvitationCode(homeId: string): Promise<{ invitationCode: string }> {
    return this.request<{ invitationCode: string }>(`/api/homes/${homeId}/invitation/regenerate`, {
      method: 'POST',
      requiresAuth: true,
    });
  }

  /**
   * GET /api/invitations/:code
   * Validate an invitation code
   */
  async validateInvitation(code: string): Promise<ValidateInvitationResponse> {
    return this.request<ValidateInvitationResponse>(`/api/invitations/${code}`, {
      method: 'GET',
      requiresAuth: false,
    });
  }

  /**
   * POST /api/invitations/:code/accept
   * Accept an invitation to join an account
   */
  async acceptInvitation(code: string): Promise<AcceptInvitationResponse> {
    return this.request<AcceptInvitationResponse>(`/api/invitations/${code}/accept`, {
      method: 'POST',
      requiresAuth: true,
    });
  }

  // =============================================================================
  // Sync Endpoints
  // =============================================================================

  /**
   * GET /api/homes/sync
   * Sync homes list with server
   * @param since Optional ISO 8601 timestamp for incremental sync
   * @param includeDeleted Optional whether to include deleted home IDs
   */
  async syncHomes(since?: string, includeDeleted?: boolean): Promise<SyncHomesResponse> {
    const queryParams = new URLSearchParams();
    if (since) {
      queryParams.append('since', since);
    }
    if (includeDeleted !== undefined) {
      queryParams.append('includeDeleted', String(includeDeleted));
    }
    return this.request<SyncHomesResponse>(`/api/homes/sync?${queryParams.toString()}`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * POST /api/homes/sync
   * Push local home changes to server
   */
  async pushHomes(request: PushHomesRequest): Promise<PushHomesResponse> {
    return this.request<PushHomesResponse>('/api/homes/sync', {
      method: 'POST',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * GET /api/sync/status
   * Get sync status for all file types
   */
  async getSyncStatus(): Promise<SyncStatusResponse> {
    return this.request<SyncStatusResponse>('/api/sync/status', {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * GET /api/sync/:fileType/pull
   * Pull sync data for a specific file type
   * @param fileType Type of file to sync (categories, locations, inventoryItems, todoItems, settings)
   * @param userId Optional target account ID for cross-account access
   */
  async pullFile<T = unknown>(fileType: SyncFileType, userId?: string): Promise<PullFileResponse<T>> {
    const endpoint = userId ? `/api/sync/${fileType}/pull?userId=${userId}` : `/api/sync/${fileType}/pull`;
    return this.request<PullFileResponse<T>>(endpoint, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * POST /api/sync/:fileType/push
   * Push sync data for a specific file type
   * @param fileType Type of file to sync (categories, locations, inventoryItems, todoItems, settings)
   * @param request Sync data to upload
   */
  async pushFile(fileType: SyncFileType, request: PushFileRequest): Promise<PushFileResponse> {
    return this.request<PushFileResponse>(`/api/sync/${fileType}/push`, {
      method: 'POST',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * DELETE /api/sync/:fileType/data
   * Delete sync data for a specific file type
   * @param fileType Type of file to delete (categories, locations, inventoryItems, todoItems, settings)
   * @param userId Optional target account ID for cross-account access
   */
  async deleteFileData(fileType: SyncFileType, userId?: string): Promise<DeleteFileDataResponse> {
    const endpoint = userId ? `/api/sync/${fileType}/data?userId=${userId}` : `/api/sync/${fileType}/data`;
    return this.request<DeleteFileDataResponse>(endpoint, {
      method: 'DELETE',
      requiresAuth: true,
    });
  }

  // =============================================================================
  // Sync Entities Endpoints
  // =============================================================================

  /**
   * POST /api/sync/entities/batch
   * Combined pull and push in a single request
   */
  async batchSync(request: BatchSyncRequest): Promise<BatchSyncResponse> {
    return this.request<BatchSyncResponse>('/api/sync/entities/batch', {
      method: 'POST',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * GET /api/sync/entities/status
   * Get sync status for entity types in a home
   * @param homeId Home ID to check sync status for
   * @param deviceId Client device identifier
   * @param entityType Optional specific entity type to check, or all if omitted
   */
  async getSyncEntitiesStatus(
    homeId: string,
    deviceId: string,
    entityType?: SyncEntityType
  ): Promise<SyncEntitiesStatusResponse> {
    const queryParams = new URLSearchParams({ homeId, deviceId });
    if (entityType) {
      queryParams.append('entityType', entityType);
    }
    return this.request<SyncEntitiesStatusResponse>(`/api/sync/entities/status?${queryParams.toString()}`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * GET /api/sync/entities/pull
   * Pull entities for a home and entity type
   * @param homeId Home ID to pull entities from
   * @param entityType Type of entities to pull
   * @param deviceId Client device identifier for checkpoint tracking
   * @param since Optional ISO 8601 timestamp for incremental sync
   * @param includeDeleted Optional whether to include soft-deleted entities
   */
  async pullEntities(
    homeId: string,
    entityType: SyncEntityType,
    deviceId: string,
    since?: string,
    includeDeleted?: boolean
  ): Promise<PullEntitiesResponse> {
    const queryParams = new URLSearchParams({ homeId, entityType, deviceId });
    if (since) {
      queryParams.append('since', since);
    }
    if (includeDeleted !== undefined) {
      queryParams.append('includeDeleted', String(includeDeleted));
    }
    return this.request<PullEntitiesResponse>(`/api/sync/entities/pull?${queryParams.toString()}`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * POST /api/sync/entities/push
   * Push entity changes to the server with automatic conflict resolution
   * @param homeId Home ID to push entities to
   * @param entityType Type of entities being pushed
   * @param deviceId Client device identifier for tracking changes
   * @param request Array of entities to sync with optional checkpoint info
   */
  async pushEntities(
    homeId: string,
    entityType: SyncEntityType,
    deviceId: string,
    request: PushEntitiesRequest
  ): Promise<PushEntitiesResponse> {
    const queryParams = new URLSearchParams({ homeId, entityType, deviceId });
    return this.request<PushEntitiesResponse>(`/api/sync/entities/push?${queryParams.toString()}`, {
      method: 'POST',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * DELETE /api/sync/entities/reset
   * Clear sync checkpoints forcing full re-sync
   * @param homeId Home ID to reset sync checkpoints for
   * @param deviceId Client device identifier to reset checkpoints for
   * @param entityType Optional specific entity type to reset, or all if omitted
   */
  async resetSync(
    homeId: string,
    deviceId: string,
    entityType?: SyncEntityType
  ): Promise<ResetSyncResponse> {
    const queryParams = new URLSearchParams({ homeId, deviceId });
    if (entityType) {
      queryParams.append('entityType', entityType);
    }
    return this.request<ResetSyncResponse>(`/api/sync/entities/reset?${queryParams.toString()}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  }
}

// Singleton initialization with environment-based config
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://home-inventory-api.logicore.digital';
export const apiClient = new ApiClient(API_BASE_URL);

// Export type for consumers who need it
export type { ApiClient };
