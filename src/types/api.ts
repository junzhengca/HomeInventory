import { InventoryItem } from './inventory';

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

export interface RecognizeItemRequest {
  image: string;
}

// Response types
export type RecognizeItemResponse = InventoryItem;
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

export interface AccessibleAccount {
  userId: string;
  email: string;
  nickname?: string;
  avatarUrl?: string;
  isOwner: boolean;
  joinedAt: string;
  permissions?: {
    canShareInventory: boolean;
    canShareTodos: boolean;
  };
}

export interface ListAccessibleAccountsResponse {
  accounts: AccessibleAccount[];
}

export interface RegenerateInvitationResponse {
  invitationCode: string;
}

export interface ValidateInvitationResponse {
  valid: boolean;
  accountEmail?: string;
  nickname?: string;
  avatarUrl?: string;
  permissions?: {
    canShareInventory: boolean;
    canShareTodos: boolean;
  };
  message?: string;
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

// Sync Entities Types
export type EntityType = 'categories' | 'locations' | 'inventoryItems' | 'todoItems' | 'settings';

export interface SyncCheckpoint {
  lastPulledVersion: number;
}

export interface SyncEntityData {
  id: string;
  [key: string]: unknown;
}

export interface PullEntitiesRequest {
  entityType: EntityType;
  since?: string;
  includeDeleted?: boolean;
  checkpoint?: SyncCheckpoint;
  userId?: string;
}

export interface EntityChange {
  entityId: string;
  changeType: 'created' | 'updated' | 'deleted';
  data?: unknown; // The full entity data for created/updated
  deletedAt?: string;
  version: number;
  clientUpdatedAt: string;
}

export interface PullEntitiesResponse {
  success: boolean;
  changes: EntityChange[];
  serverTimestamp: string;
  latestVersion: number;
  hasMore: boolean;
}

export interface PushEntity {
  entityId: string;
  entityType: EntityType;
  homeId?: string;
  data: SyncEntityData;
  version?: number;
  clientUpdatedAt: string;
  deletedAt?: string;
}

export interface PushEntitiesRequest {
  entityType: EntityType;
  entities: PushEntity[];
  lastPulledAt?: string;
  checkpoint?: SyncCheckpoint;
  userId?: string;
}

export interface PushConflict {
  entityId: string;
  serverVersion: number;
  clientVersion: number;
  type: 'version_mismatch' | 'concurrent_modification';
}

export interface PushResult {
  entityId: string;
  status: 'success' | 'conflict' | 'error';
  serverVersion?: number;
  error?: string;
  conflict?: PushConflict;
}

export interface PushEntitiesResponse {
  success: boolean;
  results: PushResult[];
  serverTimestamp: string;
}

export interface BatchPullRequest extends Omit<PullEntitiesRequest, 'userId'> {
  // userId is common for the batch or handled per request if API allows,
  // but usually batch is for a specific context.
  // Looking at API.md: "Combined pull and push in a single request"
  // API.md shows `pullRequests` array.
}

export interface BatchPushRequest extends Omit<PushEntitiesRequest, 'userId'> {
}

export interface BatchSyncRequest {
  homeId?: string; // Corresponds to userId context usually
  deviceId: string;
  pullRequests: BatchPullRequest[];
  pushRequests: BatchPushRequest[];
}

export interface BatchSyncResponse {
  success: boolean;
  pullResults: {
    entityType: EntityType;
    entities: EntityChange[]; // API.md example uses 'entities' field which looks like changes/items
    serverTimestamp: string;
    latestVersion: number;
  }[];
  pushResults: {
    entityType: EntityType;
    results: PushResult[];
    serverTimestamp: string;
  }[];
  serverTimestamp: string;
}

export interface EntitySyncStatus {
  [entityType: string]: {
    lastSyncTime: string;
    lastSyncedByDeviceId: string;
    lastSyncedAt: string;
    totalSyncs: number;
  };
}
