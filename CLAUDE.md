# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cluttr** is a React Native home inventory management application built with Expo. It allows users to track household items, manage todos, and share data with family members through a household-based sharing system.

## Development Commands

### Running the App
```bash
npm start              # Start Expo development server
npm run ios           # Start iOS simulator
npm run android       # Start Android emulator
npm run web           # Start web version
```

### Code Quality
```bash
npm run format        # Format code with Prettier
npm run format:check  # Check formatting
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues automatically
npm run build         # Run TypeScript compiler check
```

### Building (via Makefile)
```bash
make install-deps                    # Install dependencies with --legacy-peer-deps
make install-eas                     # Install EAS CLI globally
make build-ios-local                 # Build iOS simulator locally (development)
make build-android-local             # Build Android emulator locally (development)
make build-all-internal-local        # Build both platforms locally (development)
make build-ios-internal-local-app    # Build iOS internal distribution locally
make build-android-internal-local-app # Build Android internal distribution locally
make build-all-internal-local-app    # Build both platforms locally (internal)
make build-ios-production-local      # Build iOS production variant locally (auto-increments build number)
make clean                           # Clean build artifacts
make register-device                 # Register a new device on EAS (interactive)
```

See `make help` for all available targets.

### Google OAuth Setup

The app uses **iOS and Android OAuth client IDs** (NOT Web client IDs) with custom URI scheme `com.cluttrapp.cluttr://`.

Required environment variables:
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` - Google OAuth iOS Client ID
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` - Google OAuth Android Client ID

See README.md for detailed Google OAuth configuration instructions.

## Architecture

### Technology Stack
- **Framework**: React Native 0.81.5 with Expo ~54.0.31
- **Language**: TypeScript 5.9.3
- **Navigation**: React Navigation 7.x (Bottom tabs + Stack navigation)
- **State Management**: Redux Toolkit + Redux Saga
- **Styling**: Styled Components
- **Internationalization**: i18next (English and Chinese/zh-CN)

### State Management Pattern

The app uses **Redux hooks** instead of React Context for state management. Domain-specific hooks in `src/store/hooks.ts` replace context providers:

```typescript
// Instead of useContext, use these hooks:
import { useAuth, useSettings, useTodos, useSync, useInventory, useCategory, useSelectedCategory } from '../store/hooks';

const { user, isAuthenticated, getApiClient } = useAuth();
const { items, createItem, updateItem } = useInventory();
```

### API Client Architecture

**CRITICAL**: All components must use the shared `getApiClient()` method from `useAuth()` hook. Never manually initialize ApiClient in components.

```typescript
// CORRECT - Use shared API client
const { getApiClient } = useAuth();
const apiClient = getApiClient();  // Returns ApiClient | null

// WRONG - Manual initialization (inconsistent, loses error handlers)
const apiClient = new ApiClient(baseUrl);
```

The shared ApiClient is initialized once in `src/store/sagas/authSaga.ts` with:
- Automatic retry logic with exponential backoff
- Auth error callback (triggers logout on 401)
- Global error callback (shows error bottom sheet)

### Redux Saga Pattern

Async operations use Redux Saga. The flow: `Component dispatches action → Saga picks up action → API call → State updates`.

Sagas access the API client via:
```typescript
const apiClient: ApiClient = yield select((state: RootState) => state.auth.apiClient);
```

### Non-Serializable State

Redux store contains non-serializable values (ignored in serializableCheck):
- `auth.apiClient` - ApiClient class instance
- `sync.syncService` - SyncService class instance
- `refresh.categoryCallbacks` - Set of callback functions

### Home-Scoped Data Architecture

All data (inventory items, todos, categories) is scoped to the **active home**. This is the fundamental data isolation model.

- `activeHomeId` in Redux `auth` state is the source of truth for which home is selected
- `useHome()` hook (`src/hooks/useHome.ts`) manages home CRUD and switching via `HomeService`
- `HomeService` (`src/services/HomeService.ts`) uses RxJS `BehaviorSubject` for reactive home state
- `FileSystemService` scopes files by appending `_{homeId}` to filenames (e.g., `items_abc123.json`)
- Global files (like `settings.json`, `homes.json`) are NOT home-scoped

**File scoping in sagas**: Each saga uses `getFileUserId()` to extract `activeHomeId` for file operations:
```typescript
function* getFileUserId() {
  const state: RootState = yield select();
  return state.auth.activeHomeId || undefined;
}
```

### Sync Architecture

**Sync ordering** (in `inventorySaga.ts`): Homes sync first, then per-home content:
1. `homeService.syncHomes(apiClient)` - sync home list
2. For each home: `syncItems()` → `syncCategories()` → `syncTodos()`
3. Silent refresh of active home's UI state

**Pending-state pattern**: All entities (Home, InventoryItem, TodoItem, Category) carry sync metadata:
- `pendingCreate`, `pendingUpdate`, `pendingDelete` - offline operation flags
- `clientUpdatedAt` / `serverUpdatedAt` - conflict detection timestamps
- `version` - optimistic concurrency (on items/todos)
- `lastSyncedAt` - last successful sync timestamp

Homes also have `pendingJoin` and `pendingLeave` flags. The `homes$` observable filters out pending-delete/leave homes so UI updates immediately.

**Device identification**: `getDeviceId()` from `src/utils/deviceUtils.ts` provides a persistent device ID (stored in SecureStore) passed to batch sync requests.

### Household Sharing

Users can share their inventory and todos with family members via invitation codes. Key concepts:
- Each account is a "household" with a 16-character invitation code
- Account settings control sharing permissions (`canShareInventory`, `canShareTodos`)
- Members can pull shared data but cannot push to shared accounts
- Maximum 20 members per household

See `SHARING_API.md` for detailed API documentation.

## Important Patterns

### Chinese Pinyin/IME Input Pattern

For text inputs in bottom sheet modals, use **uncontrolled inputs** to prevent IME composition interruption. This is critical for Chinese text input.

See `.cursor/rules/pinyin-input-pattern.mdc` for full pattern documentation.

Key points:
- Use `defaultValue` instead of `value` prop
- Store current value in refs (update on `onChangeText`)
- Sync to React state only on blur or submit
- Reset form with `key` prop increment

Example implementations in `src/components/organisms/SetupNicknameBottomSheet.tsx` and the reusable `src/hooks/useUncontrolledItemForm.ts` hook.

### Styled Components Pattern

Inject theme via styled components:

```typescript
import { StyledProps } from '../utils/styledComponents';

const StyledComponent = styled.View(({ theme }: StyledProps) => ({
  backgroundColor: theme.colors.background,
  padding: theme.spacing.md,
}));
```

### Bottom Sheet Modals

The app heavily uses `@gorhom/bottom-sheet` for modal presentations:
- Form inputs should use `BottomSheetTextInput` component
- Always use `useKeyboardVisibility()` hook for dynamic padding
- Set `android_keyboardInputMode="adjustResize"` for keyboard handling

**CRITICAL**: Always set `backgroundStyle={{ backgroundColor: 'transparent' }}` on `BottomSheetModal` when using a custom `ContentContainer` with border radius. This prevents a double-layered visual artifact where both the modal and content container have their own backgrounds with different border radii.

```typescript
<BottomSheetModal
  ref={bottomSheetRef}
  snapPoints={snapPoints}
  backgroundStyle={{ backgroundColor: 'transparent' }}  // Prevents double-layer artifact
>
  <ContentContainer>
    {/* Content with consistent border radius */}
  </ContentContainer>
</BottomSheetModal>
```

### Modal Form Pattern

**CRITICAL**: For modals with forms, ALWAYS pre-fill the form BEFORE presenting the modal. This ensures:
1. Form is fully initialized with current values when shown
2. Validation state is correct from the start
3. No flicker or delay in form population

**Pattern**: Use `forwardRef` with `useImperativeHandle` to expose a `present()` method that accepts initial data.

```typescript
// 1. Define a ref type with present method
export interface EditSomethingBottomSheetRef {
  present: (initialData: string | ItemType) => void;
}

// 2. Use forwardRef and useImperativeHandle
export const EditSomethingBottomSheet = forwardRef<
  EditSomethingBottomSheetRef,
  EditSomethingBottomSheetProps
>(({ bottomSheetRef, onSubmitted }, ref) => {
  // State for initial data (triggers form population)
  const [initialData, setInitialData] = useState<ItemType | null>(null);
  const [defaultInputValue, setDefaultInputValue] = useState('');

  // Populate form when initialData changes
  useEffect(() => {
    if (initialData) {
      valueRef.current = initialData.value;
      setDefaultInputValue(initialData.value);
      setIsValid(initialData.value.trim().length > 0);
    }
  }, [initialData]);

  // Expose present method
  useImperativeHandle(
    ref,
    () => ({
      present: (data: ItemType) => {
        setInitialData(data);  // Triggers form population
        setTimeout(() => {
          bottomSheetRef.current?.present();  // Present after state update
        }, 0);
      },
    }),
    [bottomSheetRef]
  );

  // Reset form on close
  const handleSheetClose = useCallback(() => {
    setInitialData(null);
    setDefaultInputValue('');
    valueRef.current = '';
    setIsValid(false);
  }, []);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      onChange={(index) => {
        if (index === -1) handleSheetClose();
      }}
    >
      <UncontrolledInput defaultValue={defaultInputValue} />
    </BottomSheetModal>
  );
});
```

**Parent component usage**:
```typescript
// Need TWO refs:
const bottomSheetModalRef = useRef<BottomSheetModal | null>(null);
const editSheetRef = useRef<EditSomethingBottomSheetRef | null>(null);

// Present with data
<EditSomethingBottomSheet
  ref={editSheetRef}
  bottomSheetRef={bottomSheetModalRef}
/>

editSheetRef.current?.present(currentData);
```

Reference implementations:
- `src/components/organisms/EditItemBottomSheet.tsx` - Complex form with multiple fields
- `src/components/organisms/EditNicknameBottomSheet.tsx` - Simple single-field form

### Event Handler Parameter Pattern

**CRITICAL**: React Native and React event handlers pass an **event object** as the first argument. If you have a handler with optional/default parameters like `handleClose(skipDirtyCheck = false)`, the parameter will receive the event object instead of the default value.

**This applies to ALL event handlers**:
- React Native: `TouchableOpacity`, `TouchableHighlight`, `TouchableWithoutFeedback`, `Pressable`, `Button` (via `onPress`), `TextInput` (via `onChangeText`, `onSubmitEditing`), `ScrollView` (via `onScroll`)
- React/React Native Web: `onClick`, `onChange`, `onSubmit`, `onFocus`, `onBlur`, etc.

**Problem**:
```typescript
// WRONG - skipDirtyCheck receives the event object, not false
const handleClose = useCallback((skipDirtyCheck = false) => {
  if (!skipDirtyCheck && isFormDirty()) {  // Always false because event object is truthy!
    showConfirmation();
  }
}, []);

<TouchableOpacity onPress={handleClose}>
  <Ionicons name="close" />
</TouchableOpacity>
```

**Solution 1** - Check the type of the parameter:
```typescript
// CORRECT - Check if parameter is actually a boolean
const handleClose = useCallback((skipDirtyCheck?: boolean | React.Event) => {
  const shouldSkipCheck = typeof skipDirtyCheck === 'boolean' ? skipDirtyCheck : false;
  if (!shouldSkipCheck && isFormDirty()) {
    showConfirmation();
  }
}, []);
```

**Solution 2** - Use an arrow function wrapper:
```typescript
// ALSO CORRECT - Arrow function wrapper
const handleClose = useCallback((skipDirtyCheck: boolean) => {
  if (!skipDirtyCheck && isFormDirty()) {
    showConfirmation();
  }
}, []);

<TouchableOpacity onPress={() => handleClose(false)}>
  <Ionicons name="close" />
</TouchableOpacity>

<Pressable onPress={() => handleClose(false)}>
  <Ionicons name="close" />
</Pressable>

<button onClick={() => handleClose(false)}>
  Close
</button>
```

### Reanimated & Interactions

**CRITICAL**: Reanimated Worklets run on the UI thread. In production (Hermes), you cannot pass functions across the UI -> JS bridge.

**Worklet Function Passing**:
```typescript
// CRASHES IN PRODUCTION (Hermes) - items contains functions
runOnJS(showMenu)({ items, layout });

// CORRECT - Use a closure on JS thread
const onShowMenu = (layout) => showMenu({ items, layout });
runOnJS(onShowMenu)(layout);
```

**Press Interactions & Unmounting**:
When a `Pressable` action causes the parent to unmount (e.g., closing a context menu), execution can crash if the action modifies state synchronously during the touch event.

**Pattern**: Defer "destructive" or "hiding" actions to the next frame.
```typescript
onPress={() => {
  hideMenu(); // State update
  requestAnimationFrame(() => { // Defer action
    try { item.onPress(); } catch (e) { console.error(e); }
  });
}}
```

### Error Handling

Global error handler displays errors in a bottom sheet. Set up in `App.tsx`:
```typescript
import { setGlobalErrorHandler } from './store/sagas/authSaga';
setGlobalErrorHandler(showErrorBottomSheet);
```

## Code Organization

```
src/
├── components/          # Reusable UI components (atomic design pattern)
│   ├── atoms/          # Basic UI elements (Button, Input, Toast, etc.)
│   ├── molecules/      # Simple composites (ItemCard, TodoCard, SearchInput, etc.)
│   └── organisms/      # Complex components (CreateItemBottomSheet, LoginBottomSheet, etc.)
├── contexts/           # Largely replaced by Redux hooks (minimal usage)
├── data/               # Static config (categories, locations, statuses)
├── hooks/              # Custom React hooks (useToast, useKeyboardVisibility, etc.)
├── i18n/               # i18next internationalization (en, zh-CN)
├── navigation/         # React Navigation (2-level: RootStack → MainTabs)
├── screens/            # Screen components
├── services/           # Business logic (ApiClient, AuthService, SyncService, etc.)
├── store/              # Redux Toolkit + Saga (slices/, sagas/, hooks.ts)
├── theme/              # Theme provider and styled-components configuration
├── types/              # TypeScript type definitions
└── utils/              # Utility functions (Logger, formatters, validation)
```

## Anti-Patterns to Avoid

- **NEVER** manually initialize ApiClient in components - always use `useAuth().getApiClient()`
- **NEVER** use controlled inputs (`value` prop) in bottom sheet modals - breaks IME composition
- **NEVER** use Web OAuth client IDs - only iOS (`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`) and Android (`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`)
- **NEVER** use `console.log()` - use the Logger from `src/utils/Logger.ts`
- **NEVER** suppress type errors with `as any` or `@ts-ignore`
- **NEVER** populate modal forms after presentation - ALWAYS pre-fill before presenting via `present(data)` method
- **NEVER** omit `backgroundStyle={{ backgroundColor: 'transparent' }}` on `BottomSheetModal` when using custom `ContentContainer` - causes double-layer visual artifact
- **NEVER** assume handler parameters have default values when used with event handlers - ALL event handlers (`onPress`, `onClick`, `onChange`, etc.) pass an event object as first argument, always check `typeof param` or use arrow function wrapper

## Cursor Rules

The following Cursor rules in `.cursor/rules/` should be respected:

1. **pinyin-input-pattern.mdc** - Use uncontrolled inputs for IME composition support
2. **eslint-ensure.mdc** - Always run `npm run lint` after edits to ensure code passes lint rules

## Post-Change Verification

**CRITICAL**: After ANY code changes, you MUST run both lint and build checks to ensure code quality:

```bash
npm run lint    # Check for linting errors
npm run build   # Run TypeScript compiler check
```

Both commands MUST pass with no errors before considering a change complete.

## Environment

API base URL is configurable via `EXPO_PUBLIC_API_BASE_URL` (defaults to `https://home-inventory-api.logicore.digital`).

App configuration is in `app.json` (bundle identifier: `com.cluttrapp.cluttr`, custom scheme: `com.cluttrapp.cluttr`).

## Logging

The app uses a centralized logging system (`src/utils/Logger.ts`) with configurable verbosity.

**IMPORTANT**: Use the logger instead of `console.log()` for consistent, configurable logging:
```typescript
import { syncLogger, apiLogger, authLogger } from '../utils/Logger';

// Basic logging
syncLogger.info('Sync started');
syncLogger.error('Sync failed', error);
syncLogger.warn('Deprecated API used');

// Operation lifecycle
syncLogger.start('Full sync');
// ... do work ...
syncLogger.end('Full sync', durationMs);
syncLogger.fail('Full sync', error);

// Create a scoped logger for custom categories
import { logger } from '../utils/Logger';
const customLogger = logger.scoped('myFeature');
```

### Configuration via .env
- `EXPO_PUBLIC_LOG_LEVEL`: silent | error | warn | info | debug | verbose
- `EXPO_PUBLIC_LOG_CATEGORIES`: Comma-separated list (api, sync, auth, storage, etc.) or * for all
- `EXPO_PUBLIC_LOG_TIMESTAMPS`: true/false
- `EXPO_PUBLIC_LOG_EMOJIS`: true/false

See `LOGGING.md` for detailed documentation.
