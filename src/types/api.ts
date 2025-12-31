// Request types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
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

// Response types
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user?: User;
}

export interface User {
  id: string;
  email: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UploadImageResponse {
  url: string;
  imageId?: string;
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

