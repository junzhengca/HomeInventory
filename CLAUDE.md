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
```

### Building (via Makefile)
```bash
make install-deps                    # Install dependencies with --legacy-peer-deps
make install-eas                     # Install EAS CLI globally
make build-ios-local                 # Build iOS simulator locally
make build-android-local             # Build Android emulator locally
make build-ios-internal-local-app    # Build iOS internal distribution locally
make build-android-internal-local-app # Build Android internal distribution locally
make clean                           # Clean build artifacts
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

### Data Synchronization

The sync system (`src/services/SyncService.ts`) handles:
- Pull/push data to server
- Local file system backup (JSON files)
- Household sharing with permission-based access
- Conflict resolution and retry logic

Sync file types: `categories`, `locations`, `inventoryItems`, `todoItems`, `settings`

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

Example implementation in `src/components/SetupNicknameBottomSheet.tsx`.

### Bottom Sheet Modals

The app heavily uses `@gorhom/bottom-sheet` for modal presentations:
- Form inputs should use `BottomSheetTextInput` component
- Always use `useKeyboardVisibility()` hook for dynamic padding
- Set `android_keyboardInputMode="adjustResize"` for keyboard handling

### Error Handling

Global error handler displays errors in a bottom sheet. Set up in `App.tsx`:
```typescript
import { setGlobalErrorHandler } from './store/sagas/authSaga';
setGlobalErrorHandler(showErrorBottomSheet);
```

## Code Organization

```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (minimal - mostly replaced by Redux hooks)
├── data/               # Local data file management (JSON file I/O)
├── hooks/              # Custom React hooks (useToast, useKeyboardVisibility, etc.)
├── i18n/               # Internationalization setup
├── navigation/         # React Navigation configuration
├── screens/            # Screen components
├── services/           # Business logic layer (ApiClient, AuthService, SyncService, etc.)
├── store/              # Redux store, slices, sagas, hooks
├── theme/              # Theme provider and styling configuration
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Cursor Rules

The following Cursor rules should be respected:

1. **pinyin-input-pattern.mdc** - Use uncontrolled inputs for IME composition support
2. **eslint-ensure.mdc** - Always run ESLint to ensure edits pass lint rules

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
