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

export interface AppleAuthRequest {
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

export interface LocationServerData {
  id: string;
  name: string;
  homeId: string;
  icon?: keyof typeof Ionicons.glyphMap;
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
  home?: {
    homeId: string;
    name: string;
    address: string;
    owner: {
      email: string;
      nickname: string;
    };
  };
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

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
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
// Home CRUD Types
// =============================================================================

/**
 * @deprecated Use Home from src/types/home.ts instead
 */
export interface HomeDto {
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
}

export interface ListHomesResponse {
  homes: HomeDto[];
}

export interface CreateHomeRequest {
  homeId: string;
  name: string;
  address?: string;
}

export interface CreateHomeResponse {
  home: HomeDto;
}

export interface UpdateHomeRequest {
  name?: string;
  address?: string;
}

export interface UpdateHomeResponse {
  home: HomeDto;
}

export interface GetHomeResponse {
  home: HomeDto;
}

export interface DeleteHomeResponse {
  success: boolean;
}

export interface LeaveHomeResponse {
  success: boolean;
}

export interface HomeMembersResponse {
  members: Member[];
}

// =============================================================================
// =============================================================================
// Todo Item CRUD Types
// =============================================================================

export interface TodoItemDto {
  todoId: string;
  homeId: string;
  text: string;
  completed: boolean;
  completedAt: string | null;
  position: number;
  categoryId?: string;
  note?: string;
  createdBy: string;
  updatedBy: string;
  createdByDeviceId: string | null;
  updatedByDeviceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListTodosResponse {
  todoItems: TodoItemDto[];
}

export interface CreateTodoRequest {
  todoId?: string;
  text: string;
  completed?: boolean;
  position?: number;
  categoryId?: string;
  note?: string;
}

export interface CreateTodoResponse {
  todoItem: TodoItemDto;
}

export interface UpdateTodoRequest {
  text?: string;
  completed?: boolean;
  position?: number;
  categoryId?: string;
  note?: string;
}

export interface UpdateTodoResponse {
  todoItem: TodoItemDto;
}

export interface GetTodoResponse {
  todoItem: TodoItemDto;
}

export interface DeleteTodoResponse {
  success: boolean;
  message: string;
  deletedAt: string;
}

// =============================================================================
// =============================================================================
// Todo Category CRUD Types
// =============================================================================

export interface TodoCategoryDto {
  categoryId: string;
  homeId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  position: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListTodoCategoriesResponse {
  todoCategories: TodoCategoryDto[];
}

export interface CreateTodoCategoryRequest {
  categoryId?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  position?: number;
}

export interface CreateTodoCategoryResponse {
  todoCategory: TodoCategoryDto;
}

export interface UpdateTodoCategoryRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  position?: number;
}

export interface UpdateTodoCategoryResponse {
  todoCategory: TodoCategoryDto;
}

export interface GetTodoCategoryResponse {
  todoCategory: TodoCategoryDto;
}

export interface DeleteTodoCategoryResponse {
  message: string;
  categoryId: string;
}

// =============================================================================
// =============================================================================
// Inventory Item CRUD Types
// =============================================================================

export interface InventoryItemDto {
  inventoryId: string;
  homeId: string;
  name: string;
  location?: string;
  detailedLocation?: string;
  status: string;
  icon?: string;
  iconColor?: string;
  warningThreshold?: number;
  categoryId?: string;
  batches: InventoryItemBatchDto[];
  createdBy: string;
  updatedBy: string;
  createdByDeviceId: string | null;
  updatedByDeviceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemBatchDto {
  id: string;
  amount: number;
  unit?: string;
  expiryDate?: string;
  purchaseDate?: string;
  price?: number;
  vendor?: string;
  note?: string;
  createdAt: string;
}

export interface ListInventoryItemsResponse {
  inventoryItems: InventoryItemDto[];
}

export interface CreateInventoryItemRequest {
  inventoryId?: string;
  name: string;
  location?: string;
  detailedLocation?: string;
  status?: string;
  icon?: string;
  iconColor?: string;
  warningThreshold?: number;
  categoryId?: string;
  batches?: InventoryItemBatchDto[];
}

export interface CreateInventoryItemResponse {
  inventoryItem: InventoryItemDto;
}

export interface UpdateInventoryItemRequest {
  name?: string;
  location?: string;
  detailedLocation?: string;
  status?: string;
  icon?: string;
  iconColor?: string;
  warningThreshold?: number;
  categoryId?: string;
  batches?: InventoryItemBatchDto[];
}

export interface UpdateInventoryItemResponse {
  inventoryItem: InventoryItemDto;
}

export interface GetInventoryItemResponse {
  inventoryItem: InventoryItemDto;
}

export interface DeleteInventoryItemResponse {
  success: boolean;
  message: string;
  deletedAt: string;
}

// =============================================================================
// =============================================================================
// Inventory Category CRUD Types
// =============================================================================

export interface InventoryCategoryDto {
  categoryId: string;
  homeId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isCustom?: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListInventoryCategoriesResponse {
  inventoryCategories: InventoryCategoryDto[];
}

export interface CreateInventoryCategoryRequest {
  categoryId?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface CreateInventoryCategoryResponse {
  inventoryCategory: InventoryCategoryDto;
}

export interface UpdateInventoryCategoryRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateInventoryCategoryResponse {
  inventoryCategory: InventoryCategoryDto;
}

export interface GetInventoryCategoryResponse {
  inventoryCategory: InventoryCategoryDto;
}

export interface DeleteInventoryCategoryResponse {
  message: string;
  categoryId: string;
}

// =============================================================================
// =============================================================================
// Location CRUD Types
// =============================================================================

export interface LocationDto {
  locationId: string;
  homeId: string;
  name: string;
  icon?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListLocationsResponse {
  locations: LocationDto[];
}

export interface CreateLocationRequest {
  locationId?: string;
  name: string;
  icon?: string;
}

export interface CreateLocationResponse {
  location: LocationDto;
}

export interface UpdateLocationRequest {
  name?: string;
  icon?: string;
}

export interface UpdateLocationResponse {
  location: LocationDto;
}

export interface GetLocationResponse {
  location: LocationDto;
}

export interface DeleteLocationResponse {
  message: string;
  locationId: string;
}
