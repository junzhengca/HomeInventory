# PROJECT KNOWLEDGE BASE

**Generated:** 2025-01-25T04:55:00Z
**Commit:** ed4c850
**Branch:** main

## OVERVIEW

Cluttr: React Native home inventory app with Expo, Redux Toolkit + Saga for state management, bottom-sheet modals with IME-safe uncontrolled inputs for Chinese text.

## STRUCTURE

```
./
├── src/
│   ├── components/        # Reusable UI (41 files, 3 subdirs: ui/, form/)
│   ├── screens/           # Screen components (10 files)
│   ├── store/             # Redux Toolkit + Saga (17 files: slices/, sagas/, hooks.ts)
│   ├── navigation/         # React Navigation 2-level (RootStack + 4 tabs)
│   ├── services/           # Business logic (SyncService, ApiClient, etc.)
│   ├── utils/              # Shared utilities (11 files: Logger, formatters, validation)
│   ├── hooks/              # Custom React hooks (useKeyboardVisibility, useItemForm, useToast)
│   ├── types/              # TypeScript types (inventory, api, settings)
│   ├── theme/              # Styled-components theme
│   ├── i18n/              # i18next locales (en, zh-CN)
│   └── data/               # Static config (categories, locations, statuses)
└── App.tsx               # Entry with provider nesting
```

## WHERE TO LOOK

| Task                | Location                                                                             | Notes                                            |
| ------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Redux state/actions | `src/store/slices/*.ts`, `src/store/sagas/*.ts`                                      | Use domain hooks from `src/store/hooks.ts`       |
| API calls           | `src/services/ApiClient.ts`                                                          | Get client via `useAuth().getApiClient()`        |
| Navigation          | `src/navigation/RootStack.tsx`, `src/navigation/TabNavigator.tsx`                    | 2-level: RootStack (modals) + MainTabs (screens) |
| Sync logic          | `src/services/SyncService.ts`                                                        | File I/O, queue management, conflict resolution  |
| Form patterns       | `src/components/CreateItemBottomSheet.tsx`, `src/components/EditItemBottomSheet.tsx` | IME-safe uncontrolled inputs                     |
| Styling             | `src/theme/ThemeProvider.tsx`, `src/utils/styledComponents.ts`                       | Theme via `useTheme()`, styled via `StyledProps` |

## CONVENTIONS

- **Redux hooks pattern**: Use `useAuth()`, `useInventory()`, etc. from `src/store/hooks.ts` - NOT Context providers
- **Uncontrolled inputs**: Bottom sheet forms use `defaultValue` + refs for IME composition (Chinese Pinyin support)
- **API client**: ALWAYS get from `useAuth().getApiClient()` - never `new ApiClient()`
- **Styled-components**: Inject theme via `({ theme }: StyledProps) => ...`
- **Saga pattern**: Domain sagas in `src/store/sagas/`, watchers use `takeLatest`, access API client via `select()`
- **Selector pattern**: Memoized with `createSelector` (inventorySlice, todoSlice)
- **OAuth client IDs**: Use iOS/Android client IDs (NOT Web) with custom scheme `com.cluttrapp.cluttr://`

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** manually initialize ApiClient in components - use `useAuth().getApiClient()`
- **NEVER** use controlled inputs (`value` prop) in bottom sheet modals - breaks IME composition
- **NEVER** use Web OAuth client IDs - only iOS (`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`) and Android (`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`)
- **NEVER** use `console.log()` - use Logger from `src/utils/Logger.ts`
- **NEVER** suppress type errors with `as any` or `@ts-ignore`
- **ALWAYS** run `npm run lint` after edits (enforced by `.cursor/rules/eslint-ensure.mdc`)

## UNIQUE STYLES

- **Dual-state IME pattern**: Store form values in refs (update on `onChangeText`), sync to state on blur/submit, reset with `key` prop
- **Non-serializable Redux**: ApiClient instance, SyncService instance, callback Sets stored in state (explicitly ignored in serializableCheck)
- **Optimistic updates**: Inventory/todo sagas update state before API call, refresh silently on success/failure
- **Callback suppression dance**: `syncCallbackRegistry.setSuppressCallbacks(true)` during sync operations to prevent cascading updates
- **Promise-based hooks**: `useSettings()` uses Promise + timeout to track update completion
- **2-level navigation**: RootStack (modals/screens) → MainTabs (bottom tabs) → Home/Notes/Share/Settings stacks

## COMMANDS

```bash
# Development
npm start              # Expo dev server
npm run ios            # iOS simulator
npm run android          # Android emulator
npm run web            # Web version

# Code quality
npm run format          # Format code
npm run format:check    # Check formatting
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues

# Build (via Makefile)
make install-deps                    # npm install --legacy-peer-deps
make build-ios-local                 # Local iOS build
make build-android-local             # Local Android build
make build-ios-internal-local        # Local internal IPA
make build-android-internal-local    # Local internal APK
make build-ios-production-local      # Local production build (auto-increments build number)
```

## NOTES

- **SyncService is largest file** (1234 lines) - god object handling queue, merge, cleanup; consider extraction
- **Bottom sheets duplicate** ~80% code between CreateItem and EditItemBottomSheet - extract to generic component
- **No testing infrastructure** - no test files or Jest config
- **Build artifacts committed** - build-_.tar.gz, build-_.ipa in root should be gitignored
- **Empty src/contexts/** - Redux hooks replaced Context, remove this directory
- **IME composition critical** - Chinese input requires uncontrolled pattern to prevent keyboard reset on each keystroke
