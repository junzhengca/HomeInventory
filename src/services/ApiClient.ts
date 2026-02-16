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
  UpdateAccountSettingsResponse,
  ListMembersResponse,
  RecognizeItemResponse,
  ErrorDetails,
  RetryAttempt,
  ValidateInvitationResponse,
  RemoveMemberResponse,
  GetInvitationCodeResponse,
  AcceptInvitationResponse,
  ListHomesResponse,
  CreateHomeRequest,
  CreateHomeResponse,
  UpdateHomeRequest,
  UpdateHomeResponse,
  GetHomeResponse,
  DeleteHomeResponse,
  LeaveHomeResponse,
  HomeMembersResponse,
  // Todo Item CRUD Types
  ListTodosResponse,
  CreateTodoRequest,
  CreateTodoResponse,
  UpdateTodoRequest,
  UpdateTodoResponse,
  GetTodoResponse,
  DeleteTodoResponse,
  // Todo Category CRUD Types
  ListTodoCategoriesResponse,
  CreateTodoCategoryRequest,
  CreateTodoCategoryResponse,
  UpdateTodoCategoryRequest,
  UpdateTodoCategoryResponse,
  GetTodoCategoryResponse,
  DeleteTodoCategoryResponse,
  // Inventory Item CRUD Types
  ListInventoryItemsResponse,
  CreateInventoryItemRequest,
  CreateInventoryItemResponse,
  UpdateInventoryItemRequest,
  UpdateInventoryItemResponse,
  GetInventoryItemResponse,
  DeleteInventoryItemResponse,
  // Inventory Category CRUD Types
  ListInventoryCategoriesResponse,
  CreateInventoryCategoryRequest,
  CreateInventoryCategoryResponse,
  UpdateInventoryCategoryRequest,
  UpdateInventoryCategoryResponse,
  GetInventoryCategoryResponse,
  DeleteInventoryCategoryResponse,
  // Location CRUD Types
  ListLocationsResponse,
  CreateLocationRequest,
  CreateLocationResponse,
  UpdateLocationRequest,
  UpdateLocationResponse,
  GetLocationResponse,
  DeleteLocationResponse,
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
   * GET /api/invitations/homes/:code
   * Validate a home invitation code
   */
  async validateInvitation(code: string): Promise<ValidateInvitationResponse> {
    return this.request<ValidateInvitationResponse>(`/api/invitations/homes/${code}`, {
      method: 'GET',
      requiresAuth: false,
    });
  }

  /**
   * POST /api/invitations/homes/:code/accept
   * Accept a home invitation to join a home
   */
  async acceptInvitation(code: string): Promise<AcceptInvitationResponse> {
    return this.request<AcceptInvitationResponse>(`/api/invitations/homes/${code}/accept`, {
      method: 'POST',
      requiresAuth: true,
    });
  }

  // =============================================================================
  // Home CRUD Endpoints
  // =============================================================================

  /**
   * GET /api/homes
   * List all homes for the authenticated user
   */
  async listHomes(): Promise<ListHomesResponse> {
    return this.request<ListHomesResponse>('/api/homes', {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * POST /api/homes
   * Create a new home
   */
  async createHome(request: CreateHomeRequest): Promise<CreateHomeResponse> {
    return this.request<CreateHomeResponse>('/api/homes', {
      method: 'POST',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * GET /api/homes/:homeId
   * Get details of a specific home
   */
  async getHome(homeId: string): Promise<GetHomeResponse> {
    return this.request<GetHomeResponse>(`/api/homes/${homeId}`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * PATCH /api/homes/:homeId
   * Update a home
   */
  async updateHome(homeId: string, request: UpdateHomeRequest): Promise<UpdateHomeResponse> {
    return this.request<UpdateHomeResponse>(`/api/homes/${homeId}`, {
      method: 'PATCH',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * DELETE /api/homes/:homeId
   * Delete a home (only for owners)
   */
  async deleteHome(homeId: string): Promise<DeleteHomeResponse> {
    return this.request<DeleteHomeResponse>(`/api/homes/${homeId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  }

  /**
   * DELETE /api/homes/:homeId/members/:userId
   * Leave a home (for members)
   */
  async leaveHome(homeId: string, userId: string): Promise<LeaveHomeResponse> {
    return this.request<LeaveHomeResponse>(`/api/homes/${homeId}/members/${userId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  }

  /**
   * GET /api/homes/:homeId/members
   * List all members of a home
   */
  async listHomeMembers(homeId: string): Promise<HomeMembersResponse> {
    return this.request<HomeMembersResponse>(`/api/homes/${homeId}/members`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  // =============================================================================
  // Todo Item CRUD Endpoints
  // =============================================================================

  /**
   * GET /api/homes/:homeId/todos
   * List all todo items for a home
   */
  async listTodos(homeId: string): Promise<ListTodosResponse> {
    return this.request<ListTodosResponse>(`/api/homes/${homeId}/todos`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * POST /api/homes/:homeId/todos
   * Create a new todo item
   */
  async createTodo(homeId: string, request: CreateTodoRequest): Promise<CreateTodoResponse> {
    return this.request<CreateTodoResponse>(`/api/homes/${homeId}/todos`, {
      method: 'POST',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * GET /api/homes/:homeId/todos/:todoId
   * Get details of a specific todo item
   */
  async getTodo(homeId: string, todoId: string): Promise<GetTodoResponse> {
    return this.request<GetTodoResponse>(`/api/homes/${homeId}/todos/${todoId}`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * PATCH /api/homes/:homeId/todos/:todoId
   * Update a todo item
   */
  async updateTodo(homeId: string, todoId: string, request: UpdateTodoRequest): Promise<UpdateTodoResponse> {
    return this.request<UpdateTodoResponse>(`/api/homes/${homeId}/todos/${todoId}`, {
      method: 'PATCH',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * DELETE /api/homes/:homeId/todos/:todoId
   * Delete a todo item
   */
  async deleteTodo(homeId: string, todoId: string): Promise<DeleteTodoResponse> {
    return this.request<DeleteTodoResponse>(`/api/homes/${homeId}/todos/${todoId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  }

  // =============================================================================
  // Todo Category CRUD Endpoints
  // =============================================================================

  /**
   * GET /api/homes/:homeId/todo-categories
   * List all todo categories for a home
   */
  async listTodoCategories(homeId: string): Promise<ListTodoCategoriesResponse> {
    return this.request<ListTodoCategoriesResponse>(`/api/homes/${homeId}/todo-categories`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * POST /api/homes/:homeId/todo-categories
   * Create a new todo category
   */
  async createTodoCategory(homeId: string, request: CreateTodoCategoryRequest): Promise<CreateTodoCategoryResponse> {
    return this.request<CreateTodoCategoryResponse>(`/api/homes/${homeId}/todo-categories`, {
      method: 'POST',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * GET /api/homes/:homeId/todo-categories/:categoryId
   * Get details of a specific todo category
   */
  async getTodoCategory(homeId: string, categoryId: string): Promise<GetTodoCategoryResponse> {
    return this.request<GetTodoCategoryResponse>(`/api/homes/${homeId}/todo-categories/${categoryId}`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * PATCH /api/homes/:homeId/todo-categories/:categoryId
   * Update a todo category
   */
  async updateTodoCategory(homeId: string, categoryId: string, request: UpdateTodoCategoryRequest): Promise<UpdateTodoCategoryResponse> {
    return this.request<UpdateTodoCategoryResponse>(`/api/homes/${homeId}/todo-categories/${categoryId}`, {
      method: 'PATCH',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * DELETE /api/homes/:homeId/todo-categories/:categoryId
   * Delete a todo category
   */
  async deleteTodoCategory(homeId: string, categoryId: string): Promise<DeleteTodoCategoryResponse> {
    return this.request<DeleteTodoCategoryResponse>(`/api/homes/${homeId}/todo-categories/${categoryId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  }

  // =============================================================================
  // Inventory Item CRUD Endpoints
  // =============================================================================

  /**
   * GET /api/homes/:homeId/inventory
   * List all inventory items for a home
   */
  async listInventoryItems(homeId: string): Promise<ListInventoryItemsResponse> {
    return this.request<ListInventoryItemsResponse>(`/api/homes/${homeId}/inventory`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * POST /api/homes/:homeId/inventory
   * Create a new inventory item
   */
  async createInventoryItem(homeId: string, request: CreateInventoryItemRequest): Promise<CreateInventoryItemResponse> {
    return this.request<CreateInventoryItemResponse>(`/api/homes/${homeId}/inventory`, {
      method: 'POST',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * GET /api/homes/:homeId/inventory/:inventoryId
   * Get details of a specific inventory item
   */
  async getInventoryItem(homeId: string, inventoryId: string): Promise<GetInventoryItemResponse> {
    return this.request<GetInventoryItemResponse>(`/api/homes/${homeId}/inventory/${inventoryId}`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * PATCH /api/homes/:homeId/inventory/:inventoryId
   * Update an inventory item
   */
  async updateInventoryItem(homeId: string, inventoryId: string, request: UpdateInventoryItemRequest): Promise<UpdateInventoryItemResponse> {
    return this.request<UpdateInventoryItemResponse>(`/api/homes/${homeId}/inventory/${inventoryId}`, {
      method: 'PATCH',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * DELETE /api/homes/:homeId/inventory/:inventoryId
   * Delete an inventory item
   */
  async deleteInventoryItem(homeId: string, inventoryId: string): Promise<DeleteInventoryItemResponse> {
    return this.request<DeleteInventoryItemResponse>(`/api/homes/${homeId}/inventory/${inventoryId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  }

  // =============================================================================
  // Inventory Category CRUD Endpoints
  // =============================================================================

  /**
   * GET /api/homes/:homeId/inventory-categories
   * List all inventory categories for a home
   */
  async listInventoryCategories(homeId: string): Promise<ListInventoryCategoriesResponse> {
    return this.request<ListInventoryCategoriesResponse>(`/api/homes/${homeId}/inventory-categories`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * POST /api/homes/:homeId/inventory-categories
   * Create a new inventory category
   */
  async createInventoryCategory(homeId: string, request: CreateInventoryCategoryRequest): Promise<CreateInventoryCategoryResponse> {
    return this.request<CreateInventoryCategoryResponse>(`/api/homes/${homeId}/inventory-categories`, {
      method: 'POST',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * GET /api/homes/:homeId/inventory-categories/:categoryId
   * Get details of a specific inventory category
   */
  async getInventoryCategory(homeId: string, categoryId: string): Promise<GetInventoryCategoryResponse> {
    return this.request<GetInventoryCategoryResponse>(`/api/homes/${homeId}/inventory-categories/${categoryId}`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * PATCH /api/homes/:homeId/inventory-categories/:categoryId
   * Update an inventory category
   */
  async updateInventoryCategory(homeId: string, categoryId: string, request: UpdateInventoryCategoryRequest): Promise<UpdateInventoryCategoryResponse> {
    return this.request<UpdateInventoryCategoryResponse>(`/api/homes/${homeId}/inventory-categories/${categoryId}`, {
      method: 'PATCH',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * DELETE /api/homes/:homeId/inventory-categories/:categoryId
   * Delete an inventory category
   */
  async deleteInventoryCategory(homeId: string, categoryId: string): Promise<DeleteInventoryCategoryResponse> {
    return this.request<DeleteInventoryCategoryResponse>(`/api/homes/${homeId}/inventory-categories/${categoryId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  }

  // =============================================================================
  // Location CRUD Endpoints
  // =============================================================================

  /**
   * GET /api/homes/:homeId/locations
   * List all locations for a home
   */
  async listLocations(homeId: string): Promise<ListLocationsResponse> {
    return this.request<ListLocationsResponse>(`/api/homes/${homeId}/locations`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * POST /api/homes/:homeId/locations
   * Create a new location
   */
  async createLocation(homeId: string, request: CreateLocationRequest): Promise<CreateLocationResponse> {
    return this.request<CreateLocationResponse>(`/api/homes/${homeId}/locations`, {
      method: 'POST',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * GET /api/homes/:homeId/locations/:locationId
   * Get details of a specific location
   */
  async getLocation(homeId: string, locationId: string): Promise<GetLocationResponse> {
    return this.request<GetLocationResponse>(`/api/homes/${homeId}/locations/${locationId}`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  /**
   * PATCH /api/homes/:homeId/locations/:locationId
   * Update a location
   */
  async updateLocation(homeId: string, locationId: string, request: UpdateLocationRequest): Promise<UpdateLocationResponse> {
    return this.request<UpdateLocationResponse>(`/api/homes/${homeId}/locations/${locationId}`, {
      method: 'PATCH',
      body: request,
      requiresAuth: true,
    });
  }

  /**
   * DELETE /api/homes/:homeId/locations/:locationId
   * Delete a location
   */
  async deleteLocation(homeId: string, locationId: string): Promise<DeleteLocationResponse> {
    return this.request<DeleteLocationResponse>(`/api/homes/${homeId}/locations/${locationId}`, {
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
