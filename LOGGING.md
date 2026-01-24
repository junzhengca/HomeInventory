# Logging Configuration Guide

This document explains how to configure and use the logging system in Cluttr.

## Overview

Cluttr uses a centralized logging system (`src/utils/Logger.ts`) that provides:
- Configurable log levels
- Category-based filtering
- Optional timestamps
- Emoji indicators for easy visual scanning
- Consistent formatting across the app

## Environment Variables

All logging is configured via environment variables in your `.env` file:

### `EXPO_PUBLIC_LOG_LEVEL`

Controls the overall verbosity of logging. Available levels (from least to most verbose):

| Level | Description |
|-------|-------------|
| `silent` | No logging output |
| `error` | Only errors |
| `warn` | Warnings and errors |
| `info` | Info, warnings, and errors (default) |
| `debug` | Debug, info, warnings, and errors |
| `verbose` | Maximum detail including all traces |

**Example:**
```bash
EXPO_PUBLIC_LOG_LEVEL=debug
```

### `EXPO_PUBLIC_LOG_CATEGORIES`

Filter logs by category. Use `*` for all categories, or specify a comma-separated list.

| Category | Description |
|----------|-------------|
| `api` | API client requests/responses |
| `sync` | Sync service operations |
| `auth` | Authentication operations |
| `storage` | Local storage/file operations |
| `navigation` | Navigation events |
| `ui` | UI events and interactions |
| `redux` | Redux state changes |
| `saga` | Redux saga operations |
| `network` | Network status and connectivity |
| `image` | Image processing and uploads |
| `ai` | AI recognition operations |
| `general` | General logging |

**Examples:**
```bash
# All categories (default)
EXPO_PUBLIC_LOG_CATEGORIES=*

# Only sync and API logging
EXPO_PUBLIC_LOG_CATEGORIES=sync,api

# Multiple specific categories
EXPO_PUBLIC_LOG_CATEGORIES=sync,auth,storage
```

### `EXPO_PUBLIC_LOG_TIMESTAMPS`

Include timestamps in log messages.

```bash
EXPO_PUBLIC_LOG_TIMESTAMPS=true   # Show timestamps (default)
EXPO_PUBLIC_LOG_TIMESTAMPS=false  # Hide timestamps
```

### `EXPO_PUBLIC_LOG_EMOJIS`

Include emoji icons for easy visual identification.

```bash
EXPO_PUBLIC_LOG_EMOJIS=true   # Show emojis (default)
EXPO_PUBLIC_LOG_EMOJIS=false  # Hide emojis
```

## Log Output Format

When enabled, logs are displayed in the following format:

```
[HH:MM:SS.mmm] 🔄 [SYNC] Initializing sync service...
```

Breaking down the components:
- `[HH:MM:SS.mmm]` - Timestamp (if enabled)
- `🔄` - Category emoji (if enabled)
- `[SYNC]` - Log category
- `Initializing sync service...` - Log message

## Emoji Indicators

| Emoji | Usage |
|-------|-------|
| 🚨 | Errors |
| ⚠️ | Warnings |
| ℹ️ | Info |
| 🔍 | Debug |
| 🔬 | Verbose |
| 🌐 | API requests |
| 🔄 | Sync operations |
| 🔐 | Authentication |
| 💾 | Storage |
| 🧭 | Navigation |
| 🎨 | UI |
| 🗂️ | Redux |
| ⚙️ | Saga |
| 📡 | Network |
| 🖼️ | Images |
| 🤖 | AI |
| 📝 | General |
| ▶️ | Operation start |
| ✅ | Operation complete |
| ❌ | Operation failed |
| 🔁 | Retry |
| 📦 | Data size |

## Common Scenarios

### Debug Sync Issues

```bash
EXPO_PUBLIC_LOG_LEVEL=debug
EXPO_PUBLIC_LOG_CATEGORIES=sync,api,storage
```

### Debug API Requests

```bash
EXPO_PUBLIC_LOG_LEVEL=debug
EXPO_PUBLIC_LOG_CATEGORIES=api
```

### Debug Authentication

```bash
EXPO_PUBLIC_LOG_LEVEL=debug
EXPO_PUBLIC_LOG_CATEGORIES=auth,api
```

### Maximum Verbosity (Development)

```bash
EXPO_PUBLIC_LOG_LEVEL=verbose
EXPO_PUBLIC_LOG_CATEGORIES=*
```

### Production (Minimal Logging)

```bash
EXPO_PUBLIC_LOG_LEVEL=error
EXPO_PUBLIC_LOG_CATEGORIES=*
```

## Using the Logger in Code

```typescript
import { syncLogger, apiLogger } from '../utils/Logger';

// Basic logging
syncLogger.info('Sync started');
syncLogger.error('Sync failed', error);
syncLogger.warn('Deprecated API used');

// With data
syncLogger.debug('Sync metadata', metadata);

// Operation lifecycle
syncLogger.start('Full sync');
// ... do work ...
syncLogger.end('Full sync', durationMs);
syncLogger.fail('Full sync', error);

// Specialized logging
apiLogger.request('GET', '/api/users');
apiLogger.response(200, '/api/users', 150);
syncLogger.dataSize('Request body', 1024);
syncLogger.retry(2, 3, 1000);

// Scoped logger
import { logger } from '../utils/Logger';
const customLogger = logger.scoped('sync');
customLogger.info('This goes to the sync category');
```

## Applying Configuration Changes

After modifying `.env`:

1. **Development**: Restart the Expo dev server
   ```bash
   npm start
   ```

2. **Production**: Rebuild the app
   ```bash
   npm run ios
   # or
   npm run android
   ```

## Troubleshooting

### Logs Not Appearing

1. Check that `EXPO_PUBLIC_LOG_LEVEL` is set appropriately
2. Verify your category is in `EXPO_PUBLIC_LOG_CATEGORIES` (or use `*`)
3. Ensure the `.env` file is in the project root
4. Restart the dev server after changing `.env`

### Too Many Logs

1. Set `EXPO_PUBLIC_LOG_LEVEL` to a higher level (e.g., `warn` or `error`)
2. Use specific categories in `EXPO_PUBLIC_LOG_CATEGORIES`
3. Disable emojis or timestamps if needed: `EXPO_PUBLIC_LOG_EMOJIS=false`

### Emoji Display Issues

If emojis don't display correctly in your terminal:
```bash
EXPO_PUBLIC_LOG_EMOJIS=false
```
