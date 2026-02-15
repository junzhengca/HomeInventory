# CluttrServer API Documentation

**Version:** 1.0.0

Home Inventory Sync Server API

**Generated:** 2026-02-15T06:11:09.683Z

## Table of Contents

- [Todo Items](#todo-items)
  - [GET List all todo items for a home](#todo-items-list)
  - [POST Create a new todo item](#todo-items-create)
  - [PATCH Update a todo item](#todo-items-update)
  - [GET Get details of a specific todo item](#todo-items-get)
  - [DELETE Delete a todo item](#todo-items-delete)
- [Todo Categories](#todo-categories)
  - [DELETE Delete a todo category](#todo-categories-delete)
  - [PATCH Update a todo category](#todo-categories-update)
  - [GET List all todo categories for a home](#todo-categories-list)
  - [POST Create a new todo category](#todo-categories-create)
  - [GET Get details of a specific todo category](#todo-categories-get)
- [Auth](#auth)
  - [POST Authenticate with Google OAuth](#auth-google-login)
  - [POST Authenticate with email and password](#auth-login)
  - [PATCH Update current user profile](#auth-update-user)
  - [GET Get current authenticated user](#auth-get-current-user)
  - [POST Create a new user account](#auth-signup)
- [Images](#images)
  - [POST Upload an image to B2 storage](#images-upload-image)
- [Homes](#homes)
  - [GET List all homes for the authenticated user](#homes-list)
  - [PATCH Update home details](#homes-update)
  - [DELETE Remove a member from a home](#homes-remove-member)
  - [GET Get home invitation details](#homes-get-invitation)
  - [DELETE Delete a home](#homes-delete)
  - [GET Get details of a specific home](#homes-get)
  - [PATCH Update home sharing settings](#homes-update-settings)
  - [POST Regenerate home invitation code](#homes-regenerate-invitation)
  - [POST Create a new home](#homes-create)
  - [GET List all members of a home](#homes-list-members)
- [Ai](#ai)
  - [POST Recognize inventory item from image](#ai-recognize-item)
- [Sync Entities](#sync-entities)
  - [GET Pull entities for a home and entity type](#sync-entities-pull-entities)
  - [POST Combined pull and push in a single request](#sync-entities-batch-sync)
  - [POST Push entity changes to the server with automatic conflict resolution](#sync-entities-push-entities)
  - [DELETE Clear sync checkpoints forcing full re-sync](#sync-entities-reset-sync)
  - [GET Get sync status for entity types in a home](#sync-entities-get-sync-status)
- [Debug](#debug)
  - [GET Interactive API Debug Dashboard](#debug-get-debugz)
  - [POST Proxy requests to API endpoints](#debug-proxy-debugz-request)
  - [GET Get handler metadata for debug UI](#debug-get-debugz-api)
- [Invitations](#invitations)

---

## Todo Items

### GET /homes/:homeId/todos

<a id="todo-items-list"></a>

**ID:** `todo_items.list`

**List all todo items for a home**

Retrieves a list of all todo items for a home. User must be a member of home. Optionally filter by completion status.

**Authentication:** Required (jwt)

**Tags:** `Todo Items`

#### Path Parameters

| Name     | Type   | Required | Description                        |
| -------- | ------ | -------- | ---------------------------------- |
| `homeId` | string | Yes      | The home ID to get todo items from |

#### Response (200)

List of todo items retrieved successfully

**Example:**

```json
{
  "todoItems": [
    {
      "todoId": "buy-groceries",
      "homeId": "my-home",
      "text": "Buy groceries from the store",
      "completed": false,
      "completedAt": null,
      "position": 0,
      "categoryId": "shopping",
      "createdBy": "507f1f77bcf86cd799439011",
      "updatedBy": "507f1f77bcf86cd799439011",
      "createdByDeviceId": null,
      "updatedByDeviceId": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### Error Responses

##### 400 - `HOME_ID_REQUIRED`

homeId is required

The homeId path parameter must be provided

**Example:**

```json
{
  "error": "homeId_required",
  "message": "homeId is required"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 403 - `FORBIDDEN`

Forbidden

User is not a member of this home

**Example:**

```json
{
  "error": "forbidden",
  "message": "Not a member of this home"
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

The specified home does not exist

**Example:**

```json
{
  "error": "home_not_found",
  "message": "Home not found"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

An unexpected error occurred on server

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`todo_items.create`](#todo-items-create)
- [`todo_items.get`](#todo-items-get)
- [`todo_items.update`](#todo-items-update)
- [`todo_items.delete`](#todo-items-delete)

### POST /homes/:homeId/todos

<a id="todo-items-create"></a>

**ID:** `todo_items.create`

**Create a new todo item**

Creates a new todo item in a home. The user must be a member of home. Each todo item has a unique todoId within the home, text content, completion status, and position.

**Authentication:** Required (jwt)

**Tags:** `Todo Items`

#### Path Parameters

| Name     | Type   | Required | Description                            |
| -------- | ------ | -------- | -------------------------------------- |
| `homeId` | string | Yes      | The home ID to create the todo item in |

#### Request Body

**Content-Type:** `application/json`

Todo item creation details

**Required:** Yes

**Example:**

```json
{
  "todoId": "buy-groceries",
  "text": "Buy groceries from the store",
  "completed": false,
  "position": 0
}
```

#### Response (201)

Todo item created successfully

**Example:**

```json
{
  "todoItem": {
    "todoId": "buy-groceries",
    "homeId": "my-home",
    "text": "Buy groceries from the store",
    "completed": false,
    "completedAt": null,
    "position": 0,
    "createdBy": "507f1f77bcf86cd799439011",
    "updatedBy": "507f1f77bcf86cd799439011",
    "createdByDeviceId": null,
    "updatedByDeviceId": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses

##### 400 - `VALIDATION_ERROR`

Validation error

Invalid request parameters

**Example:**

```json
{
  "error": "todoId_required",
  "message": "todoId is required"
}
```

##### 400 - `INVALID_TODO_ID`

Invalid todoId format

todoId must be 4\-50 characters, alphanumeric with hyphens or underscores

**Example:**

```json
{
  "error": "invalid_todo_id",
  "message": "todoId must be 4-50 characters, alphanumeric with hyphens or underscores"
}
```

##### 400 - `TEXT_REQUIRED`

Text is required

Text cannot be empty

**Example:**

```json
{
  "error": "text_required",
  "message": "text is required"
}
```

##### 400 - `TEXT_TOO_LONG`

Text too long

Text must be 1000 characters or less

**Example:**

```json
{
  "error": "text_too_long",
  "message": "text must be 1000 characters or less"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 403 - `FORBIDDEN`

Forbidden

User is not a member of this home

**Example:**

```json
{
  "error": "forbidden",
  "message": "Not a member of this home"
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

The specified home does not exist

**Example:**

```json
{
  "error": "home_not_found",
  "message": "Home not found"
}
```

##### 409 - `TODO_ID_EXISTS`

Todo ID already exists

A todo with this ID already exists in this home

**Example:**

```json
{
  "error": "todo_id_exists",
  "message": "A todo with this ID already exists in this home",
  "suggestedTodoId": "buy-groceries-2"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

An unexpected error occurred on server

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`todo_items.list`](#todo-items-list)
- [`todo_items.get`](#todo-items-get)
- [`todo_items.update`](#todo-items-update)
- [`todo_items.delete`](#todo-items-delete)

### PATCH /homes/:homeId/todos/:todoId

<a id="todo-items-update"></a>

**ID:** `todo_items.update`

**Update a todo item**

Updates specific fields of an existing todo item. User must be a member of the home that contains the todo item. Only fields provided in request body will be updated. When completed status changes to true, completedAt is set. When completed changes to false, completedAt is cleared.

**Authentication:** Required (jwt)

**Tags:** `Todo Items`

#### Path Parameters

| Name     | Type   | Required | Description                             |
| -------- | ------ | -------- | --------------------------------------- |
| `homeId` | string | Yes      | The home ID that contains the todo item |
| `todoId` | string | Yes      | The unique identifier of the todo item  |

#### Request Body

**Content-Type:** `application/json`

Todo item fields to update

**Required:** Yes

**Example:**

```json
{
  "text": "Buy groceries from the store - updated",
  "completed": true
}
```

#### Response (200)

Todo item updated successfully

**Example:**

```json
{
  "todoItem": {
    "todoId": "buy-groceries",
    "homeId": "my-home",
    "text": "Buy groceries from the store - updated",
    "completed": true,
    "completedAt": "2024-01-15T11:00:00.000Z",
    "position": 0,
    "categoryId": "shopping",
    "createdBy": "507f1f77bcf86cd799439011",
    "updatedBy": "507f1f77bcf86cd799439011",
    "createdByDeviceId": null,
    "updatedByDeviceId": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

#### Error Responses

##### 400 - `TODO_ID_REQUIRED`

todoId is required

The todoId path parameter must be provided

**Example:**

```json
{
  "error": "todoId_required",
  "message": "todoId is required"
}
```

##### 400 - `INVALID_TEXT`

Invalid text

Text cannot be empty

**Example:**

```json
{
  "error": "invalid_text",
  "message": "text cannot be empty"
}
```

##### 400 - `TEXT_TOO_LONG`

Text too long

Text must be 1000 characters or less

**Example:**

```json
{
  "error": "text_too_long",
  "message": "text must be 1000 characters or less"
}
```

##### 400 - `INVALID_POSITION`

Invalid position

Position must be a non\-negative number

**Example:**

```json
{
  "error": "invalid_position",
  "message": "position must be a non-negative number"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 403 - `FORBIDDEN`

Forbidden

User is not a member of this home

**Example:**

```json
{
  "error": "forbidden",
  "message": "Not a member of this home"
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

The specified home does not exist

**Example:**

```json
{
  "error": "home_not_found",
  "message": "Home not found"
}
```

##### 404 - `TODO_NOT_FOUND`

Todo item not found

No todo item exists with the provided todoId

**Example:**

```json
{
  "error": "todo_not_found",
  "message": "Todo item not found"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

An unexpected error occurred on server

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`todo_items.create`](#todo-items-create)
- [`todo_items.list`](#todo-items-list)
- [`todo_items.get`](#todo-items-get)
- [`todo_items.delete`](#todo-items-delete)

### GET /homes/:homeId/todos/:todoId

<a id="todo-items-get"></a>

**ID:** `todo_items.get`

**Get details of a specific todo item**

Retrieves detailed information about a specific todo item. User must be a member of the home that contains the todo item.

**Authentication:** Required (jwt)

**Tags:** `Todo Items`

#### Path Parameters

| Name     | Type   | Required | Description                             |
| -------- | ------ | -------- | --------------------------------------- |
| `homeId` | string | Yes      | The home ID that contains the todo item |
| `todoId` | string | Yes      | The unique identifier of the todo item  |

#### Response (200)

Todo item details retrieved successfully

**Example:**

```json
{
  "todoItem": {
    "todoId": "buy-groceries",
    "homeId": "my-home",
    "text": "Buy groceries from the store",
    "completed": false,
    "completedAt": null,
    "position": 0,
    "categoryId": "shopping",
    "createdBy": "507f1f77bcf86cd799439011",
    "updatedBy": "507f1f77bcf86cd799439011",
    "createdByDeviceId": null,
    "updatedByDeviceId": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses

##### 400 - `HOME_ID_REQUIRED`

homeId is required

The homeId path parameter must be provided

**Example:**

```json
{
  "error": "homeId_required",
  "message": "homeId is required"
}
```

##### 400 - `TODO_ID_REQUIRED`

todoId is required

The todoId path parameter must be provided

**Example:**

```json
{
  "error": "todoId_required",
  "message": "todoId is required"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 403 - `FORBIDDEN`

Forbidden

User is not a member of this home

**Example:**

```json
{
  "error": "forbidden",
  "message": "Not a member of this home"
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

The specified home does not exist

**Example:**

```json
{
  "error": "home_not_found",
  "message": "Home not found"
}
```

##### 404 - `TODO_NOT_FOUND`

Todo item not found

No todo item exists with the provided todoId

**Example:**

```json
{
  "error": "todo_not_found",
  "message": "Todo item not found"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

An unexpected error occurred on server

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`todo_items.create`](#todo-items-create)
- [`todo_items.list`](#todo-items-list)
- [`todo_items.update`](#todo-items-update)
- [`todo_items.delete`](#todo-items-delete)

### DELETE /homes/:homeId/todos/:todoId

<a id="todo-items-delete"></a>

**ID:** `todo_items.delete`

**Delete a todo item**

Soft deletes a todo item by setting deletedAt and deletedBy fields. User must be a member of the home that contains the todo item. The todo item remains in the database but is excluded from queries.

**Authentication:** Required (jwt)

**Tags:** `Todo Items`

#### Path Parameters

| Name     | Type   | Required | Description                             |
| -------- | ------ | -------- | --------------------------------------- |
| `homeId` | string | Yes      | The home ID that contains the todo item |
| `todoId` | string | Yes      | The unique identifier of the todo item  |

#### Response (200)

Todo item deleted successfully

**Example:**

```json
{
  "success": true,
  "message": "Todo item deleted successfully",
  "deletedAt": "2024-01-15T11:00:00.000Z"
}
```

#### Error Responses

##### 400 - `TODO_ID_REQUIRED`

todoId is required

The todoId path parameter must be provided

**Example:**

```json
{
  "error": "todoId_required",
  "message": "todoId is required"
}
```

##### 400 - `HOME_ID_REQUIRED`

homeId is required

The homeId path parameter must be provided

**Example:**

```json
{
  "error": "homeId_required",
  "message": "homeId is required"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 403 - `FORBIDDEN`

Forbidden

User is not a member of this home

**Example:**

```json
{
  "error": "forbidden",
  "message": "Not a member of this home"
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

The specified home does not exist

**Example:**

```json
{
  "error": "home_not_found",
  "message": "Home not found"
}
```

##### 404 - `TODO_NOT_FOUND`

Todo item not found

No todo item exists with the provided todoId

**Example:**

```json
{
  "error": "todo_not_found",
  "message": "Todo item not found"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

An unexpected error occurred on server

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`todo_items.create`](#todo-items-create)
- [`todo_items.list`](#todo-items-list)
- [`todo_items.get`](#todo-items-get)
- [`todo_items.update`](#todo-items-update)

---

## Todo Categories

### DELETE /homes/:homeId/todoCategories/:categoryId

<a id="todo-categories-delete"></a>

**ID:** `todo_categories.delete`

**Delete a todo category**

Soft deletes a todo category by setting deletedAt and deletedBy fields. User must be a member of the home that contains the category. The category remains in the database but is excluded from queries.

**Authentication:** Required (jwt)

**Tags:** `Todo Categories`

#### Path Parameters

| Name         | Type   | Required | Description                                |
| ------------ | ------ | -------- | ------------------------------------------ |
| `homeId`     | string | Yes      | The home ID that contains the category     |
| `categoryId` | string | Yes      | The unique identifier of the todo category |

#### Response (200)

Todo category deleted successfully

**Example:**

```json
{
  "message": "Todo category deleted successfully",
  "categoryId": "shopping"
}
```

#### Error Responses

##### 400 - `CATEGORY_ID_REQUIRED`

categoryId is required

The categoryId path parameter must be provided

**Example:**

```json
{
  "error": "categoryId_required",
  "message": "categoryId is required"
}
```

##### 400 - `HOME_ID_REQUIRED`

homeId is required

The homeId path parameter must be provided

**Example:**

```json
{
  "error": "homeId_required",
  "message": "homeId is required"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 403 - `FORBIDDEN`

Forbidden

User is not a member of this home

**Example:**

```json
{
  "error": "forbidden",
  "message": "Not a member of this home"
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

The specified home does not exist

**Example:**

```json
{
  "error": "home_not_found",
  "message": "Home not found"
}
```

##### 404 - `CATEGORY_NOT_FOUND`

Todo category not found

No todo category exists with the provided categoryId

**Example:**

```json
{
  "error": "category_not_found",
  "message": "Todo category not found"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

An unexpected error occurred on server

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`todo_categories.create`](#todo-categories-create)
- [`todo_categories.list`](#todo-categories-list)
- [`todo_categories.get`](#todo-categories-get)
- [`todo_categories.update`](#todo-categories-update)

### PATCH /homes/:homeId/todoCategories/:categoryId

<a id="todo-categories-update"></a>

**ID:** `todo_categories.update`

**Update a todo category**

Updates specific fields of an existing todo category. User must be a member of the home that contains the category. Only fields provided in request body will be updated.

**Authentication:** Required (jwt)

**Tags:** `Todo Categories`

#### Path Parameters

| Name         | Type   | Required | Description                                |
| ------------ | ------ | -------- | ------------------------------------------ |
| `homeId`     | string | Yes      | The home ID that contains the category     |
| `categoryId` | string | Yes      | The unique identifier of the todo category |

#### Request Body

**Content-Type:** `application/json`

Todo category fields to update

**Required:** Yes

**Example:**

```json
{
  "name": "Shopping List",
  "color": "#3498db"
}
```

#### Response (200)

Todo category updated successfully

**Example:**

```json
{
  "todoCategory": {
    "categoryId": "shopping",
    "homeId": "my-home",
    "name": "Shopping List",
    "description": "Groceries and household items",
    "color": "#3498db",
    "icon": "cart",
    "position": 0,
    "createdBy": "507f1f77bcf86cd799439011",
    "updatedBy": "507f1f77bcf86cd799439011",
    "createdByDeviceId": null,
    "updatedByDeviceId": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

#### Error Responses

##### 400 - `CATEGORY_ID_REQUIRED`

categoryId is required

The categoryId path parameter must be provided

**Example:**

```json
{
  "error": "categoryId_required",
  "message": "categoryId is required"
}
```

##### 400 - `NAME_REQUIRED`

Name is required

Name cannot be empty

**Example:**

```json
{
  "error": "name_required",
  "message": "name cannot be empty"
}
```

##### 400 - `NAME_TOO_LONG`

Name too long

Name must be 100 characters or less

**Example:**

```json
{
  "error": "name_too_long",
  "message": "name must be 100 characters or less"
}
```

##### 400 - `DESCRIPTION_TOO_LONG`

Description too long

Description must be 500 characters or less

**Example:**

```json
{
  "error": "description_too_long",
  "message": "description must be 500 characters or less"
}
```

##### 400 - `INVALID_COLOR`

Invalid color format

Color must be a valid hex color code

**Example:**

```json
{
  "error": "invalid_color",
  "message": "color must be a valid hex color code (e.g., #FF5733)"
}
```

##### 400 - `ICON_TOO_LONG`

Icon too long

Icon must be 50 characters or less

**Example:**

```json
{
  "error": "icon_too_long",
  "message": "icon must be 50 characters or less"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 403 - `FORBIDDEN`

Forbidden

User is not a member of this home

**Example:**

```json
{
  "error": "forbidden",
  "message": "Not a member of this home"
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

The specified home does not exist

**Example:**

```json
{
  "error": "home_not_found",
  "message": "Home not found"
}
```

##### 404 - `CATEGORY_NOT_FOUND`

Todo category not found

No todo category exists with the provided categoryId

**Example:**

```json
{
  "error": "category_not_found",
  "message": "Todo category not found"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

An unexpected error occurred on server

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`todo_categories.create`](#todo-categories-create)
- [`todo_categories.list`](#todo-categories-list)
- [`todo_categories.get`](#todo-categories-get)
- [`todo_categories.delete`](#todo-categories-delete)

### GET /homes/:homeId/todoCategories

<a id="todo-categories-list"></a>

**ID:** `todo_categories.list`

**List all todo categories for a home**

Retrieves a list of all todo categories for a home. User must be a member of the home. Categories are ordered by position.

**Authentication:** Required (jwt)

**Tags:** `Todo Categories`

#### Path Parameters

| Name     | Type   | Required | Description                             |
| -------- | ------ | -------- | --------------------------------------- |
| `homeId` | string | Yes      | The home ID to get todo categories from |

#### Response (200)

List of todo categories retrieved successfully

**Example:**

```json
{
  "todoCategories": [
    {
      "categoryId": "shopping",
      "homeId": "my-home",
      "name": "Shopping",
      "description": "Groceries and household items",
      "color": "#FF5733",
      "icon": "cart",
      "position": 0,
      "createdBy": "507f1f77bcf86cd799439011",
      "updatedBy": "507f1f77bcf86cd799439011",
      "createdByDeviceId": null,
      "updatedByDeviceId": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### Error Responses

##### 400 - `HOME_ID_REQUIRED`

homeId is required

The homeId path parameter must be provided

**Example:**

```json
{
  "error": "homeId_required",
  "message": "homeId is required"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 403 - `FORBIDDEN`

Forbidden

User is not a member of this home

**Example:**

```json
{
  "error": "forbidden",
  "message": "Not a member of this home"
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

The specified home does not exist

**Example:**

```json
{
  "error": "home_not_found",
  "message": "Home not found"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

An unexpected error occurred on server

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`todo_categories.create`](#todo-categories-create)
- [`todo_categories.get`](#todo-categories-get)
- [`todo_categories.update`](#todo-categories-update)
- [`todo_categories.delete`](#todo-categories-delete)

### POST /homes/:homeId/todoCategories

<a id="todo-categories-create"></a>

**ID:** `todo_categories.create`

**Create a new todo category**

Creates a new todo category in a home. The user must be a member of the home. Each todo category has a unique categoryId within the home, a name, optional description, color, and icon.

**Authentication:** Required (jwt)

**Tags:** `Todo Categories`

#### Path Parameters

| Name     | Type   | Required | Description                                |
| -------- | ------ | -------- | ------------------------------------------ |
| `homeId` | string | Yes      | The home ID to create the todo category in |

#### Request Body

**Content-Type:** `application/json`

Todo category creation details

**Required:** Yes

**Example:**

```json
{
  "categoryId": "shopping",
  "name": "Shopping",
  "description": "Groceries and household items",
  "color": "#FF5733",
  "icon": "cart",
  "position": 0
}
```

#### Response (201)

Todo category created successfully

**Example:**

```json
{
  "todoCategory": {
    "categoryId": "shopping",
    "homeId": "my-home",
    "name": "Shopping",
    "description": "Groceries and household items",
    "color": "#FF5733",
    "icon": "cart",
    "position": 0,
    "createdBy": "507f1f77bcf86cd799439011",
    "updatedBy": "507f1f77bcf86cd799439011",
    "createdByDeviceId": null,
    "updatedByDeviceId": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses

##### 400 - `VALIDATION_ERROR`

Validation error

Invalid request parameters

**Example:**

```json
{
  "error": "categoryId_required",
  "message": "categoryId is required"
}
```

##### 400 - `INVALID_CATEGORY_ID`

Invalid categoryId format

categoryId must be 4\-50 characters, alphanumeric with hyphens or underscores

**Example:**

```json
{
  "error": "invalid_category_id",
  "message": "categoryId must be 4-50 characters, alphanumeric with hyphens or underscores"
}
```

##### 400 - `NAME_REQUIRED`

Name is required

Name cannot be empty

**Example:**

```json
{
  "error": "name_required",
  "message": "name is required"
}
```

##### 400 - `NAME_TOO_LONG`

Name too long

Name must be 100 characters or less

**Example:**

```json
{
  "error": "name_too_long",
  "message": "name must be 100 characters or less"
}
```

##### 400 - `INVALID_COLOR`

Invalid color format

Color must be a valid hex color code

**Example:**

```json
{
  "error": "invalid_color",
  "message": "color must be a valid hex color code (e.g., #FF5733)"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 403 - `FORBIDDEN`

Forbidden

User is not a member of this home

**Example:**

```json
{
  "error": "forbidden",
  "message": "Not a member of this home"
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

The specified home does not exist

**Example:**

```json
{
  "error": "home_not_found",
  "message": "Home not found"
}
```

##### 409 - `CATEGORY_ID_EXISTS`

Category ID already exists

A todo category with this ID already exists in this home

**Example:**

```json
{
  "error": "category_id_exists",
  "message": "A todo category with this ID already exists in this home",
  "suggestedCategoryId": "shopping-2"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

An unexpected error occurred on server

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`todo_categories.list`](#todo-categories-list)
- [`todo_categories.get`](#todo-categories-get)
- [`todo_categories.update`](#todo-categories-update)
- [`todo_categories.delete`](#todo-categories-delete)

### GET /homes/:homeId/todoCategories/:categoryId

<a id="todo-categories-get"></a>

**ID:** `todo_categories.get`

**Get details of a specific todo category**

Retrieves detailed information about a specific todo category. User must be a member of the home that contains the category.

**Authentication:** Required (jwt)

**Tags:** `Todo Categories`

#### Path Parameters

| Name         | Type   | Required | Description                                |
| ------------ | ------ | -------- | ------------------------------------------ |
| `homeId`     | string | Yes      | The home ID that contains the category     |
| `categoryId` | string | Yes      | The unique identifier of the todo category |

#### Response (200)

Todo category details retrieved successfully

**Example:**

```json
{
  "todoCategory": {
    "categoryId": "shopping",
    "homeId": "my-home",
    "name": "Shopping",
    "description": "Groceries and household items",
    "color": "#FF5733",
    "icon": "cart",
    "position": 0,
    "createdBy": "507f1f77bcf86cd799439011",
    "updatedBy": "507f1f77bcf86cd799439011",
    "createdByDeviceId": null,
    "updatedByDeviceId": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses

##### 400 - `HOME_ID_REQUIRED`

homeId is required

The homeId path parameter must be provided

**Example:**

```json
{
  "error": "homeId_required",
  "message": "homeId is required"
}
```

##### 400 - `CATEGORY_ID_REQUIRED`

categoryId is required

The categoryId path parameter must be provided

**Example:**

```json
{
  "error": "categoryId_required",
  "message": "categoryId is required"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 403 - `FORBIDDEN`

Forbidden

User is not a member of this home

**Example:**

```json
{
  "error": "forbidden",
  "message": "Not a member of this home"
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

The specified home does not exist

**Example:**

```json
{
  "error": "home_not_found",
  "message": "Home not found"
}
```

##### 404 - `CATEGORY_NOT_FOUND`

Todo category not found

No todo category exists with the provided categoryId

**Example:**

```json
{
  "error": "category_not_found",
  "message": "Todo category not found"
}
```

##### 500 - `SERVER_ERROR`

Internal server error

An unexpected error occurred on server

**Example:**

```json
{
  "message": "Internal server error"
}
```

**Related Endpoints:**

- [`todo_categories.create`](#todo-categories-create)
- [`todo_categories.list`](#todo-categories-list)
- [`todo_categories.update`](#todo-categories-update)
- [`todo_categories.delete`](#todo-categories-delete)

---

## Auth

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

### PATCH /auth/me

<a id="auth-update-user"></a>

**ID:** `auth.update_user`

**Update current user profile**

Updates the authenticated user profile. Supports updating nickname, avatar URL, and password. To change the password, the current password must be provided.

**Authentication:** Required (jwt) - Requires valid JWT token from login/signup/google_login

**Tags:** `Authentication`

#### Headers

| Name            | Type   | Required | Description                                 |
| --------------- | ------ | -------- | ------------------------------------------- |
| `Authorization` | string | Yes      | JWT bearer token \(format: Bearer <token>\) |

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

### GET /auth/me

<a id="auth-get-current-user"></a>

**ID:** `auth.get_current_user`

**Get current authenticated user**

Retrieves information about the currently authenticated user. The user is identified via the JWT token in the Authorization header.

**Authentication:** Required (jwt) - Requires valid JWT token from login/signup/google_login

**Tags:** `Authentication`

#### Headers

| Name            | Type   | Required | Description                                 |
| --------------- | ------ | -------- | ------------------------------------------- |
| `Authorization` | string | Yes      | JWT bearer token \(format: Bearer <token>\) |

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

## Homes

### GET /homes

<a id="homes-list"></a>

**ID:** `homes.list`

**List all homes for the authenticated user**

Retrieves a list of all homes the authenticated user is a member of, including homes they own and homes they have joined.

**Authentication:** Required (jwt)

**Tags:** `Homes`

#### Response (200)

List of homes retrieved successfully

**Example:**

```json
{
  "homes": [
    {
      "homeId": "my-home",
      "name": "My Home",
      "address": "123 Main St",
      "invitationCode": "ABCD1234EFGH5678",
      "owner": {
        "userId": "507f1f77bcf86cd799439011",
        "email": "user@example.com",
        "nickname": "User",
        "avatarUrl": "https://example.com/avatar.jpg"
      },
      "settings": {
        "canShareInventory": true,
        "canShareTodos": true
      },
      "memberCount": 3,
      "isOwner": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### Error Responses

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
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

- [`homes.create`](#homes-create)
- [`homes.get`](#homes-get)
- [`homes.update`](#homes-update)
- [`homes.delete`](#homes-delete)

### PATCH /homes/:homeId

<a id="homes-update"></a>

**ID:** `homes.update`

**Update home details**

Updates the name and/or address of a home. Only the home owner can update home details. Fields not included in the request body are not modified.

**Authentication:** Required (jwt)

**Tags:** `Homes`

#### Path Parameters

| Name     | Type   | Required | Description                       |
| -------- | ------ | -------- | --------------------------------- |
| `homeId` | string | Yes      | The unique identifier of the home |

#### Request Body

**Content-Type:** `application/json`

Home details to update

**Required:** Yes

**Example:**

```json
{
  "name": "Updated Home Name",
  "address": "456 Oak Ave, Newtown, USA"
}
```

#### Response (200)

Home updated successfully

**Example:**

```json
{
  "home": {
    "homeId": "my-home",
    "name": "Updated Home Name",
    "address": "456 Oak Ave, Newtown, USA"
  }
}
```

#### Error Responses

##### 400 - `HOME_ID_REQUIRED`

homeId is required

The homeId parameter must be provided

**Example:**

```json
{
  "error": "homeId_required",
  "message": "homeId is required"
}
```

##### 400 - `INVALID_NAME`

Name cannot be empty

The provided name is empty or only whitespace

**Example:**

```json
{
  "error": "invalid_name",
  "message": "name cannot be empty"
}
```

##### 400 - `NAME_TOO_LONG`

Name too long

Name must be 100 characters or less

**Example:**

```json
{
  "error": "name_too_long",
  "message": "name must be 100 characters or less"
}
```

##### 400 - `ADDRESS_TOO_LONG`

Address too long

Address must be 500 characters or less

**Example:**

```json
{
  "error": "address_too_long",
  "message": "address must be 500 characters or less"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 403 - `FORBIDDEN`

Only the owner can update this home

User is not the owner of this home

**Example:**

```json
{
  "error": "forbidden",
  "message": "Only the owner can update this home"
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

No home exists with the provided homeId

**Example:**

```json
{
  "error": "home_not_found",
  "message": "Home not found"
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

- [`homes.get`](#homes-get)
- [`homes.create`](#homes-create)
- [`homes.delete`](#homes-delete)

### DELETE /homes/:homeId/members/:userId

<a id="homes-remove-member"></a>

**ID:** `homes.remove_member`

**Remove a member from a home**

Removes a member from a home. The home owner can remove any member except themselves. Regular members can only remove themselves (leave the home). Owners must delete the home instead of removing themselves.

**Authentication:** Required (jwt)

**Tags:** `Homes`

#### Path Parameters

| Name     | Type   | Required | Description                                           |
| -------- | ------ | -------- | ----------------------------------------------------- |
| `homeId` | string | Yes      | The unique identifier of the home                     |
| `userId` | string | Yes      | The ID of the user to remove \(or self when leaving\) |

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

##### 400 - `HOME_ID_REQUIRED`

homeId is required

The homeId parameter must be provided

**Example:**

```json
{
  "error": "homeId_required",
  "message": "homeId is required"
}
```

##### 400 - `USER_ID_REQUIRED`

userId is required

The userId parameter must be provided

**Example:**

```json
{
  "error": "userId_required",
  "message": "userId is required"
}
```

##### 400 - `CANNOT_REMOVE_SELF`

Owner cannot leave their own home

Owners cannot remove themselves from their home\. Delete the home instead\.

**Example:**

```json
{
  "error": "cannot_remove_self",
  "message": "Owner cannot leave their own home. Delete the home instead."
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 403 - `FORBIDDEN`

Not a member of this home

User is not a member of the requested home

**Example:**

```json
{
  "error": "forbidden",
  "message": "Not a member of this home"
}
```

##### 403 - `FORBIDDEN_REMOVE_OTHERS`

Only owner can remove other members

Regular members cannot remove other members, only themselves

**Example:**

```json
{
  "error": "forbidden",
  "message": "Only the owner can remove other members"
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

No home exists with the provided homeId

**Example:**

```json
{
  "error": "home_not_found",
  "message": "Home not found"
}
```

##### 404 - `MEMBER_NOT_FOUND`

Member not found in this home

The specified userId is not a member of this home

**Example:**

```json
{
  "error": "member_not_found",
  "message": "Member not found in this home"
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

- [`homes.list_members`](#homes-list-members)
- [`homes.get`](#homes-get)

### GET /homes/:homeId/invitation

<a id="homes-get-invitation"></a>

**ID:** `homes.get_invitation`

**Get home invitation details**

Retrieves the invitation code, sharing settings, member count, and basic home info. Only the home owner can view invitation details. Use this to share the invitation code with others.

**Authentication:** Required (jwt)

**Tags:** `Homes`, `Invitations`

#### Path Parameters

| Name     | Type   | Required | Description                       |
| -------- | ------ | -------- | --------------------------------- |
| `homeId` | string | Yes      | The unique identifier of the home |

#### Response (200)

Invitation details retrieved successfully

**Example:**

```json
{
  "invitationCode": "ABCD1234EFGH5678",
  "settings": {
    "canShareInventory": true,
    "canShareTodos": true
  },
  "memberCount": 3,
  "home": {
    "homeId": "my-home",
    "name": "My Home"
  }
}
```

#### Error Responses

##### 400 - `HOME_ID_REQUIRED`

homeId is required

The homeId parameter must be provided

**Example:**

```json
{
  "error": "homeId_required",
  "message": "homeId is required"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 403 - `FORBIDDEN`

Only the owner can view invitation details

User is not the owner of this home

**Example:**

```json
{
  "error": "forbidden",
  "message": "Only the owner can view invitation details"
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

No home exists with the provided homeId

**Example:**

```json
{
  "error": "home_not_found",
  "message": "Home not found"
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

- [`homes.regenerate_invitation`](#homes-regenerate-invitation)
- [`homes.get`](#homes-get)
- [`homes.update_settings`](#homes-update-settings)

### DELETE /homes/:homeId

<a id="homes-delete"></a>

**ID:** `homes.delete`

**Delete a home**

Soft deletes a home. Only the home owner can delete their home. The home is marked as deleted but retained in the database for data recovery purposes.

**Authentication:** Required (jwt)

**Tags:** `Homes`

#### Path Parameters

| Name     | Type   | Required | Description                                 |
| -------- | ------ | -------- | ------------------------------------------- |
| `homeId` | string | Yes      | The unique identifier of the home to delete |

#### Response (200)

Home deleted successfully

**Example:**

```json
{
  "success": true,
  "message": "Home deleted successfully",
  "deletedAt": "2024-01-20T14:30:00.000Z"
}
```

#### Error Responses

##### 400 - `HOME_ID_REQUIRED`

homeId is required

The homeId parameter must be provided

**Example:**

```json
{
  "error": "homeId_required",
  "message": "homeId is required"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 403 - `FORBIDDEN`

Only the owner can delete this home

User is not the owner of this home

**Example:**

```json
{
  "error": "forbidden",
  "message": "Only the owner can delete this home"
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

No home exists with the provided homeId

**Example:**

```json
{
  "error": "home_not_found",
  "message": "Home not found"
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

- [`homes.get`](#homes-get)
- [`homes.update`](#homes-update)
- [`homes.create`](#homes-create)

### GET /homes/:homeId

<a id="homes-get"></a>

**ID:** `homes.get`

**Get details of a specific home**

Retrieves detailed information about a specific home, including owner info, settings, and member count. User must be a member of the home.

**Authentication:** Required (jwt)

**Tags:** `Homes`

#### Path Parameters

| Name     | Type   | Required | Description                       |
| -------- | ------ | -------- | --------------------------------- |
| `homeId` | string | Yes      | The unique identifier of the home |

#### Response (200)

Home details retrieved successfully

**Example:**

```json
{
  "home": {
    "homeId": "my-home",
    "name": "My Home",
    "address": "123 Main St, Anytown, USA",
    "invitationCode": "ABCD1234EFGH5678",
    "settings": {
      "canShareInventory": true,
      "canShareTodos": true
    },
    "owner": {
      "userId": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "nickname": "User",
      "avatarUrl": "https://example.com/avatar.jpg"
    },
    "memberCount": 3,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:22:00.000Z"
  }
}
```

#### Error Responses

##### 400 - `HOME_ID_REQUIRED`

homeId is required

The homeId parameter must be provided

**Example:**

```json
{
  "error": "homeId_required",
  "message": "homeId is required"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 403 - `FORBIDDEN`

Not a member of this home

User is not a member of the requested home

**Example:**

```json
{
  "error": "forbidden",
  "message": "Not a member of this home"
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

No home exists with the provided homeId

**Example:**

```json
{
  "error": "home_not_found",
  "message": "Home not found"
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

- [`homes.list`](#homes-list)
- [`homes.create`](#homes-create)
- [`homes.update`](#homes-update)
- [`homes.delete`](#homes-delete)

### PATCH /homes/:homeId/settings

<a id="homes-update-settings"></a>

**ID:** `homes.update_settings`

**Update home sharing settings**

Updates the sharing permissions for a home. Controls whether members can share inventory items and/or todo items. Only the home owner can update settings.

**Authentication:** Required (jwt)

**Tags:** `Homes`

#### Path Parameters

| Name     | Type   | Required | Description                       |
| -------- | ------ | -------- | --------------------------------- |
| `homeId` | string | Yes      | The unique identifier of the home |

#### Request Body

**Content-Type:** `application/json`

Settings to update

**Required:** Yes

**Example:**

```json
{
  "canShareInventory": true,
  "canShareTodos": true
}
```

#### Response (200)

Settings updated successfully

**Example:**

```json
{
  "settings": {
    "canShareInventory": true,
    "canShareTodos": true
  }
}
```

#### Error Responses

##### 400 - `HOME_ID_REQUIRED`

homeId is required

The homeId parameter must be provided

**Example:**

```json
{
  "error": "homeId_required",
  "message": "homeId is required"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 403 - `FORBIDDEN`

Only the owner can update home settings

User is not the owner of this home

**Example:**

```json
{
  "error": "forbidden",
  "message": "Only the owner can update home settings"
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

No home exists with the provided homeId

**Example:**

```json
{
  "error": "home_not_found",
  "message": "Home not found"
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

- [`homes.get`](#homes-get)
- [`homes.invitation.get`](#homes-invitation-get)
- [`homes.update`](#homes-update)

### POST /homes/:homeId/invitation/regenerate

<a id="homes-regenerate-invitation"></a>

**ID:** `homes.regenerate_invitation`

**Regenerate home invitation code**

Generates a new random 16-character invitation code for the home, invalidating the previous code. Only the home owner can regenerate the invitation code. Use this when you want to revoke existing access or for security reasons.

**Authentication:** Required (jwt)

**Tags:** `Homes`, `Invitations`

#### Path Parameters

| Name     | Type   | Required | Description                       |
| -------- | ------ | -------- | --------------------------------- |
| `homeId` | string | Yes      | The unique identifier of the home |

#### Response (200)

New invitation code generated successfully

**Example:**

```json
{
  "invitationCode": "XYZW9876ABCD4321"
}
```

#### Error Responses

##### 400 - `HOME_ID_REQUIRED`

homeId is required

The homeId parameter must be provided

**Example:**

```json
{
  "error": "homeId_required",
  "message": "homeId is required"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 403 - `FORBIDDEN`

Only the owner can regenerate invitation code

User is not the owner of this home

**Example:**

```json
{
  "error": "forbidden",
  "message": "Only the owner can regenerate invitation code"
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

No home exists with the provided homeId

**Example:**

```json
{
  "error": "home_not_found",
  "message": "Home not found"
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

- [`homes.get_invitation`](#homes-get-invitation)
- [`homes.get`](#homes-get)

### POST /homes

<a id="homes-create"></a>

**ID:** `homes.create`

**Create a new home**

Creates a new home with the authenticated user as the owner. Each home has a unique homeId, name, optional address, and auto-generated invitation code for sharing.

**Authentication:** Required (jwt)

**Tags:** `Homes`

#### Request Body

**Content-Type:** `application/json`

Home creation details

**Required:** Yes

**Example:**

```json
{
  "homeId": "my-home",
  "name": "My Home",
  "address": "123 Main St, Anytown, USA"
}
```

#### Response (201)

Home created successfully

**Example:**

```json
{
  "home": {
    "homeId": "my-home",
    "name": "My Home",
    "address": "123 Main St, Anytown, USA",
    "invitationCode": "ABCD1234EFGH5678",
    "owner": {
      "userId": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "nickname": "User"
    },
    "settings": {
      "canShareInventory": false,
      "canShareTodos": false
    },
    "memberCount": 0,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses

##### 400 - `VALIDATION_ERROR`

Validation error

Invalid request parameters

**Example:**

```json
{
  "error": "homeId_required",
  "message": "homeId is required"
}
```

##### 400 - `INVALID_HOME_ID`

Invalid homeId format

homeId must be 3\-30 characters, alphanumeric with hyphens

**Example:**

```json
{
  "error": "invalid_homeId",
  "message": "homeId must be 3-30 characters, alphanumeric with hyphens"
}
```

##### 400 - `NAME_REQUIRED`

Name is required

Name cannot be empty

**Example:**

```json
{
  "error": "name_required",
  "message": "name is required"
}
```

##### 400 - `NAME_TOO_LONG`

Name too long

Name must be 100 characters or less

**Example:**

```json
{
  "error": "name_too_long",
  "message": "name must be 100 characters or less"
}
```

##### 400 - `ADDRESS_TOO_LONG`

Address too long

Address must be 500 characters or less

**Example:**

```json
{
  "error": "address_too_long",
  "message": "address must be 500 characters or less"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 404 - `USER_NOT_FOUND`

User not found

Authenticated user does not exist

**Example:**

```json
{
  "error": "user_not_found",
  "message": "User not found"
}
```

##### 409 - `HOME_ID_EXISTS`

Home ID already exists

A home with this ID already exists \(excluding soft\-deleted homes\)

**Example:**

```json
{
  "error": "homeId_exists",
  "message": "A home with this ID already exists",
  "suggestedHomeId": "my-home-2"
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

- [`homes.list`](#homes-list)
- [`homes.get`](#homes-get)
- [`homes.update`](#homes-update)
- [`homes.delete`](#homes-delete)
- [`homes.invitation.get`](#homes-invitation-get)

### GET /homes/:homeId/members

<a id="homes-list-members"></a>

**ID:** `homes.list_members`

**List all members of a home**

Retrieves a list of all members of a home, including the owner and regular members. Returns user details like email, nickname, avatar, role, and join date. User must be a member of the home to view members.

**Authentication:** Required (jwt)

**Tags:** `Homes`

#### Path Parameters

| Name     | Type   | Required | Description                       |
| -------- | ------ | -------- | --------------------------------- |
| `homeId` | string | Yes      | The unique identifier of the home |

#### Query Parameters

| Name             | Type    | Required | Default | Description                                                    |
| ---------------- | ------- | -------- | ------- | -------------------------------------------------------------- |
| `includePending` | boolean | No       | -       | Whether to include pending members \(reserved for future use\) |

#### Response (200)

Members retrieved successfully

**Example:**

```json
{
  "members": [
    {
      "userId": "507f1f77bcf86cd799439011",
      "email": "owner@example.com",
      "nickname": "Owner",
      "avatarUrl": "https://example.com/avatar.jpg",
      "role": "owner",
      "isOwner": true,
      "joinedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "userId": "507f1f77bcf86cd799439012",
      "email": "member@example.com",
      "nickname": "Member",
      "avatarUrl": "https://example.com/avatar2.jpg",
      "role": "member",
      "isOwner": false,
      "joinedAt": "2024-01-16T14:20:00.000Z"
    }
  ]
}
```

#### Error Responses

##### 400 - `HOME_ID_REQUIRED`

homeId is required

The homeId parameter must be provided

**Example:**

```json
{
  "error": "homeId_required",
  "message": "homeId is required"
}
```

##### 401 - `UNAUTHORIZED`

Unauthorized

No authentication token provided

**Example:**

```json
{
  "message": "Unauthorized"
}
```

##### 403 - `FORBIDDEN`

Not a member of this home

User is not a member of the requested home

**Example:**

```json
{
  "error": "forbidden",
  "message": "Not a member of this home"
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

No home exists with the provided homeId

**Example:**

```json
{
  "error": "home_not_found",
  "message": "Home not found"
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

- [`homes.remove_member`](#homes-remove-member)
- [`homes.get`](#homes-get)

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

## Sync Entities

### GET /sync/entities/pull

<a id="sync-entities-pull-entities"></a>

**ID:** `sync_entities.pull_entities`

**Pull entities for a home and entity type**

Retrieves entities that have been created, updated, or deleted since a given timestamp. Supports incremental sync for efficient data transfer.

**Supported entity types:** `inventoryItems`, `todoItems`, `categories`, `locations`, `settings`

**Permission requirements:**

- `inventoryItems`: Members require `canShareInventory: true` on the home
- `todoItems`: Members require `canShareTodos: true` on the home
- Other types: Always allowed for members
- Home owners: Always have full access regardless of permissions

**Conflict Resolution:** Automatic last-write-wins based on timestamps. Never prompts users.

**Soft Deletes:** Deleted entities are tracked for 90 days before permanent deletion.

**Authentication:** Required (jwt) - Requires valid JWT token from login/signup/google_login

**Tags:** `Synchronization`

#### Query Parameters

| Name             | Type                                                              | Required | Default | Description                                                                               |
| ---------------- | ----------------------------------------------------------------- | -------- | ------- | ----------------------------------------------------------------------------------------- |
| `homeId`         | string                                                            | Yes      | -       | Home ID to pull entities from                                                             |
| `entityType`     | enum (inventoryItems, todoItems, categories, locations, settings) | Yes      | -       | Type of entities to pull                                                                  |
| `deviceId`       | string                                                            | Yes      | -       | Client device identifier for checkpoint tracking                                          |
| `since`          | string                                                            | No       | -       | ISO 8601 timestamp for incremental sync \(only return entities modified after this time\) |
| `includeDeleted` | boolean                                                           | No       | -       | Include soft\-deleted entities in response                                                |

#### Response (200)

Entities retrieved successfully

**Example:**

```json
{
  "success": true,
  "entities": [
    {
      "entityId": "inv_12345",
      "entityType": "inventoryItems",
      "homeId": "my-family-home",
      "data": {
        "id": "inv_12345",
        "name": "Milk",
        "status": "using",
        "price": 3.99,
        "amount": 1,
        "category": "dairy",
        "location": "refrigerator"
      },
      "version": 5,
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "updatedBy": {
        "userId": "507f1f77bcf86cd799439011",
        "email": "user@example.com",
        "nickname": "John"
      },
      "updatedByDeviceId": "iphone-15-pro"
    }
  ],
  "deletedEntityIds": ["inv_67890"],
  "serverTimestamp": "2024-01-15T10:35:00.000Z",
  "checkpoint": {
    "homeId": "my-family-home",
    "entityType": "inventoryItems",
    "lastSyncedAt": "2024-01-15T10:35:00.000Z",
    "lastPulledVersion": 100
  }
}
```

#### Error Responses

##### 400 - `INVALID_HOME_ID`

homeId is required

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "homeId is required",
    "code": "INVALID_HOME_ID"
  }
}
```

##### 400 - `INVALID_ENTITY_TYPE`

entityType is required

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "entityType is required",
    "code": "INVALID_ENTITY_TYPE"
  }
}
```

##### 400 - `INVALID_DEVICE_ID`

deviceId is required

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "deviceId is required",
    "code": "INVALID_DEVICE_ID"
  }
}
```

##### 400 - `INVALID_TIMESTAMP`

since must be a valid ISO date

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "since must be a valid ISO date",
    "code": "INVALID_TIMESTAMP"
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
    "code": "UNAUTHORIZED"
  }
}
```

##### 403 - `FORBIDDEN`

You do not have permission to pull this entity type

Thrown when a member tries to pull inventoryItems or todoItems without the required permission

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "You do not have permission to pull this entity type",
    "code": "FORBIDDEN"
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
    "code": "SERVER_ERROR"
  }
}
```

**Related Endpoints:**

- [`sync_entities.push_entities`](#sync-entities-push-entities)
- [`sync_entities.batch_sync`](#sync-entities-batch-sync)
- [`sync_entities.get_sync_status`](#sync-entities-get-sync-status)
- [`sync_entities.reset_sync`](#sync-entities-reset-sync)

### POST /sync/entities/batch

<a id="sync-entities-batch-sync"></a>

**ID:** `sync_entities.batch_sync`

**Combined pull and push in a single request**

Performs multiple pull and push operations in a single request for efficient synchronization. Useful for syncing multiple entity types at once.

**Pull Requests:** Retrieves entities updated since a given timestamp for each entity type.

**Push Requests:** Pushes entity changes with automatic conflict resolution.

**Advantages:**

- Single round-trip for multiple entity types
- Atomic operation per entity type
- Efficient bandwidth usage

**Note:** Push requests in batch mode do not return full conflict resolution details. Use individual push endpoint for detailed results.

**Authentication:** Required (jwt) - Requires valid JWT token from login/signup/google_login

**Tags:** `Synchronization`

#### Request Body

**Content-Type:** `application/json`

Batch sync request with pull and push operations

**Required:** Yes

**Example:**

```json
{
  "homeId": "my-family-home",
  "deviceId": "iphone-15-pro",
  "pullRequests": [
    {
      "entityType": "inventoryItems",
      "since": "2024-01-15T09:00:00.000Z",
      "includeDeleted": true,
      "checkpoint": {
        "lastPulledVersion": 95
      }
    },
    {
      "entityType": "todoItems",
      "since": "2024-01-15T09:00:00.000Z",
      "includeDeleted": true,
      "checkpoint": {
        "lastPulledVersion": 50
      }
    }
  ],
  "pushRequests": [
    {
      "entityType": "inventoryItems",
      "entities": [
        {
          "entityId": "inv_12345",
          "entityType": "inventoryItems",
          "homeId": "my-family-home",
          "data": {
            "id": "inv_12345",
            "name": "Milk",
            "status": "using",
            "price": 3.99
          },
          "version": 5,
          "clientUpdatedAt": "2024-01-15T10:25:00.000Z"
        }
      ],
      "lastPulledAt": "2024-01-15T09:00:00.000Z",
      "checkpoint": {
        "lastPulledVersion": 95
      }
    }
  ]
}
```

#### Response (200)

Batch sync completed successfully

**Example:**

```json
{
  "success": true,
  "pullResults": [
    {
      "entityType": "inventoryItems",
      "entities": [
        {
          "entityId": "inv_12345",
          "entityType": "inventoryItems",
          "homeId": "my-family-home",
          "data": {
            "id": "inv_12345",
            "name": "Milk",
            "status": "using"
          },
          "version": 5,
          "updatedAt": "2024-01-15T10:30:00.000Z",
          "updatedBy": {
            "userId": "507f1f77bcf86cd799439011",
            "email": "user@example.com",
            "nickname": "John"
          }
        }
      ],
      "deletedEntityIds": [],
      "checkpoint": {
        "homeId": "my-family-home",
        "entityType": "inventoryItems",
        "lastSyncedAt": "2024-01-15T10:35:00.000Z",
        "lastPulledVersion": 100
      }
    },
    {
      "entityType": "todoItems",
      "entities": [],
      "deletedEntityIds": [],
      "checkpoint": {
        "homeId": "my-family-home",
        "entityType": "todoItems",
        "lastSyncedAt": "2024-01-15T10:35:00.000Z",
        "lastPulledVersion": 50
      }
    }
  ],
  "pushResults": [
    {
      "entityType": "inventoryItems",
      "results": [
        {
          "entityId": "inv_12345",
          "status": "updated",
          "winner": "client",
          "serverVersion": 6,
          "serverUpdatedAt": "2024-01-15T10:35:00.000Z"
        }
      ],
      "newEntitiesFromServer": [],
      "deletedEntityIds": [],
      "errors": [],
      "checkpoint": {
        "homeId": "my-family-home",
        "entityType": "inventoryItems",
        "lastSyncedAt": "2024-01-15T10:35:00.000Z",
        "lastPushedVersion": 100
      }
    }
  ],
  "serverTimestamp": "2024-01-15T10:35:00.000Z"
}
```

#### Error Responses

##### 400 - `INVALID_HOME_ID`

homeId is required

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "homeId is required",
    "code": "INVALID_HOME_ID"
  }
}
```

##### 400 - `INVALID_DEVICE_ID`

deviceId is required

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "deviceId is required",
    "code": "INVALID_DEVICE_ID"
  }
}
```

##### 400 - `INVALID_DATA`

At least one of pullRequests or pushRequests is required

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "At least one of pullRequests or pushRequests is required",
    "code": "INVALID_DATA"
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
    "code": "UNAUTHORIZED"
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
    "code": "SERVER_ERROR"
  }
}
```

**Related Endpoints:**

- [`sync_entities.pull_entities`](#sync-entities-pull-entities)
- [`sync_entities.push_entities`](#sync-entities-push-entities)
- [`sync_entities.get_sync_status`](#sync-entities-get-sync-status)

### POST /sync/entities/push

<a id="sync-entities-push-entities"></a>

**ID:** `sync_entities.push_entities`

**Push entity changes to the server with automatic conflict resolution**

Pushes entity changes to the server with automatic last-write-wins conflict resolution. Each entity is synced independently based on timestamps.

**Conflict Resolution:**

- Compares `clientUpdatedAt` with `serverUpdatedAt`
- Client wins if newer: Server updates with client data
- Server wins if newer or equal: Returns server version to client
- Stale versions are rejected: Client must pull first
- **NEVER prompts users** - All conflict resolution is automatic

**Pending Operations:**

- `pendingCreate: true` - Entity was created offline
- `pendingDelete: true` - Entity was deleted offline

**Soft Delete Handling:**

- If client deletes while server has newer update: Server wins, entity is restored
- If client updates while server has deleted: Server delete wins if newer

**Entity ID Collision:**

- Returns error if entity ID already exists
- Suggests alternative entity ID for retry

**Authentication:** Required (jwt) - Requires valid JWT token from login/signup/google_login

**Tags:** `Synchronization`

#### Query Parameters

| Name         | Type                                                              | Required | Default | Description                                   |
| ------------ | ----------------------------------------------------------------- | -------- | ------- | --------------------------------------------- |
| `homeId`     | string                                                            | Yes      | -       | Home ID to push entities to                   |
| `entityType` | enum (inventoryItems, todoItems, categories, locations, settings) | Yes      | -       | Type of entities being pushed                 |
| `deviceId`   | string                                                            | Yes      | -       | Client device identifier for tracking changes |

#### Request Body

**Content-Type:** `application/json`

Array of entities to sync with optional checkpoint info

**Required:** Yes

**Example:**

```json
{
  "entities": [
    {
      "entityId": "inv_12345",
      "entityType": "inventoryItems",
      "homeId": "my-family-home",
      "data": {
        "id": "inv_12345",
        "name": "Milk",
        "status": "using",
        "price": 3.99,
        "amount": 1,
        "category": "dairy",
        "location": "refrigerator"
      },
      "version": 5,
      "clientUpdatedAt": "2024-01-15T10:25:00.000Z",
      "pendingCreate": false,
      "pendingDelete": false
    }
  ],
  "lastPulledAt": "2024-01-15T09:00:00.000Z",
  "checkpoint": {
    "lastPulledVersion": 95
  }
}
```

#### Response (200)

Entities processed successfully

**Example:**

```json
{
  "success": true,
  "results": [
    {
      "entityId": "inv_12345",
      "status": "updated",
      "winner": "client",
      "serverVersion": 6,
      "serverUpdatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "entityId": "inv_67890",
      "status": "server_version",
      "winner": "server",
      "serverVersionData": {
        "data": {
          "id": "inv_67890",
          "name": "Bread",
          "status": "new"
        },
        "version": 10,
        "updatedAt": "2024-01-15T10:35:00.000Z",
        "updatedBy": {
          "userId": "507f1f77bcf86cd799439011",
          "email": "other@example.com",
          "nickname": "Jane"
        }
      }
    },
    {
      "entityId": "inv_new",
      "status": "created",
      "serverVersion": 1,
      "serverUpdatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "newEntitiesFromServer": [],
  "deletedEntityIds": [],
  "errors": [],
  "checkpoint": {
    "homeId": "my-family-home",
    "entityType": "inventoryItems",
    "lastSyncedAt": "2024-01-15T10:30:00.000Z",
    "lastPushedVersion": 100
  },
  "serverTimestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Error Responses

##### 400 - `INVALID_HOME_ID`

homeId is required

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "homeId is required",
    "code": "INVALID_HOME_ID"
  }
}
```

##### 400 - `INVALID_ENTITY_TYPE`

entityType is required

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "entityType is required",
    "code": "INVALID_ENTITY_TYPE"
  }
}
```

##### 400 - `INVALID_DEVICE_ID`

deviceId is required

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "deviceId is required",
    "code": "INVALID_DEVICE_ID"
  }
}
```

##### 400 - `INVALID_DATA`

entities array is required and must not be empty

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "entities array is required and must not be empty",
    "code": "INVALID_DATA"
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
    "code": "UNAUTHORIZED"
  }
}
```

##### 403 - `FORBIDDEN`

You do not have permission to push this entity type

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "You do not have permission to push this entity type",
    "code": "FORBIDDEN"
  }
}
```

##### 404 - `HOME_NOT_FOUND`

Home not found

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "Home not found",
    "code": "HOME_NOT_FOUND"
  }
}
```

##### 404 - `USER_NOT_FOUND`

User not found

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "User not found",
    "code": "USER_NOT_FOUND"
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
    "code": "SERVER_ERROR"
  }
}
```

**Related Endpoints:**

- [`sync_entities.pull_entities`](#sync-entities-pull-entities)
- [`sync_entities.batch_sync`](#sync-entities-batch-sync)
- [`sync_entities.get_sync_status`](#sync-entities-get-sync-status)

### DELETE /sync/entities/reset

<a id="sync-entities-reset-sync"></a>

**ID:** `sync_entities.reset_sync`

**Clear sync checkpoints forcing full re\-sync**

Clears sync checkpoints for a user/device/home/entityType combination, forcing a full re-sync on the next sync operation.

**Use Cases:**

- Client data corruption requiring full refresh
- Sync state is out of sync
- Troubleshooting sync issues
- User wants to start fresh

**Effect:**

- Deletes sync checkpoints for specified criteria
- Next pull/push will be treated as initial sync
- No data is deleted from the server

**Parameters:**

- `homeId` (required): Home to reset
- `entityType` (optional): Specific entity type, or all if omitted
- `deviceId` (required): Device to reset for

**Authentication:** Required (jwt) - Requires valid JWT token from login/signup/google_login

**Tags:** `Synchronization`

#### Query Parameters

| Name         | Type                                                              | Required | Default | Description                                       |
| ------------ | ----------------------------------------------------------------- | -------- | ------- | ------------------------------------------------- |
| `homeId`     | string                                                            | Yes      | -       | Home ID to reset sync checkpoints for             |
| `entityType` | enum (inventoryItems, todoItems, categories, locations, settings) | No       | -       | Specific entity type to reset, or all if omitted  |
| `deviceId`   | string                                                            | Yes      | -       | Client device identifier to reset checkpoints for |

#### Response (200)

Sync checkpoints cleared successfully

**Example:**

```json
{
  "success": true,
  "message": "Sync checkpoints cleared",
  "resetEntityTypes": [
    "inventoryItems",
    "todoItems",
    "categories",
    "locations",
    "settings"
  ],
  "deletedCount": 5
}
```

#### Error Responses

##### 400 - `INVALID_HOME_ID`

homeId is required

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "homeId is required",
    "code": "INVALID_HOME_ID"
  }
}
```

##### 400 - `INVALID_DEVICE_ID`

deviceId is required

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "deviceId is required",
    "code": "INVALID_DEVICE_ID"
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
    "code": "UNAUTHORIZED"
  }
}
```

##### 403 - `FORBIDDEN`

You are not a member of this home

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "You are not a member of this home",
    "code": "FORBIDDEN"
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
    "code": "SERVER_ERROR"
  }
}
```

**Related Endpoints:**

- [`sync_entities.pull_entities`](#sync-entities-pull-entities)
- [`sync_entities.push_entities`](#sync-entities-push-entities)
- [`sync_entities.get_sync_status`](#sync-entities-get-sync-status)

### GET /sync/entities/status

<a id="sync-entities-get-sync-status"></a>

**ID:** `sync_entities.get_sync_status`

**Get sync status for entity types in a home**

Returns the sync status for entity types including last sync time, versions, and whether pull or push is needed.

**Status Information:**

- `lastSyncedAt` - Timestamp of last successful sync
- `lastPulledVersion` - Version number from last pull
- `lastPushedVersion` - Version number from last push
- `serverVersion` - Current version on server
- `needsPull` - Whether server has newer data
- `needsPush` - Whether client has unpushed changes

**Use Cases:**

- Display sync status in UI
- Determine if sync is needed
- Show sync progress indicators

**Authentication:** Required (jwt) - Requires valid JWT token from login/signup/google_login

**Tags:** `Synchronization`

#### Query Parameters

| Name         | Type                                                              | Required | Default | Description                                      |
| ------------ | ----------------------------------------------------------------- | -------- | ------- | ------------------------------------------------ |
| `homeId`     | string                                                            | Yes      | -       | Home ID to check sync status for                 |
| `entityType` | enum (inventoryItems, todoItems, categories, locations, settings) | No       | -       | Specific entity type to check, or all if omitted |
| `deviceId`   | string                                                            | Yes      | -       | Client device identifier                         |

#### Response (200)

Sync status retrieved successfully

**Example:**

```json
{
  "success": true,
  "status": {
    "inventoryItems": {
      "homeId": "my-family-home",
      "entityType": "inventoryItems",
      "lastSyncedAt": "2024-01-15T10:30:00.000Z",
      "lastPulledVersion": 100,
      "lastPushedVersion": 98,
      "pendingLocalChanges": 5,
      "serverVersion": 102,
      "needsPull": true,
      "needsPush": true
    },
    "todoItems": {
      "homeId": "my-family-home",
      "entityType": "todoItems",
      "lastSyncedAt": "2024-01-15T09:00:00.000Z",
      "lastPulledVersion": 50,
      "lastPushedVersion": 50,
      "pendingLocalChanges": 0,
      "serverVersion": 50,
      "needsPull": false,
      "needsPush": false
    },
    "categories": {
      "homeId": "my-family-home",
      "entityType": "categories",
      "lastSyncedAt": null,
      "lastPulledVersion": 0,
      "lastPushedVersion": 0,
      "pendingLocalChanges": 0,
      "serverVersion": 0,
      "needsPull": false,
      "needsPush": false
    }
  }
}
```

#### Error Responses

##### 400 - `INVALID_HOME_ID`

homeId is required

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "homeId is required",
    "code": "INVALID_HOME_ID"
  }
}
```

##### 400 - `INVALID_DEVICE_ID`

deviceId is required

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "deviceId is required",
    "code": "INVALID_DEVICE_ID"
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
    "code": "UNAUTHORIZED"
  }
}
```

##### 403 - `FORBIDDEN`

You are not a member of this home

**Example:**

```json
{
  "success": false,
  "error": {
    "message": "You are not a member of this home",
    "code": "FORBIDDEN"
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
    "code": "SERVER_ERROR"
  }
}
```

**Related Endpoints:**

- [`sync_entities.pull_entities`](#sync-entities-pull-entities)
- [`sync_entities.push_entities`](#sync-entities-push-entities)
- [`sync_entities.batch_sync`](#sync-entities-batch-sync)
- [`sync_entities.reset_sync`](#sync-entities-reset-sync)

---

## Debug

### GET /debugz

<a id="debug-get-debugz"></a>

**ID:** `debug.get_debugz`

**Interactive API Debug Dashboard**

Renders a Postman-like UI for testing API endpoints. Automatically populates with handler metadata. Allows setting auth tokens and sending requests to test the API. Only available in non-production environments.

**Authentication:** Not required

**Tags:** `Debug`

#### Response (200)

Returns HTML debug dashboard

#### Error Responses

##### 404 - `NOT_FOUND`

Debug endpoint not available in production

The debug endpoint is disabled in production mode

**Example:**

```json
{
  "message": "Not Found"
}
```

### POST /debugz/proxy

<a id="debug-proxy-debugz-request"></a>

**ID:** `debug.proxy_debugz_request`

**Proxy requests to API endpoints**

Proxies requests from the debug UI to actual API endpoints. Allows testing endpoints with custom auth tokens. Only available in non-production environments.

**Authentication:** Not required

**Tags:** `Debug`

#### Query Parameters

| Name     | Type   | Required | Default | Description                         |
| -------- | ------ | -------- | ------- | ----------------------------------- |
| `method` | string | No       | -       | HTTP method to use \(default: GET\) |
| `path`   | string | Yes      | -       | API endpoint path to proxy to       |

#### Request Body

**Content-Type:** `application/json`

Request configuration

**Required:** Yes

**Example:**

```json
{
  "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "requestBody": {
    "email": "user@example.com",
    "password": "password123"
  }
}
```

#### Response (200)

Proxied response

#### Error Responses

##### 400 - `BAD_REQUEST`

Target path is required

The path query parameter is required

##### 404 - `NOT_FOUND`

Debug endpoint not available in production

The debug endpoint is disabled in production mode

##### 500 - `PROXY_ERROR`

Failed to proxy request

An error occurred while proxying the request

**Related Endpoints:**

- [`debug.get_debugz`](#debug-get-debugz)
- [`debug.get_debugz_api`](#debug-get-debugz-api)

### GET /debugz/api

<a id="debug-get-debugz-api"></a>

**ID:** `debug.get_debugz_api`

**Get handler metadata for debug UI**

Returns all registered handler metadata organized by category. Used by the debug dashboard to populate the endpoint list. Only available in non-production environments.

**Authentication:** Not required

**Tags:** `Debug`

#### Response (200)

Handler metadata organized by category

#### Error Responses

##### 404 - `NOT_FOUND`

Debug endpoint not available in production

The debug endpoint is disabled in production mode

**Example:**

```json
{
  "message": "Not Found"
}
```

**Related Endpoints:**

- [`debug.get_debugz`](#debug-get-debugz)

---

## Invitations

---

---

_Documentation generated from 35 endpoints_
