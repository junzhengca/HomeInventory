/**
 * Logger Utility
 *
 * A configurable logging system with support for:
 * - Log levels (silent, error, warn, info, debug, verbose)
 * - Category-based filtering
 * - Optional timestamps
 * - Emojis for easy visual identification
 * - Environment variable configuration
 *
 * Environment Variables:
 * - EXPO_PUBLIC_LOG_LEVEL: Global log level (default: 'info')
 * - EXPO_PUBLIC_LOG_CATEGORIES: Comma-separated categories to enable (default: all)
 * - EXPO_PUBLIC_LOG_TIMESTAMPS: Show timestamps (default: 'true')
 * - EXPO_PUBLIC_LOG_EMOJIS: Show emojis (default: 'true')
 *
 * Log Levels (in order of verbosity):
 * - silent: No output
 * - error: Errors only
 * - warn: Warnings and errors
 * - info: Info, warnings, and errors
 * - debug: Debug, info, warnings, and errors
 * - verbose: Everything including detailed traces
 */

import Constants from 'expo-constants';

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'verbose';

export type LogCategory =
  | 'api'       // API client requests/responses
  | 'sync'      // Sync service operations
  | 'auth'      // Authentication operations
  | 'storage'   // Local storage/file operations
  | 'navigation' // Navigation events
  | 'ui'        // UI events and interactions
  | 'redux'     // Redux state changes
  | 'saga'      // Redux saga operations
  | 'network'   // Network status and connectivity
  | 'image'     // Image processing and uploads
  | 'ai'        // AI recognition operations
  | 'general';  // General logging

interface LogLevelConfig {
  level: LogLevel;
  priority: number;
  emoji: string;
  color: string;
}

const LOG_LEVELS: Record<LogLevel, LogLevelConfig> = {
  silent:  { level: 'silent',  priority: 0,  emoji: '',              color: '' },
  error:   { level: 'error',   priority: 1,  emoji: '🚨',            color: '\x1b[31m' }, // Red
  warn:    { level: 'warn',    priority: 2,  emoji: '⚠️',            color: '\x1b[33m' }, // Yellow
  info:    { level: 'info',    priority: 3,  emoji: 'ℹ️',            color: '\x1b[36m' }, // Cyan
  debug:   { level: 'debug',   priority: 4,  emoji: '🔍',            color: '\x1b[35m' }, // Magenta
  verbose: { level: 'verbose', priority: 5,  emoji: '🔬',            color: '\x1b[34m' }, // Blue
};

const CATEGORY_EMOJIS: Record<LogCategory, string> = {
  api:        '🌐',
  sync:       '🔄',
  auth:       '🔐',
  storage:    '💾',
  navigation: '🧭',
  ui:         '🎨',
  redux:      '🗂️',
  saga:       '⚙️',
  network:    '📡',
  image:      '🖼️',
  ai:         '🤖',
  general:    '📝',
};

/**
 * Read environment variable helper
 */
function getEnvVar(key: string, defaultValue: string): string {
  // Try Constants.expoConfig.extra first (Expo SDK 46+), then Constants.manifest.extra
  const extras = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
  const value = extras[key];
  return value !== undefined ? String(value) : defaultValue;
}

/**
 * Parse boolean environment variable
 */
function getEnvBool(key: string, defaultValue: boolean): boolean {
  const value = getEnvVar(key, '');
  if (value === '' || value === defaultValue.toString()) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get current log level from environment
 */
function getCurrentLogLevel(): LogLevel {
  const level = getEnvVar('EXPO_PUBLIC_LOG_LEVEL', 'info').toLowerCase();
  if (level in LOG_LEVELS) {
    return level as LogLevel;
  }
  return 'info';
}

/**
 * Parse enabled categories from environment
 */
function getEnabledCategories(): Set<LogCategory> | null {
  const categoriesStr = getEnvVar('EXPO_PUBLIC_LOG_CATEGORIES', '');
  if (!categoriesStr || categoriesStr === '' || categoriesStr === '*') {
    return null; // null means all categories enabled
  }
  const categories = categoriesStr.split(',').map(c => c.trim().toLowerCase()) as LogCategory[];
  const validCategories = categories.filter(c => c in CATEGORY_EMOJIS || c === 'general');
  return new Set(validCategories);
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  enabledCategories: Set<LogCategory> | null;
  showTimestamps: boolean;
  showEmojis: boolean;
}

/**
 * Logger interface for ScopedLogger dependency
 */
interface ILogger {
  error(message: string, category?: LogCategory, data?: unknown): void;
  warn(message: string, category?: LogCategory, data?: unknown): void;
  info(message: string, category?: LogCategory, data?: unknown): void;
  debug(message: string, category?: LogCategory, data?: unknown): void;
  verbose(message: string, category?: LogCategory, data?: unknown): void;
  separator(category?: LogCategory, char?: string): void;
  header(title: string, category?: LogCategory): void;
  subHeader(title: string, category?: LogCategory): void;
  start(operation: string, category?: LogCategory, details?: Record<string, unknown>): void;
  end(operation: string, category?: LogCategory, durationMs?: number): void;
  fail(operation: string, error: Error | unknown, category?: LogCategory): void;
  step(step: string, stepNumber?: number, totalSteps?: number, category?: LogCategory): void;
  request(method: string, url: string, category?: LogCategory, details?: Record<string, unknown>): void;
  response(status: number, url: string, category?: LogCategory, durationMs?: number, details?: Record<string, unknown>): void;
  retry(attempt: number, maxRetries: number, delayMs: number, category?: LogCategory): void;
  dataSize(label: string, bytes: number, category?: LogCategory): void;
  table(data: Record<string, unknown> | unknown[], category?: LogCategory): void;
}

/**
 * Scoped Logger - pre-configured for a specific category
 */
class ScopedLogger {
  constructor(private logger: ILogger, private category: LogCategory) {}

  error(message: string, data?: unknown): void {
    this.logger.error(message, this.category, data);
  }

  warn(message: string, data?: unknown): void {
    this.logger.warn(message, this.category, data);
  }

  info(message: string, data?: unknown): void {
    this.logger.info(message, this.category, data);
  }

  debug(message: string, data?: unknown): void {
    this.logger.debug(message, this.category, data);
  }

  verbose(message: string, data?: unknown): void {
    this.logger.verbose(message, this.category, data);
  }

  separator(char: string = '='): void {
    this.logger.separator(this.category, char);
  }

  header(title: string): void {
    this.logger.header(title, this.category);
  }

  subHeader(title: string): void {
    this.logger.subHeader(title, this.category);
  }

  start(operation: string, details?: Record<string, unknown>): void {
    this.logger.start(operation, this.category, details);
  }

  end(operation: string, durationMs?: number): void {
    this.logger.end(operation, this.category, durationMs);
  }

  fail(operation: string, error: Error | unknown): void {
    this.logger.fail(operation, error, this.category);
  }

  step(step: string, stepNumber?: number, totalSteps?: number): void {
    this.logger.step(step, stepNumber, totalSteps, this.category);
  }

  request(method: string, url: string, details?: Record<string, unknown>): void {
    this.logger.request(method, url, this.category, details);
  }

  response(status: number, url: string, durationMs?: number, details?: Record<string, unknown>): void {
    this.logger.response(status, url, this.category, durationMs, details);
  }

  retry(attempt: number, maxRetries: number, delayMs: number): void {
    this.logger.retry(attempt, maxRetries, delayMs, this.category);
  }

  dataSize(label: string, bytes: number): void {
    this.logger.dataSize(label, bytes, this.category);
  }

  table(data: Record<string, unknown> | unknown[]): void {
    this.logger.table(data, this.category);
  }
}

class Logger {
  private config: LoggerConfig = {
    level: getCurrentLogLevel(),
    enabledCategories: getEnabledCategories(),
    showTimestamps: getEnvBool('EXPO_PUBLIC_LOG_TIMESTAMPS', true),
    showEmojis: getEnvBool('EXPO_PUBLIC_LOG_EMOJIS', true),
  };

  /**
   * Check if a log should be output based on level and category
   */
  private shouldLog(level: LogLevel, category?: LogCategory): boolean {
    const currentLevelPriority = LOG_LEVELS[this.config.level].priority;
    const logLevelPriority = LOG_LEVELS[level].priority;

    if (logLevelPriority > currentLevelPriority) {
      return false;
    }

    if (category && this.config.enabledCategories) {
      return this.config.enabledCategories.has(category) || this.config.enabledCategories.has('general');
    }

    return true;
  }

  /**
   * Format log message with optional timestamp and emojis
   */
  private formatMessage(
    level: LogLevel,
    category: LogCategory | undefined,
    message: string,
    _emojiOverride?: string
  ): string {
    const parts: string[] = [];

    // Timestamp
    if (this.config.showTimestamps) {
      const now = new Date();
      const timestamp = now.toISOString().split('T')[1].slice(0, -1); // HH:MM:SS.mmm
      parts.push(`[${timestamp}]`);
    }

    // Level emoji
    if (this.config.showEmojis) {
      const levelEmoji = LOG_LEVELS[level].emoji;
      if (levelEmoji) {
        parts.push(levelEmoji);
      }
    }

    // Category emoji
    if (this.config.showEmojis && category) {
      const categoryEmoji = CATEGORY_EMOJIS[category] || CATEGORY_EMOJIS.general;
      parts.push(categoryEmoji);
    }

    // Category name (in brackets for clarity)
    if (category) {
      parts.push(`[${category.toUpperCase()}]`);
    }

    // Message
    parts.push(message);

    return parts.join(' ');
  }

  /**
   * Get ANSI color code for log level (works in Metro console)
   */
  private getColor(level: LogLevel): string {
    return LOG_LEVELS[level].color;
  }

  /**
   * Reset color
   */
  private resetColor(): string {
    return '\x1b[0m';
  }

  /**
   * Log an error message
   */
  error(message: string, category?: LogCategory, data?: unknown): void {
    if (!this.shouldLog('error', category)) return;

    const formatted = this.formatMessage('error', category, message);
    const color = this.getColor('error');
    const reset = this.resetColor();

    console.error(`${color}${formatted}${reset}`);
    if (data !== undefined) {
      console.error(`${color}${this.formatMessage('error', category, 'Data:', '')}${reset}`, data);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, category?: LogCategory, data?: unknown): void {
    if (!this.shouldLog('warn', category)) return;

    const formatted = this.formatMessage('warn', category, message);
    const color = this.getColor('warn');
    const reset = this.resetColor();

    console.warn(`${color}${formatted}${reset}`);
    if (data !== undefined) {
      console.warn(`${color}${this.formatMessage('warn', category, 'Data:', '')}${reset}`, data);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, category?: LogCategory, data?: unknown): void {
    if (!this.shouldLog('info', category)) return;

    const formatted = this.formatMessage('info', category, message);
    const color = this.getColor('info');
    const reset = this.resetColor();

    console.log(`${color}${formatted}${reset}`);
    if (data !== undefined) {
      console.log(`${color}${this.formatMessage('info', category, 'Data:', '')}${reset}`, data);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, category?: LogCategory, data?: unknown): void {
    if (!this.shouldLog('debug', category)) return;

    const formatted = this.formatMessage('debug', category, message);
    const color = this.getColor('debug');
    const reset = this.resetColor();

    console.log(`${color}${formatted}${reset}`);
    if (data !== undefined) {
      console.log(`${color}${this.formatMessage('debug', category, 'Data:', '')}${reset}`, data);
    }
  }

  /**
   * Log a verbose message (highest detail)
   */
  verbose(message: string, category?: LogCategory, data?: unknown): void {
    if (!this.shouldLog('verbose', category)) return;

    const formatted = this.formatMessage('verbose', category, message);
    const color = this.getColor('verbose');
    const reset = this.resetColor();

    console.log(`${color}${formatted}${reset}`);
    if (data !== undefined) {
      console.log(`${color}${this.formatMessage('verbose', category, 'Data:', '')}${reset}`, data);
    }
  }

  /**
   * Log a separator line for visual clarity
   */
  separator(category?: LogCategory, char: string = '='): void {
    if (!this.shouldLog('info', category)) return;

    const line = char.repeat(50);
    const formatted = this.formatMessage('info', category, line);
    console.log(formatted);
  }

  /**
   * Log a section header
   */
  header(title: string, category?: LogCategory): void {
    if (!this.shouldLog('info', category)) return;

    this.separator(category, '=');
    this.info(title, category);
    this.separator(category, '=');
  }

  /**
   * Log a subsection header
   */
  subHeader(title: string, category?: LogCategory): void {
    if (!this.shouldLog('info', category)) return;

    this.separator(category, '-');
    this.info(title, category);
    this.separator(category, '-');
  }

  /**
   * Log the start of an operation
   */
  start(operation: string, category?: LogCategory, details?: Record<string, unknown>): void {
    if (!this.shouldLog('info', category)) return;

    const emoji = this.config.showEmojis ? '▶️' : '';
    const message = `${emoji} ${operation} - START`;
    this.info(message, category);

    if (details) {
      this.verbose('Details:', category, details);
    }
  }

  /**
   * Log the end of an operation
   */
  end(operation: string, category?: LogCategory, durationMs?: number): void {
    if (!this.shouldLog('info', category)) return;

    const emoji = this.config.showEmojis ? '✅' : '';
    const durationMsg = durationMs !== undefined ? ` (${durationMs}ms)` : '';
    const message = `${emoji} ${operation} - COMPLETE${durationMsg}`;
    this.info(message, category);
  }

  /**
   * Log the failure of an operation
   */
  fail(operation: string, error: Error | unknown, category?: LogCategory): void {
    if (!this.shouldLog('error', category)) return;

    const emoji = this.config.showEmojis ? '❌' : '';
    const errorMessage = error instanceof Error ? error.message : String(error);
    const message = `${emoji} ${operation} - FAILED: ${errorMessage}`;
    this.error(message, category);
  }

  /**
   * Log a step in a multi-step operation
   */
  step(step: string, stepNumber?: number, totalSteps?: number, category?: LogCategory): void {
    if (!this.shouldLog('debug', category)) return;

    const emoji = this.config.showEmojis ? '📍' : '';
    const stepInfo = stepNumber !== undefined && totalSteps !== undefined
      ? ` [${stepNumber}/${totalSteps}]`
      : '';
    this.debug(`${emoji}${stepInfo} ${step}`, category);
  }

  /**
   * Log an incoming request
   */
  request(method: string, url: string, category: LogCategory = 'api', details?: Record<string, unknown>): void {
    if (!this.shouldLog('debug', category)) return;

    const emoji = this.config.showEmojis ? '⬆️' : '';
    this.debug(`${emoji} REQUEST: ${method} ${url}`, category, details);
  }

  /**
   * Log an incoming response
   */
  response(status: number, url: string, category: LogCategory = 'api', durationMs?: number, details?: Record<string, unknown>): void {
    if (!this.shouldLog('debug', category)) return;

    const emoji = this.config.showEmojis ? '⬇️' : '';
    const duration = durationMs !== undefined ? ` (${durationMs}ms)` : '';
    this.debug(`${emoji} RESPONSE: ${status} ${url}${duration}`, category, details);
  }

  /**
   * Log network retry
   */
  retry(attempt: number, maxRetries: number, delayMs: number, category: LogCategory = 'api'): void {
    if (!this.shouldLog('warn', category)) return;

    const emoji = this.config.showEmojis ? '🔁' : '';
    this.warn(`${emoji} RETRY: Attempt ${attempt}/${maxRetries} in ${delayMs.toFixed(0)}ms`, category);
  }

  /**
   * Log data size information
   */
  dataSize(label: string, bytes: number, category?: LogCategory): void {
    if (!this.shouldLog('verbose', category)) return;

    const kb = (bytes / 1024).toFixed(2);
    const emoji = this.config.showEmojis ? '📦' : '';
    this.verbose(`${emoji} ${label}: ${bytes} bytes (${kb} KB)`, category);
  }

  /**
   * Log a table of data (if available)
   */
  table(data: Record<string, unknown> | unknown[], category?: LogCategory): void {
    if (!this.shouldLog('debug', category)) return;

    if (typeof console.table === 'function') {
      console.table(data);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * Create a scoped logger for a specific category
   */
  scoped(category: LogCategory): ScopedLogger {
    return new ScopedLogger(this, category);
  }

  /**
   * Reload configuration from environment
   */
  reloadConfig(): void {
    this.config = {
      level: getCurrentLogLevel(),
      enabledCategories: getEnabledCategories(),
      showTimestamps: getEnvBool('EXPO_PUBLIC_LOG_TIMESTAMPS', true),
      showEmojis: getEnvBool('EXPO_PUBLIC_LOG_EMOJIS', true),
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Global singleton instance
const logger = new Logger();

// Export the singleton and scoped creator
export default logger;
export { logger, Logger, ScopedLogger, LogCategory, LogLevel };

// Convenience: export scoped loggers for common categories
export const apiLogger = logger.scoped('api');
export const syncLogger = logger.scoped('sync');
export const authLogger = logger.scoped('auth');
export const storageLogger = logger.scoped('storage');
export const uiLogger = logger.scoped('ui');
export const reduxLogger = logger.scoped('redux');
export const sagaLogger = logger.scoped('saga');
export const networkLogger = logger.scoped('network');
export const imageLogger = logger.scoped('image');
export const aiLogger = logger.scoped('ai');
