# SERVICES ARCHITECTURE

**Generated:** 2025-01-25T04:55:00Z
**Commit:** ed4c850
**Branch:** main

## OVERVIEW

Business logic layer with SyncService (1234 lines - largest file), ApiClient, and data management.

## STRUCTURE

```
services/
├── SyncService.ts        # Sync orchestration (1234 lines): queue, merge, cleanup
├── ApiClient.ts         # HTTP client with retry logic (587 lines)
├── AuthService.ts       # Auth operations
├── InventoryService.ts   # Inventory CRUD
├── TodoService.ts       # Todo CRUD
├── StorageService.ts    # Local file I/O
└── DataInitializationService.ts  # Initial data setup
```

## WHERE TO LOOK

| Task          | Location            | Notes                                                          |
| ------------- | ------------------- | -------------------------------------------------------------- |
| Sync logic    | `SyncService.ts`    | God object - consider extracting queue, resolver, orchestrator |
| API calls     | `ApiClient.ts`      | Exponential backoff retry, global error handler                |
| Local storage | `StorageService.ts` | JSON file I/O for categories, locations, items, todos          |

## CONVENTIONS

- **API client**: Always initialize in authSaga, store in Redux state, access via `select()`
- **Error handling**: Global error callback set via `setGlobalErrorHandler()` in authSaga
- **Retry pattern**: 3 attempts with exponential backoff + jitter
- **Sync queue**: Managed by SyncService with in-flight tracking and metadata

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** manually initialize ApiClient in components - get from `useAuth().getApiClient()`
- **AVOID** god object pattern - SyncService does queue, merge, cleanup, callbacks (1234 lines)
