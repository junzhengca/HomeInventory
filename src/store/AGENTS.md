# STORE ARCHITECTURE

**Generated:** 2025-01-25T04:55:00Z
**Commit:** ed4c850
**Branch:** main

## OVERVIEW

Redux Toolkit + Saga architecture with domain hooks replacing React Context. Non-serializable state for service instances.

## STRUCTURE

```
store/
├── index.ts              # Store config with saga middleware + serializable check exemptions
├── reducers.ts            # Root reducer combining all slices
├── types.ts              # RootState type definition
├── hooks.ts              # Domain-specific hooks (useAuth, useInventory, etc.)
├── sagas/
│   ├── index.ts          # Root saga forking all domain sagas
│   ├── authSaga.ts       # Auth flow with API client initialization
│   ├── inventorySaga.ts   # CRUD with optimistic updates
│   ├── todoSaga.ts       # CRUD with optimistic updates
│   ├── syncSaga.ts       # Sync service + event channel pattern
│   └── settingsSaga.ts   # Settings load/update with i18n
└── slices/
    ├── authSlice.ts       # Auth state + ApiClient instance (non-serializable)
    ├── inventorySlice.ts   # Inventory + memoized selectors
    ├── todoSlice.ts       # Todos + memoized selectors
    ├── syncSlice.ts       # Sync state + SyncService instance
    ├── settingsSlice.ts   # Settings + update result tracking
    ├── uiSlice.ts         # UI state (home category)
    └── refreshSlice.ts    # Refresh callback Set (non-serializable)
```

## WHERE TO LOOK

| Task          | Location                            | Notes                                                              |
| ------------- | ----------------------------------- | ------------------------------------------------------------------ |
| Domain hooks  | `hooks.ts`                          | useAuth, useSettings, useTodos, useSync, useInventory, useCategory |
| API client    | Select via `state.auth.apiClient`   | Never new ApiClient() in components                                |
| Sync service  | Select via `state.sync.syncService` | Lazy init in syncSaga                                              |
| Saga watchers | `sagas/*.ts`                        | use `takeLatest`, access API client via `select()`                 |
| Slice actions | `slices/*.ts`                       | set{Property} for updates, silent{Operation} for background        |

## CONVENTIONS

- **Saga access pattern**: `const apiClient = yield select((s) => s.auth.apiClient)`
- **Slice naming**: `{domain}Slice.ts` → reducer export → import in reducers.ts
- **Action types**: `DOMAIN/OPERATION` (e.g., `'inventory/CREATE_ITEM'`)
- **Silent updates**: `silentSetItems`, `silentSetItems` - no loading state change
- **Optimistic updates**: Update state before API call, refresh silently on error
- **Watcher pattern**: Each saga has single watcher function using `takeLatest`

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** use React Context for domain state - use hooks from `store/hooks.ts`
- **NEVER** store ApiClient/SyncService in Redux without serializableCheck exemption
- **NEVER** mix saga concerns - one operation per watcher pattern
