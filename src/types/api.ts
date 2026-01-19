// Request types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
}

export interface GoogleAuthRequest {
  idToken: string;
  platform: 'ios' | 'android';
}

export interface UploadImageRequest {
  image: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateAvatarUrlRequest {
  avatarUrl: string;
}

export interface UpdateNicknameRequest {
  nickname: string;
}

export interface UpdateAccountSettingsRequest {
  canShareInventory?: boolean;
  canShareTodos?: boolean;
}

// Response types
export interface AuthResponse {
  accessToken: string;
  user?: User;
}

export interface User {
  id: string;
  email: string;
  nickname?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UploadImageResponse {
  url: string;
  imageId?: string;
}

export interface InvitationResponse {
  invitationCode: string;
  settings: {
    canShareInventory: boolean;
    canShareTodos: boolean;
  };
  memberCount: number;
}

export interface UpdateAccountSettingsResponse {
  settings: {
    canShareInventory: boolean;
    canShareTodos: boolean;
  };
}

export interface Member {
  id: string;
  email: string;
  nickname?: string;
  avatarUrl?: string;
  joinedAt: string;
  isOwner: boolean;
}

export interface ListMembersResponse {
  members: Member[];
}

export interface RegenerateInvitationResponse {
  invitationCode: string;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

// Generic response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// Retry attempt information
export interface RetryAttempt {
  attempt: number;
  delay: number;
  timestamp: string;
  error?: string;
}

// Error details for verbose error logging
export interface ErrorDetails {
  endpoint: string;
  method: string;
  requestBody?: unknown;
  requestHeaders?: Record<string, string>;
  status?: number;
  statusText?: string;
  responseBody?: unknown;
  errorType: 'network' | 'server';
  errorMessage: string;
  retryAttempts: RetryAttempt[];
  totalDuration: number;
  timestamp: string;
}

