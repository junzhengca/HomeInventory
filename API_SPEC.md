# Home Inventory Server API Specification

> Complete API specification for recreating this API in Golang or other languages.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Data Models](#data-models)
4. [Endpoints](#endpoints)
5. [Error Responses](#error-responses)
6. [External Dependencies](#external-dependencies)

---

## Overview

### Base URL
```
http://localhost:3000/api
```
The port is configurable via `PORT` environment variable (default: 3000).

### API Version
No versioning in URLs. All routes are under `/api/`.

### Request Format
- **Content-Type**: `application/json` for most endpoints
- **Image Upload**: Supports both `multipart/form-data` and JSON with base64
- **JSON Body Limit**: 50MB (to accommodate base64 images)

### Response Format
- **Content-Type**: `application/json`
- **Success Response**: `{ ... }` (varies by endpoint)
- **Error Response**: See [Error Responses](#error-responses)

### HTTP Methods
- `GET` - Retrieve resources
- `POST` - Create resources or perform actions
- `PATCH` - Partial updates
- `DELETE` - Remove resources

---

## Authentication

### Overview
The API uses JWT (JSON Web Token) based authentication. Tokens are issued during signup/login and must be included in subsequent requests.

### JWT Token Format

**Algorithm**: HS256

**Payload**:
```json
{
  "userId": "string (MongoDB ObjectId as string)",
  "email": "string (user email)"
}
```

**Expiration**: 200 years (approximately 6,307,200,000 seconds from issuance)

**Secret**: Configured via `JWT_SECRET` environment variable

### Including the Token

Add the token to the `Authorization` header with the `Bearer` prefix:

```
Authorization: Bearer <access_token>
```

### Protected Endpoints

All endpoints except the following require authentication:
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/invitations/:code` (validate invitation)
- `POST /api/ai/recognize-item`

### Authentication Flow

1. **Email/Password Signup**: User provides email and password, receives access token
2. **Email/Password Login**: User provides email and password, receives access token
3. **Google OAuth**: User provides Google ID token and platform, receives access token
4. **Authenticated Requests**: Include token in Authorization header

---

## Data Models

### User

**Collection**: `users`

```typescript
{
  _id: ObjectId;                    // Auto-generated
  email: string;                    // Required, unique, indexed, lowercase, trimmed
  nickname?: string;                // Optional
  password?: string;                // Optional, bcrypt hashed, min 6 chars (only for email auth)
  googleId?: string;                // Optional, unique, sparse, indexed (only for Google auth)
  authProvider: 'email' | 'google'; // Required, default: 'email'
  avatarUrl?: string;               // Optional
  invitationCode?: string;          // Optional, unique, sparse, indexed (16-char alphanumeric)
  accountSettings: {
    canShareInventory: boolean;     // Default: false
    canShareTodos: boolean;         // Default: false
  };
  memberships: Array<{
    accountId: ObjectId;            // Ref: 'User'
    joinedAt: Date;                 // Default: Date.now
  }>;
  createdAt: Date;                  // Auto-managed
  updatedAt: Date;                  // Auto-managed
}
```

**Indexes**:
- Unique: `email`
- Unique (sparse): `googleId`
- Unique (sparse): `invitationCode`
- Index: `email`

**Pre-save Hooks**:
1. Hash password with bcrypt (salt rounds: 10) if password is modified
2. Generate invitation code if new user and no invitation code exists

### SyncData

**Collection**: `syncdatas`

```typescript
{
  _id: ObjectId;                                                 // Auto-generated
  userId: ObjectId;                                              // Required, Ref: 'User'
  fileType: 'categories' | 'locations' | 'inventoryItems' | 'todoItems' | 'settings'; // Required
  data: any;                                                     // Required (array for most types, object for settings)
  createdAt: Date;                                               // Auto-managed
  updatedAt: Date;                                               // Auto-managed
}
```

**Indexes**:
- Compound Unique: `{ userId: 1, fileType: 1 }`

**Data Structure**:
- `categories`: Array of category objects
- `locations`: Array of location objects
- `inventoryItems`: Array of inventory item objects
- `todoItems`: Array of todo item objects
- `settings`: Single settings object

### SyncMetadata

**Collection**: `syncmetadatas`

```typescript
{
  _id: ObjectId;                                                 // Auto-generated
  userId: ObjectId;                                              // Required, Ref: 'User'
  fileType: 'categories' | 'locations' | 'inventoryItems' | 'todoItems' | 'settings'; // Required
  lastSyncTime: string;                                          // Required (ISO 8601 date string)
  lastSyncedByDeviceId: string;                                  // Required
  lastSyncedAt: string;                                          // Required (ISO 8601 date string)
  clientVersion?: string;                                        // Optional
  deviceName?: string;                                           // Optional
  totalSyncs: number;                                            // Default: 0
  createdAt: Date;                                               // Auto-managed
  updatedAt: Date;                                               // Auto-managed
}
```

**Indexes**:
- Compound Unique: `{ userId: 1, fileType: 1 }`

---

## Endpoints

### 1. Authentication Endpoints

Base path: `/api/auth`

#### 1.1 Sign Up

Create a new user account with email and password.

**Endpoint**: `POST /api/auth/signup`

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "string (required)",
  "password": "string (required, min 6 characters)"
}
```

**Success Response** (201):
```json
{
  "accessToken": "string (JWT token)",
  "user": {
    "id": "string (MongoDB ObjectId)",
    "email": "string"
  }
}
```

**Error Responses**:
- `400` - Email and password are required
- `400` - Password must be at least 6 characters
- `409` - User already exists
- `500` - Internal server error

**Implementation Notes**:
- Email is stored lowercase and trimmed
- Password is hashed with bcrypt (10 salt rounds)
- Invitation code is auto-generated on user creation
- User is created with `authProvider: 'email'`

---

#### 1.2 Login

Login with email and password.

**Endpoint**: `POST /api/auth/login`

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Success Response** (200):
```json
{
  "accessToken": "string (JWT token)",
  "user": {
    "id": "string",
    "email": "string"
  }
}
```

**Error Responses**:
- `400` - Email and password are required
- `401` - Invalid credentials
- `500` - Internal server error

**Implementation Notes**:
- Email comparison is case-insensitive (stored lowercase)
- Uses bcrypt.compare() for password verification

---

#### 1.3 Google Login

Login with Google OAuth ID token.

**Endpoint**: `POST /api/auth/google`

**Authentication**: Not required

**Request Body**:
```json
{
  "idToken": "string (required, Google ID token)",
  "platform": "string (required, 'ios' or 'android')"
}
```

**Success Response** (200):
```json
{
  "accessToken": "string (JWT token)",
  "user": {
    "id": "string",
    "email": "string",
    "avatarUrl": "string (optional)"
  }
}
```

**Error Responses**:
- `400` - idToken is required
- `400` - platform is required
- `400` - platform must be 'ios' or 'android'
- `401` - Invalid Google ID token
- `401` - Invalid Google account for this email
- `500` - Internal server error

**Implementation Notes**:
- Uses Google OAuth2 Client library for ID token verification
- Platform-specific client IDs (configured via environment variables):
  - `GOOGLE_CLIENT_ID_IOS`
  - `GOOGLE_CLIENT_ID_ANDROID`
- If user exists with email but no googleId, links Google account
- If user doesn't exist, creates new user with `authProvider: 'google'`
- Stores `googleId`, `picture` as `avatarUrl`, `name` as `nickname`

---

#### 1.4 Get Current User

Get the authenticated user's information.

**Endpoint**: `GET /api/auth/me`

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <token>
```

**Success Response** (200):
```json
{
  "id": "string",
  "email": "string",
  "avatarUrl": "string (optional)",
  "nickname": "string (optional)"
}
```

**Error Responses**:
- `401` - Unauthorized (missing/invalid token)
- `404` - User not found
- `500` - Internal server error

---

#### 1.5 Update User

Update user information.

**Endpoint**: `PATCH /api/auth/me`

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "currentPassword": "string (required if changing password)",
  "newPassword": "string (required if changing password, min 6 characters)",
  "avatarUrl": "string (optional)",
  "nickname": "string (optional)"
}
```

**Success Response** (200):
```json
{
  "id": "string",
  "email": "string",
  "avatarUrl": "string (optional)",
  "nickname": "string (optional)"
}
```

**Error Responses**:
- `400` - Both currentPassword and newPassword are required to change password
- `400` - New password must be at least 6 characters
- `401` - Unauthorized (missing/invalid token)
- `401` - Current password is incorrect
- `404` - User not found
- `500` - Internal server error

**Implementation Notes**:
- Password change requires both current and new password
- New password is hashed with bcrypt before saving

---

### 2. Image Upload Endpoints

Base path: `/api/images`

#### 2.1 Upload Image

Upload an image to cloud storage (Backblaze B2).

**Endpoint**: `POST /api/images/upload`

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `resize` (optional): Width in pixels (1-10000) for image resizing

**Request Formats**:

**Option 1: Base64 (JSON)**
```json
{
  "image": "string (base64 encoded image, with or without data URI prefix)"
}
```

**Option 2: Multipart Form Data**
- Form field: `image` (file)

**Success Response** (200):
```json
{
  "url": "string (public URL of uploaded image)"
}
```

**Error Responses**:
- `400` - Invalid base64 image data
- `400` - No image provided
- `400` - Only PNG and JPG images are allowed
- `400` - Invalid resize parameter
- `401` - Unauthorized
- `500` - Failed to upload image

**Implementation Notes**:
- Allowed MIME types: `image/png`, `image/jpeg`, `image/jpg`
- Maximum file size: 25MB
- Filename: Generated using 16 random bytes (32 hex chars + extension)
- Resize parameter: If provided, resizes image to specified width (maintains aspect ratio)
- Storage: Backblaze B2 via S3-compatible API

---

### 3. Sync Endpoints

Base path: `/api/sync`

All sync endpoints require authentication.

#### 3.1 Pull Data

Pull sync data for a specific file type.

**Endpoint**: `GET /api/sync/:fileType/pull`

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <token>
```

**Path Parameters**:
- `fileType`: One of `categories`, `locations`, `inventoryItems`, `todoItems`, `settings`

**Query Parameters**:
- `userId` (optional): Target user ID to pull from (defaults to current user)

**Success Response** (200):
```json
{
  "success": true,
  "data": "any (array for most types, object for settings)",
  "serverTimestamp": "string (ISO 8601 date)",
  "lastSyncTime": "string (ISO 8601 date)"
}
```

**Error Responses**:
- `400` - User ID is required (if missing)
- `400` - File type is required
- `400` - Invalid file type
- `401` - Unauthorized
- `403` - Forbidden (no access to target account)
- `403` - You don't have permission to sync inventory items
- `403` - You don't have permission to sync todo items
- `404` - Account not found
- `500` - Internal server error

**Implementation Notes**:
- Users can always pull from their own account
- To pull from another account, user must be a member of that account
- For inventoryItems: requires `canShareInventory` permission on target account
- For todoItems: requires `canShareTodos` permission on target account
- If no sync data exists, returns empty array (or null for settings)

---

#### 3.2 Push Data

Push sync data for a specific file type.

**Endpoint**: `POST /api/sync/:fileType/push`

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <token>
```

**Path Parameters**:
- `fileType`: One of `categories`, `locations`, `inventoryItems`, `todoItems`, `settings`

**Request Body**:
```json
{
  "version": "string (required)",
  "deviceId": "string (required)",
  "syncTimestamp": "string (required, ISO 8601 date)",
  "data": "any (required)",
  "userId": "string (optional, defaults to current user)",
  "deviceName": "string (optional)"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "serverTimestamp": "string (ISO 8601 date)",
  "lastSyncTime": "string (ISO 8601 date)",
  "entriesCount": "number",
  "message": "string (e.g., 'inventoryItems synced successfully')"
}
```

**Error Responses**:
- `400` - User ID is required (if missing)
- `400` - File type is required
- `400` - Invalid file type
- `400` - Missing required fields (version, deviceId, syncTimestamp, data)
- `400` - Settings must be a single object, not an array
- `400` - Data must be an array
- `401` - Unauthorized
- `403` - Forbidden (only account owners can push data)
- `500` - Internal server error

**Implementation Notes**:
- Only account owners can push to their own account (members cannot push)
- Data replaces existing data (upsert operation)
- SyncMetadata is updated/created with device info and timestamps
- `entriesCount` is 1 for settings, array length for other types

---

#### 3.3 Get Sync Status

Get synchronization status/metadata for file types.

**Endpoint**: `GET /api/sync/status`

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `fileType` (optional): Specific file type to query
- `userId` (optional): Target user ID (defaults to current user)

**Success Response** (200):

**When fileType specified**:
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "fileType": "string",
    "lastSyncTime": "string (ISO 8601 date)",
    "lastSyncedByDeviceId": "string",
    "lastSyncedAt": "string (ISO 8601 date)",
    "clientVersion": "string (optional)",
    "deviceName": "string (optional)",
    "totalSyncs": "number"
  }
}
```

**When fileType not specified**:
```json
{
  "success": true,
  "data": {
    "categories": { ...metadata or null },
    "locations": { ...metadata or null },
    "inventoryItems": { ...metadata or null },
    "todoItems": { ...metadata or null },
    "settings": { ...metadata or null }
  }
}
```

**Error Responses**:
- `400` - Invalid file type
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Sync metadata not found for this file type (when fileType specified)
- `500` - Internal server error

---

#### 3.4 Delete File Data

Delete all sync data for a specific file type.

**Endpoint**: `DELETE /api/sync/:fileType/data`

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <token>
```

**Path Parameters**:
- `fileType`: One of `categories`, `locations`, `inventoryItems`, `todoItems`, `settings`

**Query Parameters**:
- `userId` (optional): Target user ID (defaults to current user)

**Success Response** (200):
```json
{
  "success": true,
  "message": "string ('All {fileType} data has been deleted' or 'No {fileType} data found to delete')"
}
```

**Error Responses**:
- `400` - File type is required
- `400` - Invalid file type
- `401` - Unauthorized
- `403` - Forbidden
- `500` - Internal server error

---

### 4. Invitation Endpoints

Base path: `/api/invitations`

#### 4.1 Get Invitation Code

Get or generate the current user's invitation code.

**Endpoint**: `GET /api/invitations/`

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <token>
```

**Success Response** (200):
```json
{
  "invitationCode": "string (16-character alphanumeric code)",
  "settings": {
    "canShareInventory": "boolean",
    "canShareTodos": "boolean"
  },
  "memberCount": "number"
}
```

**Error Responses**:
- `401` - Unauthorized
- `404` - User not found
- `500` - Internal server error

**Implementation Notes**:
- Returns the user's invitation code (auto-generated if doesn't exist)
- Code format: 16 characters, uppercase letters A-Z + digits 0-9

---

#### 4.2 Regenerate Invitation Code

Generate a new invitation code (replaces existing).

**Endpoint**: `POST /api/invitations/regenerate`

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <token>
```

**Success Response** (200):
```json
{
  "invitationCode": "string (new 16-character code)"
}
```

**Error Responses**:
- `401` - Unauthorized
- `404` - User not found
- `500` - Failed to generate unique invitation code
- `500` - Internal server error

**Implementation Notes**:
- Generates new unique code (retries if collision occurs)
- Old invitation code becomes invalid

---

#### 4.3 Validate Invitation Code

Validate an invitation code and check account permissions.

**Endpoint**: `GET /api/invitations/:code`

**Authentication**: Not required

**Path Parameters**:
- `code`: 16-character invitation code

**Success Response** (200):
```json
{
  "valid": true,
  "accountEmail": "string",
  "permissions": {
    "canShareInventory": "boolean",
    "canShareTodos": "boolean"
  }
}
```

**Error Responses**:
- `400` - Invitation code is required
- `400` - Invalid invitation code format (must be 16 uppercase alphanumeric chars)
- `404` - Invalid invitation code (no matching account)
- `500` - Internal server error

---

#### 4.4 Accept Invitation

Accept an invitation to join a household.

**Endpoint**: `POST /api/invitations/:code/accept`

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <token>
```

**Path Parameters**:
- `code`: 16-character invitation code

**Success Response** (200):
```json
{
  "success": true,
  "account": {
    "userId": "string",
    "email": "string",
    "permissions": {
      "canShareInventory": "boolean",
      "canShareTodos": "boolean"
    }
  }
}
```

**Error Responses**:
- `400` - Invitation code is required
- `400` - Invalid invitation code format
- `400` - Cannot join your own account
- `401` - Unauthorized
- `404` - Invalid invitation code
- `409` - Already a member of this account
- `403` - Account has reached maximum member limit (20)
- `500` - Internal server error

**Implementation Notes**:
- Adds target account to user's memberships array
- Member limit: 20 members per household
- One-way relationship (member has reference to account owner)

---

### 5. Account Endpoints

Base path: `/api/accounts`

All account endpoints require authentication.

#### 5.1 List Accessible Accounts

List all accounts the current user can access.

**Endpoint**: `GET /api/accounts/`

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <token>
```

**Success Response** (200):
```json
{
  "accounts": [
    {
      "userId": "string",
      "email": "string",
      "isOwner": "boolean",
      "joinedAt": "string (ISO 8601 date, only present for joined accounts)"
    }
  ]
}
```

**Error Responses**:
- `401` - Unauthorized
- `404` - User not found
- `500` - Internal server error

**Implementation Notes**:
- Returns user's own account (isOwner: true)
- Plus all accounts user has joined via invitations (isOwner: false)

---

#### 5.2 List Members

List all members of the current user's household (excluding owner).

**Endpoint**: `GET /api/accounts/members`

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <token>
```

**Success Response** (200):
```json
{
  "members": [
    {
      "id": "string",
      "email": "string",
      "nickname": "string (optional)",
      "avatarUrl": "string (optional)",
      "joinedAt": "string (ISO 8601 date)",
      "isOwner": "boolean"
    }
  ]
}
```

**Error Responses**:
- `401` - Unauthorized
- `404` - Account owner not found
- `500` - Internal server error

**Implementation Notes**:
- Returns members who have joined the current user's household
- Does NOT include the account owner in the list
- joinedAt is when the member accepted the invitation

---

#### 5.3 Get Account Permissions

Get sharing permissions for a specific account.

**Endpoint**: `GET /api/accounts/:userId/permissions`

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <token>
```

**Path Parameters**:
- `userId`: Target user ID (account to query)

**Success Response** (200):
```json
{
  "canShareInventory": "boolean",
  "canShareTodos": "boolean"
}
```

**Error Responses**:
- `400` - User ID is required
- `401` - Unauthorized
- `403` - You don't have access to this account
- `404` - Account not found
- `500` - Internal server error

**Implementation Notes**:
- User must have access to the target account (own or joined)
- Returns the account's sharing settings

---

#### 5.4 Update Account Settings

Update sharing permissions for the current user's household.

**Endpoint**: `PATCH /api/accounts/settings`

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "canShareInventory": "boolean (optional)",
  "canShareTodos": "boolean (optional)"
}
```

**Success Response** (200):
```json
{
  "settings": {
    "canShareInventory": "boolean",
    "canShareTodos": "boolean"
  }
}
```

**Error Responses**:
- `400` - At least one setting must be provided
- `401` - Unauthorized
- `404` - User not found
- `500` - Internal server error

**Implementation Notes**:
- Updates only the fields provided
- At least one field must be present in request body

---

#### 5.5 Remove Member

Remove a member from the current user's household.

**Endpoint**: `DELETE /api/accounts/members/:memberId`

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <token>
```

**Path Parameters**:
- `memberId`: User ID of member to remove

**Success Response** (200):
```json
{
  "success": "true",
  "message": "Member removed successfully"
}
```

**Error Responses**:
- `400` - Member ID is required
- `400` - Cannot remove yourself from your own account
- `401` - Unauthorized
- `404` - Account owner not found
- `404` - Member not found
- `404` - Member is not a member of this account
- `500` - Internal server error

**Implementation Notes**:
- Removes the member's membership reference from the target user
- Cannot remove the account owner (yourself)

---

### 6. AI Endpoints

Base path: `/api/ai`

#### 6.1 Recognize Inventory Item

Use AI to recognize and extract inventory item information from an image.

**Endpoint**: `POST /api/ai/recognize-item`

**Authentication**: Not required

**Request Body**:
```json
{
  "image": "string (base64 encoded image with optional data URI prefix)"
}
```

**Success Response** (200):
```json
{
  "id": "string (UUID v4)",
  "name": "string",
  "status": "string ('using' | 'new' | 'out-of-stock' | 'expired')",
  "price": "number (optional)",
  "amount": "number (optional)",
  "warningThreshold": "number (optional, defaults to 0)",
  "expiryDate": "string (ISO 8601 date, optional)",
  "purchaseDate": "string (ISO 8601 date, optional)",
  "createdAt": "string (ISO 8601 date, optional)",
  "updatedAt": "string (ISO 8601 date, optional)",
  "deletedAt": "string (ISO 8601 date, optional)"
}
```

**Error Responses**:
- `400` - Image is required and must be a base64 string
- `400` - Invalid base64 image format
- `400` - Unable to recognize item from image
- `500` - Failed to recognize item

**Implementation Notes**:
- Uses Gemini AI API for item recognition
- Generates UUID v4 for the item id
- The following fields are intentionally excluded from AI response:
  - `icon`
  - `iconColor`
  - `location`
  - `detailedLocation`
- Includes retry logic for rate limiting (up to 5 attempts)

---

## Error Responses

### Standard Error Format

All error responses follow this structure:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "statusCode": 400
  }
}
```

For some simpler endpoints, a plain message format is used:

```json
{
  "message": "Error description"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request |
| 401  | Unauthorized |
| 403  | Forbidden |
| 404  | Not Found |
| 409  | Conflict |
| 500  | Internal Server Error |

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or expired access token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `INVALID_FILE_TYPE` | 400 | Unsupported file type |
| `INVALID_DATA` | 400 | Invalid data structure |
| `INVALID_USER_ID` | 400 | Invalid or missing user ID |
| `ACCOUNT_NOT_FOUND` | 404 | Account not found |
| `SERVER_ERROR` | 500 | Internal server error |

---

## External Dependencies

### Database

**MongoDB** with Mongoose ODM

**Connection URI**: Configured via `MONGODB_URI` environment variable

**Collections**:
- `users`
- `syncdatas`
- `syncmetadatas`

### File Storage

**Backblaze B2** (S3-compatible API)

**Environment Variables**:
- `B2_S3_ENDPOINT`: S3 endpoint URL
- `B2_BUCKET_NAME`: Bucket name
- `AWS_ACCESS_KEY_ID`: Access key
- `AWS_SECRET_ACCESS_KEY`: Secret key

### Authentication

**Google OAuth2**

**Environment Variables**:
- `GOOGLE_CLIENT_ID_IOS`: Client ID for iOS
- `GOOGLE_CLIENT_ID_ANDROID`: Client ID for Android
- `JWT_SECRET`: Secret for JWT signing

### AI Service

**Google Gemini AI**

**Environment Variables**:
- `GEMINI_API_KEY`: API key for Gemini

**Retry Configuration**:
- Max retries: 5
- Initial delay: 1000ms
- Max delay: 60000ms
- Exponential backoff with jitter

---

## Request Logging

All requests and responses are logged with the following information:

**Request Log**:
```json
{
  "requestId": "string (UUID v4)",
  "timestamp": "string (ISO 8601)",
  "type": "REQUEST",
  "method": "string (HTTP method)",
  "path": "string",
  "url": "string",
  "query": "object",
  "headers": "object (sanitized)",
  "body": "any (sanitized, truncated if large)",
  "ip": "string"
}
```

**Response Log**:
```json
{
  "requestId": "string (UUID v4)",
  "timestamp": "string (ISO 8601)",
  "type": "RESPONSE",
  "method": "string (HTTP method)",
  "path": "string",
  "statusCode": "number",
  "duration": "string (e.g., '123ms')",
  "body": "any (sanitized, truncated if large)"
}
```

**Sanitized Fields** (redacted in logs):
- `password`
- `currentPassword`
- `newPassword`
- `token`
- `accessToken`
- `refreshToken`
- `authorization` header

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `MONGODB_URI` | Yes | - | MongoDB connection string |
| `JWT_SECRET` | Yes | your-super-secret-jwt-key | JWT signing secret |
| `GOOGLE_CLIENT_ID_IOS` | Yes | - | Google OAuth client ID for iOS |
| `GOOGLE_CLIENT_ID_ANDROID` | Yes | - | Google OAuth client ID for Android |
| `AWS_ACCESS_KEY_ID` | Yes | - | B2/S3 access key |
| `AWS_SECRET_ACCESS_KEY` | Yes | - | B2/S3 secret key |
| `B2_S3_ENDPOINT` | Yes | - | B2 S3 endpoint URL |
| `B2_BUCKET_NAME` | Yes | - | B2 bucket name |
| `GEMINI_API_KEY` | Yes | - | Gemini AI API key |

---

## Implementation Guidelines for Golang

### Key Requirements

1. **JWT Implementation**: Use HS256 algorithm, 200-year expiration
2. **Password Hashing**: Use bcrypt with salt rounds of 10
3. **Database**: Use MongoDB with official Go driver
4. **File Storage**: Use AWS SDK for Go v2 with B2 endpoint
5. **Google OAuth**: Use google.golang.org/api/oauth2/v2 for ID token verification
6. **UUID Generation**: Use google/uuid package for v4 UUIDs

### Authentication Middleware

1. Extract token from `Authorization: Bearer <token>` header
2. Verify token using HS256 with JWT_SECRET
3. Add userId and email to request context
4. Return 401 if token is missing or invalid

### Request ID Middleware

1. Generate UUID v4 for each request
2. Add to request context
3. Include in all log output
4. Track request duration

### Data Validation

1. Email: lowercase, trimmed, valid email format
2. Password: min 6 characters
3. Invitation code: exactly 16 uppercase alphanumeric characters
4. File types: only the 5 specified types
5. Image uploads: PNG/JPG only, max 25MB

### Permission Checks

Use `canAccessAccount()` logic:
- Return true if currentUserId == targetAccountId
- Otherwise, check if targetAccountId exists in user's memberships array

### Sync Data Structure

- Store as raw BSON/JSON in database
- No schema validation on `data` field
- Client is responsible for data structure
- Server only validates array vs object for settings vs others
