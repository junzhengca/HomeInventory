# CluttrServer API Documentation

**Version:** 1.0.0

Home Inventory Sync Server API

**Generated:** 2026-01-30T11:56:24.470Z

## Table of Contents

- [Accounts](#accounts)
  - [GET Get account sharing permissions](#accounts-get-account-permissions)
  - [GET List all accessible accounts](#accounts-list-accessible-accounts)
  - [GET List all members of the account](#accounts-list-members)
  - [DELETE Remove a member from the account](#accounts-remove-member)
  - [PATCH Update account sharing permissions](#accounts-update-account-settings)
- [Ai](#ai)
  - [POST Recognize inventory item from image](#ai-recognize-item)
- [Auth](#auth)
  - [GET Get current authenticated user](#auth-get-current-user)
  - [POST Authenticate with Google OAuth](#auth-google-login)
  - [POST Authenticate with email and password](#auth-login)
  - [POST Create a new user account](#auth-signup)
  - [PATCH Update current user profile](#auth-update-user)
- [Images](#images)
  - [POST Upload an image to B2 storage](#images-upload-image)
- [Invitations](#invitations)
  - [POST Accept an invitation to join an account](#invitations-accept-invitation)
  - [GET Get the invitation code for the account](#invitations-get-invitation-code)
  - [POST Regenerate the invitation code](#invitations-regenerate-invitation-code)
  - [GET Validate an invitation code](#invitations-validate-invitation)
- [Sync](#sync)
  - [DELETE Delete sync data for a specific file type](#sync-delete-file-data)
  - [GET Get sync status for all file types](#sync-get-sync-status)
  - [GET Pull sync data for a specific file type](#sync-pull-file)
  - [POST Push sync data for a specific file type](#sync-push-file)


---

## Accounts

### GET /accounts/permissions

<a id="accounts-get-account-permissions"></a>

**ID:** `accounts.get_account_permissions`

**Get account sharing permissions**

Retrieves the sharing permissions for the authenticated user account. These permissions control what household members can access from this account.

**Authentication:** Required (jwt) - Requires valid JWT token

**Tags:** `Accounts`

#### Response (200)

Account permissions retrieved successfully

**Example:**

```json
{
  "canShareInventory": true,
  "canShareTodos": true
}
```

#### Error Responses

##### 401 - `UNAUTHORIZED`

Unauthorized \- invalid or expired token

**Example:**

```json
{
  "message": "Unauthorized - invalid or expired token"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`accounts.update_account_settings`](#accounts-update-account-settings)
- [`accounts.list_members`](#accounts-list-members)

### GET /accounts

<a id="accounts-list-accessible-accounts"></a>

**ID:** `accounts.list_accessible_accounts`

**List all accessible accounts**

Retrieves a list of all accounts the authenticated user can access. This includes the user own account and all household accounts they have joined.

**Authentication:** Required (jwt) - Requires valid JWT token

**Tags:** `Accounts`

#### Response (200)

Accessible accounts retrieved successfully

**Example:**

```json
{
  "accounts": [
    {
      "userId": "507f1f77bcf86cd799439011",
      "email": "me@example.com",
      "nickname": "My Account",
      "avatarUrl": "https://example.com/avatar1.jpg",
      "isOwner": true,
      "permissions": {
        "canShareInventory": true,
        "canShareTodos": true
      }
    },
    {
      "userId": "507f1f77bcf86cd799439012",
      "email": "spouse@example.com",
      "nickname": "Spouse Account",
      "avatarUrl": "https://example.com/avatar2.jpg",
      "isOwner": false,
      "permissions": {
        "canShareInventory": true,
        "canShareTodos": false
      },
      "joinedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### Error Responses

##### 401 - `UNAUTHORIZED`

Unauthorized \- invalid or expired token

**Example:**

```json
{
  "message": "Unauthorized - invalid or expired token"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`accounts.list_members`](#accounts-list-members)
- [`invitations.accept_invitation`](#invitations-accept-invitation)

### GET /accounts/members

<a id="accounts-list-members"></a>

**ID:** `accounts.list_members`

**List all members of the account**

Retrieves a list of all members in an account. Both account owners and household members can list members for any account they have access to. Without the optional `userId` query parameter, returns members of the authenticated user's own account. With `userId` (the account owner's user ID), returns members of that account if the requester is the owner or a member of that account.

**Authentication:** Required (jwt) - Requires valid JWT token

**Tags:** `Accounts`

#### Query Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `userId` | string | No | - | Account owner user ID\. When provided, list members of this account \(requester must be owner or member\)\. When omitted, list members of the authenticated user's own account\. |

#### Response (200)

Members retrieved successfully

**Example:**

```json
{
  "members": [
    {
      "id": "507f1f77bcf86cd799439011",
      "email": "owner@example.com",
      "nickname": "Account Owner",
      "avatarUrl": "https://example.com/avatar1.jpg",
      "joinedAt": "2024-01-01T00:00:00.000Z",
      "isOwner": true
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "email": "member@example.com",
      "nickname": "Household Member",
      "avatarUrl": "https://example.com/avatar2.jpg",
      "joinedAt": "2024-01-15T10:30:00.000Z",
      "isOwner": false
    }
  ]
}
```

#### Error Responses

##### 401 - `UNAUTHORIZED`

Unauthorized \- invalid or expired token

**Example:**

```json
{
  "message": "Unauthorized - invalid or expired token"
}
```

##### 403 - `FORBIDDEN`

You don't have access to this account

Returned when userId is provided and the requester is neither the account owner nor a member of that account\.

**Example:**

```json
{
  "message": "You don't have access to this account"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`accounts.get_account_permissions`](#accounts-get-account-permissions)
- [`accounts.remove_member`](#accounts-remove-member)

### DELETE /accounts/members/:memberId

<a id="accounts-remove-member"></a>

**ID:** `accounts.remove_member`

**Remove a member from the account**

Removes a household member from an account. Only the account owner can remove other members (no query parameter). Users can remove themselves (leave an account) by setting memberId to their own ID and providing the account ID in the userId query parameter.

**Authentication:** Required (jwt) - Requires valid JWT token

**Tags:** `Accounts`

#### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `memberId` | string | Yes | ID of the member to remove, or your own ID to leave an account |

#### Query Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `userId` | string | No | - | Required when removing yourself \(leaving\); ID of the account to leave\. |

#### Response (200)

Member removed successfully

**Example:**

```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

#### Error Responses

##### 400 - `USERID_REQUIRED_TO_LEAVE`

To leave an account, specify the account ID \(userId query parameter\)

When removing yourself \(memberId equals your ID\), userId query parameter is required

**Example:**

```json
{
  "message": "To leave an account, specify the account ID (userId query parameter)"
}
```

##### 400 - `CANNOT_LEAVE_OWN_ACCOUNT`

Cannot leave your own account

The account ID in userId cannot be your own user ID

**Example:**

```json
{
  "message": "Cannot leave your own account"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized \- invalid or expired token

**Example:**

```json
{
  "message": "Unauthorized - invalid or expired token"
}
```

##### 403 - `FORBIDDEN`

You don't have access to this account

When leaving, the user is not a member of the specified account

**Example:**

```json
{
  "message": "You don't have access to this account"
}
```

##### 404 - `MEMBER_NOT_FOUND`

Member not found

The specified member is not in this account

**Example:**

```json
{
  "message": "Member not found"
}
```

##### 404 - `NOT_MEMBER_OF_ACCOUNT`

You are not a member of this account

When leaving, no membership exists for the specified account

**Example:**

```json
{
  "message": "You are not a member of this account"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`accounts.list_members`](#accounts-list-members)
- [`accounts.list_accessible_accounts`](#accounts-list-accessible-accounts)

### PATCH /accounts/settings

<a id="accounts-update-account-settings"></a>

**ID:** `accounts.update_account_settings`

**Update account sharing permissions**

Updates the sharing permissions for the authenticated user account. These permissions control what household members can access from this account.

**Authentication:** Required (jwt) - Requires valid JWT token

**Tags:** `Accounts`

#### Request Body

**Content-Type:** `application/json`

Account permission settings to update (all fields optional)

**Required:** No

**Example:**

```json
{
  "canShareInventory": true,
  "canShareTodos": false
}
```

#### Response (200)

Account settings updated successfully

**Example:**

```json
{
  "canShareInventory": true,
  "canShareTodos": false
}
```

#### Error Responses

##### 401 - `UNAUTHORIZED`

Unauthorized \- invalid or expired token

**Example:**

```json
{
  "message": "Unauthorized - invalid or expired token"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`accounts.get_account_permissions`](#accounts-get-account-permissions)
- [`accounts.list_members`](#accounts-list-members)


---

## Ai

### POST /ai/recognize-item

<a id="ai-recognize-item"></a>

**ID:** `ai.recognize_item`

**Recognize inventory item from image**

Uses AI to analyze an image and extract structured inventory item data. Returns item name, status, price, amount, and other relevant fields.

**Authentication:** This endpoint does NOT require authentication.

**Supported image formats:** JPEG, PNG, GIF, WebP (base64 encoded)

**Authentication:** Not required

**Tags:** `AI`

#### Request Body

**Content-Type:** `application/json`

Image data for item recognition

**Required:** Yes

**Example:**

```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCE..."
}
```

#### Response (200)

Item recognized successfully

**Example:**

```json
{
  "success": true,
  "item": {
    "id": "temp-123",
    "name": "Organic Milk",
    "status": "using",
    "price": 4.99,
    "amount": 1,
    "warningThreshold": 2,
    "expiryDate": "2024-02-01T00:00:00.000Z",
    "purchaseDate": "2024-01-15T00:00:00.000Z"
  }
}
```

#### Error Responses

##### 400 - `NO_IMAGE_PROVIDED`

Image is required

The request must include a base64\-encoded image

**Example:**

```json
{
  "success": false,
  "error": "Image is required"
}
```

##### 500 - `AI_SERVICE_ERROR`

Failed to recognize item

The AI service returned an error or invalid response

**Example:**

```json
{
  "success": false,
  "error": "Failed to recognize item"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

An unexpected error occurred on the server

**Example:**

```json
{
  "success": false,
  "error": "Internal server error"
}
```


---

## Auth

### GET /auth/me

<a id="auth-get-current-user"></a>

**ID:** `auth.get_current_user`

**Get current authenticated user**

Retrieves information about the currently authenticated user. The user is identified via the JWT token in the Authorization header.

**Authentication:** Required (jwt) - Requires valid JWT token from login/signup/google_login

**Tags:** `Authentication`

#### Headers

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `Authorization` | string | Yes | JWT bearer token \(format: Bearer <token>\) |

#### Response (200)

User information retrieved successfully

**Example:**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "nickname": "John Doe",
  "avatarUrl": "https://example.com/avatar.jpg",
  "invitationCode": "AB12CD34EF56GH78",
  "accountSettings": {
    "canShareInventory": true,
    "canShareTodos": true
  },
  "memberships": [
    {
      "accountId": "507f1f77bcf86cd799439012",
      "joinedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### Error Responses

##### 401 - `UNAUTHORIZED`

Unauthorized \- invalid or expired token

The JWT token is missing, invalid, or has expired

**Example:**

```json
{
  "message": "Unauthorized - invalid or expired token"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

An unexpected error occurred on the server

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`auth.update_user`](#auth-update-user)
- [`auth.login`](#auth-login)
- [`auth.signup`](#auth-signup)

### POST /auth/google

<a id="auth-google-login"></a>

**ID:** `auth.google_login`

**Authenticate with Google OAuth**

Authenticates a user using their Google account via ID Token verification. The mobile app handles the Google Sign-In flow and sends the ID token to the server.

**Platform-specific client IDs are required** and must match the platform sending the request.

If the Google account is not linked to an existing user, a new account will be created automatically.

**Authentication:** Not required

**Tags:** `Authentication`

#### Request Body

**Content-Type:** `application/json`

Google ID Token and platform information

**Required:** Yes

**Example:**

```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE...token from Google",
  "platform": "ios"
}
```

#### Response (200)

Authentication successful

**Example:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@gmail.com",
    "nickname": "John Doe",
    "avatarUrl": "https://lh3.googleusercontent.com/..."
  }
}
```

#### Error Responses

##### 400 - `VALIDATION_ERROR`

ID token and platform are required

Both idToken and platform must be provided in the request body

**Example:**

```json
{
  "message": "ID token and platform are required"
}
```

##### 401 - `INVALID_TOKEN`

Invalid Google ID token

The provided ID token is invalid or expired

**Example:**

```json
{
  "message": "Invalid Google ID token"
}
```

##### 401 - `WRONG_PLATFORM`

Token issued for wrong platform

The ID token was issued for a different platform than specified

**Example:**

```json
{
  "message": "Token issued for wrong platform"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

An unexpected error occurred on the server

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`auth.signup`](#auth-signup)
- [`auth.login`](#auth-login)
- [`auth.get_current_user`](#auth-get-current-user)

### POST /auth/login

<a id="auth-login"></a>

**ID:** `auth.login`

**Authenticate with email and password**

Authenticates a user using their email and password. Returns a JWT access token that can be used for authenticated requests.

**Authentication:** Not required

**Tags:** `Authentication`

#### Request Body

**Content-Type:** `application/json`

User login credentials

**Required:** Yes

**Example:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Response (200)

Authentication successful

**Example:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "nickname": "User",
    "avatarUrl": "https://example.com/avatar.jpg"
  }
}
```

#### Error Responses

##### 400 - `VALIDATION_ERROR`

Email and password are required

Both email and password must be provided

**Example:**

```json
{
  "message": "Email and password are required"
}
```

##### 401 - `INVALID_CREDENTIALS`

Invalid email or password

The provided credentials are incorrect

**Example:**

```json
{
  "message": "Invalid email or password"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

An unexpected error occurred on the server

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`auth.signup`](#auth-signup)
- [`auth.google_login`](#auth-google-login)
- [`auth.get_current_user`](#auth-get-current-user)

### POST /auth/signup

<a id="auth-signup"></a>

**ID:** `auth.signup`

**Create a new user account**

Registers a new user with email and password. The password must be at least 6 characters long. Returns a JWT access token upon successful registration.

**Note:** If you prefer Google authentication, use the `/auth/google` endpoint instead.

**Authentication:** Not required

**Tags:** `Authentication`

#### Request Body

**Content-Type:** `application/json`

User registration details

**Required:** Yes

**Example:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Response (201)

User successfully created

**Example:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MGYxZjc3YmNmODZjZDc5OTQzOTAxMSIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2MzI1NDIyfQ.signature",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com"
  }
}
```

#### Error Responses

##### 400 - `VALIDATION_ERROR`

Invalid input

Email and password are required, or password is too short \(minimum 6 characters\)

**Example:**

```json
{
  "message": "Email and password are required"
}
```

##### 409 - `USER_EXISTS`

User already exists

An account with this email address already exists

**Example:**

```json
{
  "message": "User already exists"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

An unexpected error occurred on the server

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`auth.login`](#auth-login)
- [`auth.google_login`](#auth-google-login)

### PATCH /auth/me

<a id="auth-update-user"></a>

**ID:** `auth.update_user`

**Update current user profile**

Updates the authenticated user profile. Supports updating nickname, avatar URL, and password. To change the password, the current password must be provided.

**Authentication:** Required (jwt) - Requires valid JWT token from login/signup/google_login

**Tags:** `Authentication`

#### Headers

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `Authorization` | string | Yes | JWT bearer token \(format: Bearer <token>\) |

#### Request Body

**Content-Type:** `application/json`

User profile updates (all fields optional)

**Required:** No

**Example:**

```json
{
  "nickname": "John Doe",
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

#### Response (200)

User profile updated successfully

**Example:**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "nickname": "John Doe",
  "avatarUrl": "https://example.com/new-avatar.jpg",
  "accountSettings": {
    "canShareInventory": true,
    "canShareTodos": true
  }
}
```

#### Error Responses

##### 400 - `INVALID_PASSWORD`

New password must be at least 6 characters

The new password does not meet the minimum length requirement

**Example:**

```json
{
  "message": "New password must be at least 6 characters"
}
```

##### 401 - `WRONG_PASSWORD`

Current password is incorrect

The provided current password does not match the stored password

**Example:**

```json
{
  "message": "Current password is incorrect"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized \- invalid or expired token

The JWT token is missing, invalid, or has expired

**Example:**

```json
{
  "message": "Unauthorized - invalid or expired token"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

An unexpected error occurred on the server

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`auth.get_current_user`](#auth-get-current-user)
- [`auth.login`](#auth-login)


---

## Images

### POST /images/upload

<a id="images-upload-image"></a>

**ID:** `images.upload_image`

**Upload an image to B2 storage**

Uploads an image file to Backblaze B2 cloud storage and returns the public URL. Supported formats: JPEG, PNG, GIF, WebP. Maximum file size: 10MB.

**Authentication:** Required (jwt) - Requires valid JWT token

**Tags:** `Images`

#### File Upload

**Parameter Name:** `image`

Image file to upload

**Max File Size:** 10MB

**Allowed MIME Types:** `image/jpeg`, `image/png`, `image/gif`, `image/webp`

#### Response (200)

Image uploaded successfully

**Example:**

```json
{
  "url": "https://f005.backblazeb2.com/file/bucket-name/images/photo-123.jpg"
}
```

#### Error Responses

##### 400 - `NO_FILE_UPLOADED`

No file uploaded

The request did not include a file

**Example:**

```json
{
  "message": "No file uploaded"
}
```

##### 400 - `FILE_TOO_LARGE`

File size exceeds maximum allowed size

The uploaded file is larger than 10MB

**Example:**

```json
{
  "message": "File size exceeds maximum allowed size"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized \- invalid or expired token

**Example:**

```json
{
  "message": "Unauthorized - invalid or expired token"
}
```

##### 500 - `UPLOAD_ERROR`

Failed to upload image

An error occurred while uploading to B2 storage

**Example:**

```json
{
  "message": "Failed to upload image"
}
```


---

## Invitations

### POST /invitations/:code/accept

<a id="invitations-accept-invitation"></a>

**ID:** `invitations.accept_invitation`

**Accept an invitation to join an account**

Accepts an invitation and adds the authenticated user to the target account as a household member.

**Authentication:** Required (jwt) - Requires valid JWT token

**Tags:** `Invitations`

#### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `code` | string | Yes | 16\-character invitation code |

#### Response (200)

Invitation accepted successfully

**Example:**

```json
{
  "success": true,
  "message": "Successfully joined the account"
}
```

#### Error Responses

##### 400 - `ALREADY_MEMBER`

Already a member of this account

The user is already a member of the target account

**Example:**

```json
{
  "message": "Already a member of this account"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized \- invalid or expired token

**Example:**

```json
{
  "message": "Unauthorized - invalid or expired token"
}
```

##### 404 - `INVALID_INVITATION_CODE`

Invalid invitation code

The invitation code does not exist or has expired

**Example:**

```json
{
  "message": "Invalid invitation code"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`invitations.validate_invitation`](#invitations-validate-invitation)
- [`accounts.list_accessible_accounts`](#accounts-list-accessible-accounts)

### GET /invitations/code

<a id="invitations-get-invitation-code"></a>

**ID:** `invitations.get_invitation_code`

**Get the invitation code for the account**

Retrieves the invitation code for the authenticated user account. This code can be shared with others to invite them to join the household.

**Authentication:** Required (jwt) - Requires valid JWT token

**Tags:** `Invitations`

#### Response (200)

Invitation code retrieved successfully

**Example:**

```json
{
  "invitationCode": "AB12CD34EF56GH78",
  "settings": {
    "canShareInventory": true,
    "canShareTodos": true
  },
  "memberCount": 3,
  "inviter": {
    "nickname": "John Doe",
    "avatarUrl": "https://example.com/avatars/john-doe.jpg"
  }
}
```

#### Error Responses

##### 401 - `UNAUTHORIZED`

Unauthorized \- invalid or expired token

**Example:**

```json
{
  "message": "Unauthorized - invalid or expired token"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`invitations.regenerate_invitation_code`](#invitations-regenerate-invitation-code)
- [`invitations.validate_invitation`](#invitations-validate-invitation)

### POST /invitations/code/regenerate

<a id="invitations-regenerate-invitation-code"></a>

**ID:** `invitations.regenerate_invitation_code`

**Regenerate the invitation code**

Generates a new invitation code for the authenticated user account. The old code will become invalid. Use this after sharing the code with unwanted recipients or for security reasons.

**Authentication:** Required (jwt) - Requires valid JWT token

**Tags:** `Invitations`

#### Response (200)

Invitation code regenerated successfully

**Example:**

```json
{
  "code": "ZY98XW76VU54TR32",
  "accountEmail": "household@example.com",
  "permissions": {
    "canShareInventory": true,
    "canShareTodos": true
  }
}
```

#### Error Responses

##### 401 - `UNAUTHORIZED`

Unauthorized \- invalid or expired token

**Example:**

```json
{
  "message": "Unauthorized - invalid or expired token"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`invitations.get_invitation_code`](#invitations-get-invitation-code)
- [`invitations.validate_invitation`](#invitations-validate-invitation)

### GET /invitations/:code

<a id="invitations-validate-invitation"></a>

**ID:** `invitations.validate_invitation`

**Validate an invitation code**

Validates an invitation code and returns the account information and permissions. Use this to show the user what account they are joining before accepting the invitation.

**Authentication:** Not required

**Tags:** `Invitations`

#### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `code` | string | Yes | 16\-character invitation code |

#### Response (200)

Invitation code is valid

**Example:**

```json
{
  "valid": true,
  "accountEmail": "household@example.com",
  "nickname": "John",
  "avatarUrl": "https://example.com/avatar.jpg",
  "permissions": {
    "canShareInventory": true,
    "canShareTodos": true
  }
}
```

#### Error Responses

##### 404 - `INVALID_INVITATION_CODE`

Invalid invitation code

The invitation code does not exist or has expired

**Example:**

```json
{
  "valid": false,
  "message": "Invalid invitation code"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`invitations.accept_invitation`](#invitations-accept-invitation)
- [`invitations.get_invitation_code`](#invitations-get-invitation-code)


---

## Sync

### DELETE /sync/:fileType/data

<a id="sync-delete-file-data"></a>

**ID:** `sync.delete_file_data`

**Delete sync data for a specific file type**

Deletes all sync data for a given file type from the server. This operation cannot be undone. Use with caution.

**Supported file types:** `categories`, `locations`, `inventoryItems`, `todoItems`, `settings`

**Cross-account access:** Pass `userId` query parameter to delete from another account. Requires membership in the target account and proper permissions.

**Permission requirements:**
- `inventoryItems`: Requires `canShareInventory: true` on target account
- `todoItems`: Requires `canShareTodos: true` on target account
- Other types: Always allowed for members
- Account owners: Always have full access regardless of permissions

**Authentication:** Required (jwt) - Requires valid JWT token from login/signup/google_login

**Tags:** `Synchronization`

#### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `fileType` | enum (categories, locations, inventoryItems, todoItems, settings) | Yes | Type of file to delete |

#### Query Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `userId` | string | No | - | Target account ID \(for cross\-account access\) |

#### Response (200)

Sync data deleted successfully

**Example:**

```json
{
  "success": true,
  "message": "All categories data has been deleted"
}
```

#### Error Responses

##### 400 - `INVALID_FILE_TYPE`

Invalid file type

The fileType must be one of the supported types

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "Invalid file type",
    "code": "INVALID_FILE_TYPE",
    "statusCode": 400
  }
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized \- invalid or expired token

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "Unauthorized - invalid or expired token",
    "code": "UNAUTHORIZED",
    "statusCode": 401
  }
}
```

##### 403 - `FORBIDDEN`

Access denied \- insufficient permissions

Thrown when trying to delete from another account without proper membership or when the target account has sharing disabled for the specific file type

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "You don't have permission to delete inventory items",
    "code": "FORBIDDEN",
    "statusCode": 403
  }
}
```

##### 404 - `ACCOUNT_NOT_FOUND`

Account not found

The target account does not exist

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "Account not found",
    "code": "ACCOUNT_NOT_FOUND",
    "statusCode": 404
  }
}
```

##### 500 - `SERVER_ERROR`

Internal server error

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "Internal server error",
    "code": "SERVER_ERROR",
    "statusCode": 500
  }
}
```

**Related Endpoints:**

- [`sync.pull_file`](#sync-pull-file)
- [`sync.push_file`](#sync-push-file)

### GET /sync/status

<a id="sync-get-sync-status"></a>

**ID:** `sync.get_sync_status`

**Get sync status for all file types**

Retrieves the sync metadata for all file types, including last sync time, device information, and total sync counts. Useful for displaying sync status in the client application.

**Authentication:** Required (jwt) - Requires valid JWT token from login/signup/google_login

**Tags:** `Synchronization`

#### Response (200)

Sync status retrieved successfully

**Example:**

```json
{
  "categories": {
    "lastSyncTime": "2024-01-15T10:30:00.000Z",
    "lastSyncedByDeviceId": "iphone-15-pro-123",
    "lastSyncedAt": "2024-01-15T10:30:00.000Z",
    "clientVersion": "1.0.0",
    "deviceName": "iPhone 15 Pro",
    "totalSyncs": 42
  },
  "locations": {
    "lastSyncTime": "2024-01-15T10:25:00.000Z",
    "lastSyncedByDeviceId": "iphone-15-pro-123",
    "lastSyncedAt": "2024-01-15T10:25:00.000Z",
    "clientVersion": "1.0.0",
    "deviceName": "iPhone 15 Pro",
    "totalSyncs": 15
  },
  "inventoryItems": {
    "lastSyncTime": "2024-01-15T10:28:00.000Z",
    "lastSyncedByDeviceId": "macbook-pro-456",
    "lastSyncedAt": "2024-01-15T10:28:00.000Z",
    "clientVersion": "1.0.0",
    "deviceName": "MacBook Pro",
    "totalSyncs": 128
  },
  "todoItems": {
    "lastSyncTime": "2024-01-15T10:20:00.000Z",
    "lastSyncedByDeviceId": "iphone-15-pro-123",
    "lastSyncedAt": "2024-01-15T10:20:00.000Z",
    "clientVersion": "1.0.0",
    "deviceName": "iPhone 15 Pro",
    "totalSyncs": 8
  },
  "settings": {
    "lastSyncTime": "2024-01-15T10:30:00.000Z",
    "lastSyncedByDeviceId": "iphone-15-pro-123",
    "lastSyncedAt": "2024-01-15T10:30:00.000Z",
    "clientVersion": "1.0.0",
    "deviceName": "iPhone 15 Pro",
    "totalSyncs": 55
  }
}
```

#### Error Responses

##### 401 - `UNAUTHORIZED`

Unauthorized \- invalid or expired token

**Example:**

```json
{
  "message": "Unauthorized - invalid or expired token"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`sync.pull_file`](#sync-pull-file)
- [`sync.push_file`](#sync-push-file)

### GET /sync/:fileType/pull

<a id="sync-pull-file"></a>

**ID:** `sync.pull_file`

**Pull sync data for a specific file type**

Retrieves the latest sync data for a given file type. Supports pulling from other accounts (household sharing) when proper permissions are granted.

**Supported file types:** `categories`, `locations`, `inventoryItems`, `todoItems`, `settings`

**Cross-account access:** Pass `userId` query parameter to pull from another account. Requires membership in the target account and proper permissions.

**Permission requirements:**
- `inventoryItems`: Requires `canShareInventory: true` on target account
- `todoItems`: Requires `canShareTodos: true` on target account
- Other types: Always allowed for members
- Account owners: Always have full access regardless of permissions

**Authentication:** Required (jwt) - Requires valid JWT token from login/signup/google_login

**Tags:** `Synchronization`

#### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `fileType` | enum (categories, locations, inventoryItems, todoItems, settings) | Yes | Type of file to sync |

#### Query Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `userId` | string | No | - | Target account ID \(for cross\-account access\) |

#### Response (200)

Sync data retrieved successfully

**Example:**

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Category 1"
    },
    {
      "id": "2",
      "name": "Category 2"
    }
  ],
  "serverTimestamp": "2024-01-15T10:30:00.000Z",
  "lastSyncTime": "2024-01-15T10:25:00.000Z"
}
```

#### Error Responses

##### 400 - `INVALID_USER_ID`

User ID is required

When using cross\-account access, userId must be provided

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "User ID is required",
    "code": "INVALID_USER_ID",
    "statusCode": 400
  }
}
```

##### 400 - `INVALID_FILE_TYPE`

Invalid file type

The fileType must be one of the supported types

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "Invalid file type",
    "code": "INVALID_FILE_TYPE",
    "statusCode": 400
  }
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized \- invalid or expired token

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "Unauthorized - invalid or expired token",
    "code": "UNAUTHORIZED",
    "statusCode": 401
  }
}
```

##### 403 - `FORBIDDEN`

Access denied \- insufficient permissions

Thrown when trying to access another account without proper membership or when the target account has sharing disabled for the specific file type

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "You don't have permission to sync inventory items",
    "code": "FORBIDDEN",
    "statusCode": 403
  }
}
```

##### 404 - `ACCOUNT_NOT_FOUND`

Account not found

The target account does not exist

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "Account not found",
    "code": "ACCOUNT_NOT_FOUND",
    "statusCode": 404
  }
}
```

##### 500 - `SERVER_ERROR`

Internal server error

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "Internal server error",
    "code": "SERVER_ERROR",
    "statusCode": 500
  }
}
```

**Related Endpoints:**

- [`sync.push_file`](#sync-push-file)
- [`sync.get_sync_status`](#sync-get-sync-status)
- [`sync.delete_file_data`](#sync-delete-file-data)

### POST /sync/:fileType/push

<a id="sync-push-file"></a>

**ID:** `sync.push_file`

**Push sync data for a specific file type**

Uploads sync data for a given file type to the server. Supports pushing to shared accounts (household sharing) when proper permissions are granted.

**Supported file types:** `categories`, `locations`, `inventoryItems`, `todoItems`, `settings`

**Cross-account access:** Pass `userId` in request body to push to another account. Requires membership in the target account and proper permissions.

**Permission requirements:**
- `inventoryItems`: Requires `canShareInventory: true` on target account
- `todoItems`: Requires `canShareTodos: true` on target account
- Other types: Always allowed for members
- Account owners: Always have full access regardless of permissions

**Authentication:** Required (jwt) - Requires valid JWT token from login/signup/google_login

**Tags:** `Synchronization`

#### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `fileType` | enum (categories, locations, inventoryItems, todoItems, settings) | Yes | Type of file to sync |

#### Request Body

**Content-Type:** `application/json`

Sync data to upload

**Required:** Yes

**Example:**

```json
{
  "version": "1.0.0",
  "deviceId": "iphone-15-pro-123",
  "syncTimestamp": "2024-01-15T10:30:00.000Z",
  "data": [
    {
      "id": "1",
      "name": "Category 1"
    },
    {
      "id": "2",
      "name": "Category 2"
    }
  ],
  "deviceName": "iPhone 15 Pro",
  "userId": "507f1f77bcf86cd799439011"
}
```

#### Response (200)

Sync data uploaded successfully

**Example:**

```json
{
  "success": true,
  "serverTimestamp": "2024-01-15T10:30:05.000Z",
  "lastSyncTime": "2024-01-15T10:30:05.000Z",
  "entriesCount": 2,
  "message": "categories synced successfully"
}
```

#### Error Responses

##### 400 - `INVALID_USER_ID`

User ID is required

When using cross\-account access, userId must be provided

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "User ID is required",
    "code": "INVALID_USER_ID",
    "statusCode": 400
  }
}
```

##### 400 - `INVALID_FILE_TYPE`

Invalid file type

The fileType must be one of the supported types

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "Invalid file type",
    "code": "INVALID_FILE_TYPE",
    "statusCode": 400
  }
}
```

##### 400 - `INVALID_DATA`

Missing required fields \(version, deviceId, syncTimestamp, data\)

Required sync fields are missing from request body

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "Missing required fields (version, deviceId, syncTimestamp, data)",
    "code": "INVALID_DATA",
    "statusCode": 400
  }
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized \- invalid or expired token

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "Unauthorized - invalid or expired token",
    "code": "UNAUTHORIZED",
    "statusCode": 401
  }
}
```

##### 403 - `FORBIDDEN`

Access denied \- insufficient permissions

Thrown when trying to push to another account without proper membership or when the target account has sharing disabled for the specific file type

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "You don't have permission to sync inventory items",
    "code": "FORBIDDEN",
    "statusCode": 403
  }
}
```

##### 404 - `ACCOUNT_NOT_FOUND`

Account not found

The target account does not exist

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "Account not found",
    "code": "ACCOUNT_NOT_FOUND",
    "statusCode": 404
  }
}
```

##### 500 - `SERVER_ERROR`

Internal server error

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "Internal server error",
    "code": "SERVER_ERROR",
    "statusCode": 500
  }
}
```

**Related Endpoints:**

- [`sync.pull_file`](#sync-pull-file)
- [`sync.get_sync_status`](#sync-get-sync-status)
- [`sync.delete_file_data`](#sync-delete-file-data)


---

---

*Documentation generated from 20 endpoints*
