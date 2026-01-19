# Household Sharing API Documentation

This document describes how household sharing works in the HomeInventoryServer application.

## Overview

The household sharing system allows users to share their inventory and todo data with other users. Each user account can act as a "household" that other users can join through invitation codes. Once joined, members can access shared data based on permissions set by the account owner.

## Core Concepts

### Account Model

Each user account represents a household and has the following sharing-related properties:

- **`invitationCode`**: A unique 16-character alphanumeric code (A-Z, 0-9) used to invite others to join the household
- **`accountSettings`**: Permissions that control what data can be shared:
  - `canShareInventory`: Whether inventory items can be synced by members
  - `canShareTodos`: Whether todo items can be synced by members
- **`memberships`**: An array of accounts this user has joined, containing:
  - `accountId`: The ID of the account/household joined
  - `joinedAt`: Timestamp when the user joined

### Key Relationships

1. **Account Owner**: The user who created the account (identified by `userId`)
2. **Members**: Users who have joined the account via invitation (stored in their `memberships` array)
3. **Access Control**: Members can access shared data based on the account owner's `accountSettings`

## API Endpoints

### Invitation Management

#### Get Invitation Code

**Endpoint**: `GET /invitations`

**Authentication**: Required

**Description**: Retrieves the current user's invitation code, account settings, and member count.

**Response**:
```json
{
  "invitationCode": "ABC123XYZ456DEF7",
  "settings": {
    "canShareInventory": true,
    "canShareTodos": false
  },
  "memberCount": 3
}
```

**Implementation**: `src/handlers/invitations/get_invitation_code.ts`

#### Regenerate Invitation Code

**Endpoint**: `POST /invitations/regenerate`

**Authentication**: Required

**Description**: Generates a new unique invitation code for the current user's account. Useful for security purposes if a code has been compromised.

**Response**:
```json
{
  "invitationCode": "NEW123CODE4567890"
}
```

**Implementation**: `src/handlers/invitations/regenerate_invitation_code.ts`

**Notes**:
- The system attempts up to 10 times to generate a unique code
- If uniqueness cannot be guaranteed, returns a 500 error

#### Validate Invitation Code

**Endpoint**: `GET /invitations/:code`

**Authentication**: Not required

**Description**: Validates an invitation code and returns information about the account it belongs to, including sharing permissions.

**Response**:
```json
{
  "valid": true,
  "accountEmail": "household@example.com",
  "permissions": {
    "canShareInventory": true,
    "canShareTodos": false
  }
}
```

**Error Responses**:
- `400`: Invalid invitation code format
- `404`: Invitation code not found

**Implementation**: `src/handlers/invitations/validate_invitation.ts`

#### Accept Invitation

**Endpoint**: `POST /invitations/:code/accept`

**Authentication**: Required

**Description**: Allows the authenticated user to join a household using an invitation code.

**Validation**:
- Invitation code must be valid format (16 alphanumeric characters)
- User cannot join their own account
- User cannot join if already a member
- Account must not exceed member limit (20 members)

**Response**:
```json
{
  "success": true,
  "account": {
    "userId": "account_user_id",
    "email": "household@example.com",
    "permissions": {
      "canShareInventory": true,
      "canShareTodos": false
    }
  }
}
```

**Error Responses**:
- `400`: Invalid invitation code format or cannot join own account
- `403`: Account has reached maximum member limit (20)
- `404`: Invalid invitation code or user not found
- `409`: Already a member of this account

**Implementation**: `src/handlers/invitations/accept_invitation.ts`

### Account Management

#### List Accessible Accounts

**Endpoint**: `GET /accounts`

**Authentication**: Required

**Description**: Returns a list of all accounts the current user can access, including:
- Their own account (marked as `isOwner: true`)
- All accounts they have joined as a member

**Response**:
```json
{
  "accounts": [
    {
      "userId": "own_user_id",
      "email": "user@example.com",
      "isOwner": true
    },
    {
      "userId": "household_user_id",
      "email": "household@example.com",
      "isOwner": false,
      "joinedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Implementation**: `src/handlers/accounts/list_accessible_accounts.ts`

#### Get Account Permissions

**Endpoint**: `GET /accounts/:userId/permissions`

**Authentication**: Required

**Description**: Retrieves the sharing permissions for a specific account. The user must have access to the account (either as owner or member).

**Response**:
```json
{
  "canShareInventory": true,
  "canShareTodos": false
}
```

**Error Responses**:
- `400`: User ID is required
- `403`: User doesn't have access to this account
- `404`: Account not found

**Implementation**: `src/handlers/accounts/get_account_permissions.ts`

#### Update Account Settings

**Endpoint**: `PATCH /accounts/settings`

**Authentication**: Required

**Description**: Updates the sharing permissions for the current user's account. Only the account owner can modify these settings.

**Request Body**:
```json
{
  "canShareInventory": true,
  "canShareTodos": false
}
```

**Note**: At least one setting must be provided.

**Response**:
```json
{
  "settings": {
    "canShareInventory": true,
    "canShareTodos": false
  }
}
```

**Implementation**: `src/handlers/accounts/update_account_settings.ts`

#### List Members

**Endpoint**: `GET /accounts/members`

**Authentication**: Required

**Description**: Returns a list of all members who have joined the current user's account. Only the account owner can list members. The account owner is not included in the list.

**Response**:
```json
{
  "members": [
    {
      "id": "member-user-id",
      "email": "member@example.com",
      "nickname": "John Doe",
      "avatarUrl": "https://example.com/avatar.jpg",
      "joinedAt": "2024-01-15T10:30:00.000Z",
      "isOwner": false
    }
  ]
}
```

**Notes**:
- Members are sorted by `joinedAt` timestamp (oldest first)
- The `isOwner` field is always `false` for members
- Returns empty array if no members exist
- All date fields are returned as ISO 8601 strings

**Error Responses**:
- `401`: Unauthorized - Missing or invalid authentication token
- `404`: Account owner not found
- `500`: Internal server error

**Implementation**: `src/handlers/accounts/list_members.ts`

#### Remove Member

**Endpoint**: `DELETE /accounts/members/:memberId`

**Authentication**: Required

**Description**: Removes a member from the current user's account. Only the account owner can remove members.

**Validation**:
- Cannot remove yourself from your own account
- Member must exist and be a member of the account

**Response**:
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

**Error Responses**:
- `400`: Member ID is required or cannot remove yourself
- `404`: Member not found or not a member of this account

**Implementation**: `src/handlers/accounts/remove_member.ts`

## Data Synchronization with Sharing

The sync endpoints (`/sync/:fileType/pull` and `/sync/:fileType/push`) support accessing shared household data.

### Pulling Shared Data

When pulling data, you can specify a `userId` query parameter to pull data from a shared account:

```
GET /sync/inventoryItems/pull?userId=household_user_id
```

**Access Control**:
1. If `userId` matches the current user's ID, access is granted (own account)
2. If `userId` differs, the system checks:
   - User must be a member of the target account (`canAccessAccount`)
   - For `inventoryItems`: Account must have `canShareInventory: true`
   - For `todoItems`: Account must have `canShareTodos: true`

**Error Responses**:
- `403`: Forbidden - User doesn't have access or permission denied
- `404`: Account not found

**Implementation**: `src/handlers/sync/pull_file.ts` (lines 57-118)

### Pushing Shared Data

Pushing data always writes to the authenticated user's own account. Members cannot push data to shared accounts - they can only pull.

## Utility Functions

### Account Helpers

Located in `src/utils/account_helpers.ts`:

- **`isMember(userId, accountId)`**: Checks if a user is a member of an account
- **`canAccessAccount(currentUserId, targetAccountId)`**: Checks if a user can access an account (either owner or member)
- **`getAccountMembersCount(userId)`**: Returns the number of members for an account
- **`checkMemberLimit(userId, limit)`**: Verifies if an account is within the member limit (default: 20)

### Invitation Code Utilities

Located in `src/utils/invitation_code.ts`:

- **`generateInvitationCode()`**: Generates a random 16-character alphanumeric code
- **`isValidInvitationCode(code)`**: Validates that a code matches the format `^[A-Z0-9]{16}$`

## Data Model

### User Schema

```typescript
{
  email: string;                    // Unique identifier
  invitationCode?: string;          // Unique invitation code (auto-generated)
  accountSettings?: {
    canShareInventory: boolean;     // Default: false
    canShareTodos: boolean;         // Default: false
  };
  memberships?: Array<{
    accountId: ObjectId;            // Reference to User account
    joinedAt: Date;                 // Timestamp of joining
  }>;
}
```

### Invitation Code Generation

- Generated automatically when a new user is created (via `UserSchema.pre('save')` hook)
- Format: 16 uppercase alphanumeric characters (A-Z, 0-9)
- Stored as unique, sparse index for efficient lookups

## Workflow Examples

### Sharing a Household

1. **Account Owner**:
   - Gets their invitation code: `GET /invitations`
   - Configures sharing permissions: `PATCH /accounts/settings` with `canShareInventory: true`
   - Shares the invitation code with family members

2. **New Member**:
   - Validates the invitation code: `GET /invitations/ABC123XYZ456DEF7`
   - Reviews the account email and permissions
   - Accepts the invitation: `POST /invitations/ABC123XYZ456DEF7/accept`
   - Now appears in their accessible accounts: `GET /accounts`

3. **Accessing Shared Data**:
   - Member lists accessible accounts: `GET /accounts`
   - Pulls shared inventory: `GET /sync/inventoryItems/pull?userId=household_user_id`
   - Can only pull data that the owner has enabled sharing for

### Managing Members

1. **View Members**:
   - Account owner checks member count via `GET /invitations` (returns `memberCount`)

2. **Remove a Member**:
   - Account owner removes member: `DELETE /accounts/members/:memberId`
   - Member loses access to the account's shared data

3. **Regenerate Invitation Code**:
   - If code is compromised: `POST /invitations/regenerate`
   - Old code becomes invalid
   - Share new code with members

## Security Considerations

1. **Invitation Codes**:
   - 16-character alphanumeric codes provide sufficient entropy
   - Codes can be regenerated if compromised
   - Validation endpoint doesn't require authentication (for UX)

2. **Access Control**:
   - All data access requires authentication
   - Members can only access accounts they've explicitly joined
   - Permission checks enforce granular sharing (inventory vs todos)

3. **Member Limits**:
   - Maximum of 20 members per account prevents abuse
   - Checked before accepting invitations

4. **Data Isolation**:
   - Members can only pull data, not push to shared accounts
   - Each user's own data remains separate
   - Account settings are only modifiable by the owner

## Error Handling

All endpoints follow consistent error response patterns:

- **400 Bad Request**: Invalid input or business rule violation
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Access denied (not a member or permission denied)
- **404 Not Found**: Resource not found
- **409 Conflict**: Already a member or duplicate operation
- **500 Internal Server Error**: Unexpected server error

## Implementation Files

### Handlers

- `src/handlers/invitations/get_invitation_code.ts`
- `src/handlers/invitations/regenerate_invitation_code.ts`
- `src/handlers/invitations/validate_invitation.ts`
- `src/handlers/invitations/accept_invitation.ts`
- `src/handlers/accounts/list_accessible_accounts.ts`
- `src/handlers/accounts/list_members.ts`
- `src/handlers/accounts/get_account_permissions.ts`
- `src/handlers/accounts/update_account_settings.ts`
- `src/handlers/accounts/remove_member.ts`

### Routes

- `src/routes/invitations.ts`
- `src/routes/accounts.ts`

### Utilities

- `src/utils/account_helpers.ts`
- `src/utils/invitation_code.ts`

### Models

- `src/models/user.ts`

### Types

- `src/types/index.ts` (contains all TypeScript interfaces)
