import { InventoryItem } from './inventory';
import { Ionicons } from '@expo/vector-icons';

// =============================================================================
// Request Types
// =============================================================================

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

// Full user profile update request
export interface UpdateUserRequest {
  nickname?: string;
  avatarUrl?: string;
  currentPassword?: string;
  newPassword?: string;
}

// =============================================================================
// Server Data Types (typed shapes of entity.data in sync responses)
// =============================================================================

export interface InventoryItemServerData {
  id: string;
  name: string;
  location: string;
  detailedLocation: string;
  status: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  warningThreshold?: number;
  batches?: {
    id: string;
    amount: number;
    unit?: string;
    expiryDate?: string;
    purchaseDate?: string;
    price?: number;
    vendor?: string;
    note?: string;
    createdAt: string;
  }[];
  categoryId?: string;
}

export interface TodoItemServerData {
  id: string;
  homeId: string;
  text: string;
  completed: boolean;
  note?: string;
  categoryId?: string;
}

export interface TodoCategoryServerData {
  id: string;
  name: string;
  homeId: string;
}

export interface CategoryServerData {
  id: string;
  name: string;
  label?: string;
  isCustom: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  homeId: string;
}

export interface LocationServerData {
  id: string;
  name: string;
  homeId: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

// =============================================================================
// Sync Request Types
// =============================================================================

export type SyncFileType = 'categories' | 'locations' | 'inventoryItems' | 'todoItems' | 'settings';

export type SyncEntityType = 'inventoryItems' | 'todoItems' | 'categories' | 'todoCategories' | 'locations' | 'settings';

export interface PushFileRequest {
  version: string;
  deviceId: string;
  syncTimestamp: string; // ISO 8601
  data: unknown[];
  deviceName?: string;
  userId?: string;
}

export interface BatchSyncPullRequest {
  entityType: SyncEntityType;
  since?: string; // ISO 8601
  includeDeleted?: boolean;
  checkpoint?: {
    lastPulledVersion?: number;
  };
}

export interface SyncEntity {
  entityId: string;
  entityType: SyncEntityType;
  homeId: string;
  data: Record<string, unknown>;
  version: number;
  clientUpdatedAt: string; // ISO 8601
  pendingCreate?: boolean;
  pendingDelete?: boolean;
}

export interface BatchSyncPushRequest {
  entityType: SyncEntityType;
  entities: SyncEntity[];
  lastPulledAt?: string; // ISO 8601
  checkpoint?: {
    lastPulledVersion?: number;
  };
}

export interface BatchSyncRequest {
  homeId: string;
  deviceId: string;
  pullRequests?: BatchSyncPullRequest[];
  pushRequests?: BatchSyncPushRequest[];
}

export interface PushEntitiesRequest {
  entities: SyncEntity[];
  lastPulledAt?: string; // ISO 8601
  checkpoint?: {
    lastPulledVersion?: number;
  };
}

// =============================================================================
// Response Types
// =============================================================================

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
  invitationCode?: string;
  accountSettings?: {
    canShareInventory: boolean;
    canShareTodos: boolean;
  };
  memberships?: {
    accountId: string;
    joinedAt: string;
  }[];
}

export interface UploadImageResponse {
  url: string;
  imageId?: string;
}

// =============================================================================
// Accounts Response Types
// =============================================================================

export interface GetAccountPermissionsResponse {
  canShareInventory: boolean;
  canShareTodos: boolean;
}

export interface UpdateAccountSettingsResponse {
  canShareInventory: boolean;
  canShareTodos: boolean;
}

export interface Member {
  userId: string;
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
  permissions?: {
    canShareInventory: boolean;
    canShareTodos: boolean;
  };
  joinedAt?: string;
}

export interface ListAccessibleAccountsResponse {
  accounts: AccessibleAccount[];
}

export interface RemoveMemberResponse {
  success: boolean;
  message: string;
}

// =============================================================================
// Invitations Response Types
// =============================================================================

export interface GetInvitationCodeResponse {
  invitationCode: string;
  settings: {
    canShareInventory: boolean;
    canShareTodos: boolean;
  };
  memberCount: number;
  inviter?: {
    nickname: string;
    avatarUrl: string;
  };
}

export interface RegenerateInvitationCodeResponse {
  code: string;
  accountEmail: string;
  permissions: {
    canShareInventory: boolean;
    canShareTodos: boolean;
  };
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

export interface AcceptInvitationResponse {
  success: boolean;
  message: string;
}

// =============================================================================
// Sync Response Types
// =============================================================================

export interface SyncFileStatus {
  lastSyncTime: string;
  lastSyncedByDeviceId: string;
  lastSyncedAt: string;
  clientVersion: string;
  deviceName: string;
  totalSyncs: number;
}

export interface SyncStatusResponse {
  categories?: SyncFileStatus;
  locations?: SyncFileStatus;
  inventoryItems?: SyncFileStatus;
  todoItems?: SyncFileStatus;
  settings?: SyncFileStatus;
}

export interface PullFileResponse<T = unknown> {
  success: boolean;
  data: T[];
  serverTimestamp: string;
  lastSyncTime: string;
}

export interface PushFileResponse {
  success: boolean;
  serverTimestamp: string;
  lastSyncTime: string;
  entriesCount: number;
  message: string;
}

export interface DeleteFileDataResponse {
  success: boolean;
  message: string;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

// =============================================================================
// Sync Entities Response Types
// =============================================================================

export interface UpdatedByInfo {
  userId: string;
  email: string;
  nickname?: string;
}

export interface SyncEntityWithMeta extends SyncEntity {
  updatedAt: string;
  updatedBy?: UpdatedByInfo;
  updatedByDeviceId?: string;
}

export interface Checkpoint {
  homeId: string;
  entityType: SyncEntityType;
  lastSyncedAt?: string;
  lastPulledVersion?: number;
  lastPushedVersion?: number;
}

export interface BatchSyncPullResult {
  entityType: SyncEntityType;
  entities: SyncEntityWithMeta[];
  deletedEntityIds: string[];
  checkpoint: Checkpoint;
}

export interface EntitySyncResult {
  entityId: string;
  status: 'created' | 'updated' | 'server_version' | 'deleted';
  winner?: 'client' | 'server';
  serverVersion?: number;
  serverUpdatedAt?: string;
  serverVersionData?: {
    data: Record<string, unknown>;
    version: number;
    updatedAt: string;
    updatedBy?: UpdatedByInfo;
  };
}

export interface BatchSyncPushResult {
  entityType: SyncEntityType;
  results: EntitySyncResult[];
  newEntitiesFromServer: SyncEntityWithMeta[];
  deletedEntityIds: string[];
  errors: { entityId: string; error: string }[];
  checkpoint: Checkpoint;
}

export interface BatchSyncResponse {
  success: boolean;
  pullResults?: BatchSyncPullResult[];
  pushResults?: BatchSyncPushResult[];
  serverTimestamp: string;
}

export interface EntitySyncStatus {
  homeId: string;
  entityType: SyncEntityType;
  lastSyncedAt: string | null;
  lastPulledVersion: number;
  lastPushedVersion: number;
  pendingLocalChanges: number;
  serverVersion: number;
  needsPull: boolean;
  needsPush: boolean;
}

export interface SyncEntitiesStatusResponse {
  success: boolean;
  status: Record<string, EntitySyncStatus>;
}

export interface PullEntitiesResponse {
  success: boolean;
  entities: SyncEntityWithMeta[];
  deletedEntityIds: string[];
  serverTimestamp: string;
  checkpoint: Checkpoint;
}

export interface PushEntitiesResponse {
  success: boolean;
  results: EntitySyncResult[];
  newEntitiesFromServer: SyncEntityWithMeta[];
  deletedEntityIds: string[];
  errors: { entityId: string; error: string }[];
  checkpoint: Checkpoint;
  serverTimestamp: string;
}

export interface ResetSyncResponse {
  success: boolean;
  message: string;
  resetEntityTypes: SyncEntityType[];
  deletedCount: number;
}

// =============================================================================
// Generic Response Wrapper
// =============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// =============================================================================
// Retry attempt information
// =============================================================================

export interface RetryAttempt {
  attempt: number;
  delay: number;
  timestamp: string;
  error?: string;
}

// =============================================================================
// Error details for verbose error logging
// =============================================================================

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

// =============================================================================
// =============================================================================
// Home Sync Response Types
// =============================================================================

export interface HomeSyncData {
  homeId: string;
  name: string;
  address?: string;
  invitationCode?: string;
  settings?: {
    canShareInventory: boolean;
    canShareTodos: boolean;
  };
  memberCount?: number;
  owner?: {
    userId: string;
    email: string;
    nickname: string;
    avatarUrl?: string;
  };
  role?: 'owner' | 'member';
  createdAt?: string;
  updatedAt?: string;
  serverUpdatedAt?: string;
}

export interface SyncHomesResponse {
  homes: HomeSyncData[];
  deletedHomeIds: string[];
  timestamp: string;
  serverTimestamp: string;
}

export interface PushHomesRequest {
  homes: {
    homeId: string;
    name: string;
    address?: string;
    clientUpdatedAt: string;
    pendingCreate?: boolean;
    pendingUpdate?: boolean;
    pendingLeave?: boolean;
    pendingJoin?: boolean;
  }[];
  lastSyncedAt?: string;
}

export interface HomeSyncResult {
  homeId: string;
  status: 'created' | 'updated' | 'server_version' | 'error' | 'deleted';
  winner?: 'client' | 'server';
  serverUpdatedAt?: string;
  serverVersion?: {
    name: string;
    address?: string;
    serverUpdatedAt: string;
  };
}

export interface PushHomesResponse {
  results: HomeSyncResult[];
  newHomesFromServer: HomeSyncData[];
  errors: {
    homeId: string;
    code: string;
    message: string;
    suggestedHomeId?: string;
  }[];
  deletedHomeIds: string[];
  serverTimestamp: string;
}
