import * as SecureStore from 'expo-secure-store';
import { Category, Location, InventoryItem, TodoItem } from '../types/inventory';
import { Settings } from '../types/settings';
import { AccessibleAccount } from '../types/api';
import { syncCallbackRegistry } from './SyncCallbackRegistry';
import { syncLogger, storageLogger } from '../utils/Logger';

// File types that can be synced
export type SyncFileType = 'categories' | 'locations' | 'inventoryItems' | 'todoItems' | 'settings';

// Sync request/response types
export interface SyncFileData<T> {
  version: string;
  deviceId: string;
  syncTimestamp: string;
  deviceName?: string;
  userId?: string;
  data: T;
}

export interface FileSyncState {
  lastSyncTime: string;
  lastServerTimestamp: string;
  syncCount: number;
  lastSyncStatus: 'success' | 'partial' | 'error';
}

export interface SyncMetadata {
  deviceId: string;
  deviceName?: string;
  categories: FileSyncState;
  locations: FileSyncState;
  inventoryItems: FileSyncState;
  todoItems: FileSyncState;
  settings: FileSyncState;
}

// Queue task type
interface SyncTask {
  id: string;
  fileType: SyncFileType;
  operation: 'pull' | 'push' | 'full';
  priority: 'high' | 'normal' | 'low';
  timestamp: number;
  retries: number;
  maxRetries: number;
  userId?: string;
}

// Sync event type
export interface SyncChanges<T = string> {
  added: T[];
  updated: T[];
  removed: string[];
}

export interface SyncEvent {
  type: 'pull' | 'push' | 'error';
  fileType: SyncFileType;
  timestamp?: string;
  entriesCount?: number;
  error?: string;
  changes?: SyncChanges<unknown>;
}

class SyncService {
  private apiClient: {
    request: <T>(endpoint: string, options: { method: string; body?: unknown; requiresAuth?: boolean }) => Promise<T>;
  };
  private deviceId: string | null = null;
  private userId: string | undefined = undefined;
  private ownerId: string | undefined = undefined;
  private accessibleAccounts: AccessibleAccount[] = [];
  private syncQueue: SyncTask[] = [];
  private isProcessing: boolean = false;
  private syncMetadata: SyncMetadata | null = null;
  private syncInterval: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<(event: SyncEvent) => void> = new Set();
  private inFlightSyncs: Map<string, Promise<void>> = new Map(); // Track in-flight syncs by fileType+operation
  private lastSyncTime: Map<string, number> = new Map(); // Track last sync time per fileType to debounce
  private isInitialSyncRunning: boolean = false; // Track if initial sync is running
  private isMergingData: boolean = false; // Track if we're currently merging data (to suppress callbacks)
  private lastCleanupTime: Map<string, number> = new Map(); // Track last cleanup time per fileType
  private readonly SYNC_DEBOUNCE_MS = 1000; // Minimum time between syncs for the same fileType
  private readonly CLEANUP_RETENTION_DAYS = 7; // Days to keep deleted items before permanent removal
  private readonly CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Run cleanup at most once per day

  constructor(apiClient: {
    request: <T>(endpoint: string, options: { method: string; body?: unknown; requiresAuth?: boolean }) => Promise<T>;
  }) {
    this.apiClient = apiClient;
  }

  /**
   * Initialize sync service
   */
  async initialize(deviceName?: string, userId?: string, ownerId?: string, accessibleAccounts?: AccessibleAccount[]): Promise<void> {
    syncLogger.header('INITIALIZING SYNC SERVICE');

    // Set user ID
    if (userId) {
      this.userId = userId;
      syncLogger.info(`Initialized with user ID: ${userId}`);
    }

    if (ownerId) {
      this.ownerId = ownerId;
      syncLogger.info(`Initialized with owner ID: ${ownerId}`);
    } else if (userId && !this.ownerId) {
      this.ownerId = userId;
      syncLogger.info(`Initialized owner ID from user ID: ${userId}`);
    }

    if (accessibleAccounts) {
      this.accessibleAccounts = accessibleAccounts;
      syncLogger.info(`Initialized with ${accessibleAccounts.length} accessible account(s)`);
    }

    // Get or create device ID
    this.deviceId = await SecureStore.getItemAsync('device_id');
    if (!this.deviceId) {
      this.deviceId = this.generateDeviceId();
      await SecureStore.setItemAsync('device_id', this.deviceId);
      syncLogger.info(`Generated new device ID: ${this.deviceId}`);
    } else {
      syncLogger.info(`Using existing device ID: ${this.deviceId}`);
    }

    // Load sync metadata
    await this.loadSyncMetadata();

    // Update device name if provided
    if (deviceName && this.syncMetadata) {
      this.syncMetadata = {
        ...this.syncMetadata,
        deviceName,
      };
      await this.saveSyncMetadata();
    }

    // Check sync_enabled in persisted storage
    const syncEnabledStr = await SecureStore.getItemAsync('sync_enabled');
    if (syncEnabledStr === null) {
      await SecureStore.setItemAsync('sync_enabled', 'false');
      syncLogger.warn('No sync state found - initialized to disabled (default)');
    } else {
      syncLogger.info(`Sync persisted state found: "${syncEnabledStr}"`);
    }

    syncLogger.end('SYNC SERVICE INITIALIZATION');
  }

  /**
   * Set user ID and reset metadata if it changed
   */
  async setUserId(userId: string | undefined): Promise<void> {
    if (this.userId !== userId) {
      syncLogger.info(`Changing user ID from ${this.userId} to ${userId}. Resetting sync metadata.`);
      this.userId = userId;
      await this.resetSyncMetadata();
    }
  }

  /**
   * Update accessible accounts
   */
  setAccessibleAccounts(accounts: AccessibleAccount[]): void {
    this.accessibleAccounts = accounts;
    syncLogger.debug(`Updated accessible accounts: ${accounts.length} accounts`);
  }

  /**
   * Check if current user has permission for a specific file type and target user
   */
  hasPermission(fileType: SyncFileType, targetUserId?: string): boolean {
    const userId = targetUserId || this.userId;

    // If no userId is provided or resolved, it's the current user's local context
    // which always has permission to sync.
    if (!userId) {
      return true;
    }

    // Always allow settings sync
    if (fileType === 'settings') {
      return true;
    }

    // Owner always has permission for their own data
    if (userId === this.ownerId) {
      return true;
    }

    // Check permissions in accessible accounts
    const account = this.accessibleAccounts.find(a => a.userId === userId);
    if (!account) {
      // If we don't have this account in accessible accounts, we probably don't have access
      syncLogger.warn(`No accessible account found for user ${userId}. Sync blocked for ${fileType}.`);
      return false;
    }

    // If they are the owner of the account being synced, they have full access (should be caught by userId === this.ownerId above)
    if (account.isOwner) {
      return true;
    }

    // Check specific permissions
    if (!account.permissions) {
      syncLogger.warn(`No permissions defined for accessible account ${userId}. Sync blocked for ${fileType}.`);
      return false;
    }

    if (fileType === 'inventoryItems' || fileType === 'categories' || fileType === 'locations') {
      return account.permissions.canShareInventory;
    }

    if (fileType === 'todoItems') {
      return account.permissions.canShareTodos;
    }

    return false;
  }

  /**
   * Reset sync metadata to default state
   */
  async resetSyncMetadata(): Promise<void> {
    if (this.deviceId) {
      this.syncMetadata = {
        deviceId: this.deviceId,
        deviceName: this.syncMetadata?.deviceName,
        categories: this.createDefaultSyncState(),
        locations: this.createDefaultSyncState(),
        inventoryItems: this.createDefaultSyncState(),
        todoItems: this.createDefaultSyncState(),
        settings: this.createDefaultSyncState(),
      };
      await this.saveSyncMetadata();
      syncLogger.info('Sync metadata has been reset');
    }
  }

  /**
   * Generate a unique device ID
   */
  private generateDeviceId(): string {
    return `device-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Load sync metadata from secure storage
   * Creates a deep copy to ensure all nested objects are mutable
   */
  private async loadSyncMetadata(): Promise<void> {
    try {
      const metadataStr = await SecureStore.getItemAsync('sync_metadata');
      if (metadataStr) {
        const parsed = JSON.parse(metadataStr);
        // Create a deep copy to ensure all nested objects are mutable
        this.syncMetadata = {
          deviceId: parsed.deviceId,
          deviceName: parsed.deviceName,
          categories: { ...parsed.categories },
          locations: { ...parsed.locations },
          inventoryItems: { ...parsed.inventoryItems },
          todoItems: { ...parsed.todoItems },
          settings: { ...parsed.settings },
        };
        syncLogger.debug('Loaded sync metadata', this.syncMetadata);
      } else {
        // Initialize default metadata
        this.syncMetadata = {
          deviceId: this.deviceId!,
          deviceName: undefined,
          categories: this.createDefaultSyncState(),
          locations: this.createDefaultSyncState(),
          inventoryItems: this.createDefaultSyncState(),
          todoItems: this.createDefaultSyncState(),
          settings: this.createDefaultSyncState(),
        };
        await this.saveSyncMetadata();
        syncLogger.info('Created default sync metadata');
      }
    } catch (error) {
      syncLogger.error('Error loading sync metadata', error);
    }
  }

  /**
   * Create default sync state for a file type
   */
  private createDefaultSyncState(): FileSyncState {
    return {
      lastSyncTime: '',
      lastServerTimestamp: '',
      syncCount: 0,
      lastSyncStatus: 'success',
    };
  }

  /**
   * Save sync metadata to secure storage
   */
  private async saveSyncMetadata(): Promise<void> {
    try {
      if (this.syncMetadata) {
        await SecureStore.setItemAsync('sync_metadata', JSON.stringify(this.syncMetadata));
        storageLogger.debug('Saved sync metadata', { metadata: this.syncMetadata });
      }
    } catch (error) {
      storageLogger.error('Error saving sync metadata', error);
    }
  }

  /**
   * Enable sync and start periodic syncing
   * State is persisted atomically before starting sync operations
   * This method is idempotent - calling it multiple times is safe
   */
  async enable(): Promise<void> {
    syncLogger.info('Enabling sync...');

    // Check if sync is already enabled and running
    if (this.syncInterval !== null) {
      syncLogger.info('Sync is already enabled and running (interval exists), skipping enable');
      return;
    }

    // Persist enabled state FIRST (atomic operation)
    // This ensures state is saved even if sync operations fail
    await SecureStore.setItemAsync('sync_enabled', 'true');

    // Verify it was persisted
    const persisted = await SecureStore.getItemAsync('sync_enabled');
    syncLogger.debug(`Sync enabled state persisted. Verification: persisted = ${persisted}`);

    try {
      syncLogger.info('Starting initial sync...');

      // Perform initial full sync FIRST (before starting periodic sync)
      await this.performInitialSync();

      // Start periodic sync every 5 minutes AFTER initial sync completes
      this.syncInterval = setInterval(() => {
        this.syncAllHomes();
      }, 5 * 60 * 1000);

      syncLogger.end('SYNC ENABLED - initial sync completed, periodic sync started');
    } catch (error) {
      syncLogger.fail('Sync enable', error);
      // State is already persisted, so sync will be restored on next app start
      // Re-throw to let caller handle the error
      throw error;
    }
  }

  /**
   * Disable sync and stop periodic syncing
   * State is persisted atomically before stopping operations
   */
  async disable(): Promise<void> {
    syncLogger.info('Disabling sync...');

    // Persist disabled state FIRST (atomic operation)
    // This ensures state is saved immediately
    await SecureStore.setItemAsync('sync_enabled', 'false');
    storageLogger.debug('Sync disabled state persisted');

    // Stop periodic sync immediately
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      syncLogger.debug('Periodic sync interval cleared');
    }

    // Clear queue to prevent new syncs
    this.syncQueue = [];
    syncLogger.debug('Sync queue cleared');

    // Wait for any in-flight syncs to complete (with timeout)
    const promises = Array.from(this.inFlightSyncs.values());
    if (promises.length > 0) {
      syncLogger.info(`Waiting for ${promises.length} in-flight sync(s) to complete before disabling...`);
      try {
        await Promise.race([
          Promise.all(promises),
          new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
        ]);
        syncLogger.info('All in-flight syncs completed or timed out');
      } catch (error) {
        syncLogger.error('Error waiting for in-flight syncs', error);
      }
    }

    // Clear in-flight syncs and last sync times
    this.inFlightSyncs.clear();
    this.lastSyncTime.clear();
    this.isInitialSyncRunning = false;

    syncLogger.end('SYNC DISABLED - all operations stopped and state cleared');
  }

  /**
   * Check if sync is enabled
   * Always reads from persisted storage as the single source of truth
   */
  async isEnabled(targetUserId?: string): Promise<boolean> {
    // If syncing a foreign user (not self), sync is MANDATORY
    if (targetUserId && this.userId && targetUserId !== this.userId) {
      syncLogger.debug(`Mandatory sync for foreign user ${targetUserId}`);
      return true;
    }

    // Always check persisted state as the single source of truth
    const syncEnabledStr = await SecureStore.getItemAsync('sync_enabled');
    const persistedEnabled = syncEnabledStr === 'true';

    syncLogger.debug(`Checking sync enabled state: persisted=${syncEnabledStr ?? 'null'}, enabled=${persistedEnabled}`);

    return persistedEnabled;
  }

  // ... (rest of file)


  /**
   * Perform initial full sync for all file types
   */
  private async performInitialSync(): Promise<void> {
    syncLogger.start('INITIAL FULL SYNC');
    this.isInitialSyncRunning = true;

    try {
      const fileTypes: SyncFileType[] = ['categories', 'locations', 'inventoryItems', 'todoItems', 'settings'];

      // Queue all initial syncs with high priority
      // They will be processed sequentially by the queue
      for (const fileType of fileTypes) {
        this.queueSync(fileType, 'full', 'high');
      }

      // Wait for all queued syncs to complete
      await this.waitForQueueToComplete();

      syncLogger.end('Initial full sync completed');
    } catch (error) {
      syncLogger.error('Error during initial sync', error);
    } finally {
      this.isInitialSyncRunning = false;
    }
  }

  /**
   * Wait for queue and in-flight syncs to complete
   */
  private async waitForQueueToComplete(): Promise<void> {
    // Wait for queue to be processed
    while (this.syncQueue.length > 0 || this.isProcessing) {
      await this.delay(100);
    }

    // Wait for any remaining in-flight syncs
    const promises = Array.from(this.inFlightSyncs.values());
    if (promises.length > 0) {
      syncLogger.info(`Waiting for ${promises.length} in-flight syncs to complete...`);
      await Promise.all(promises);
    }
  }

  /**
   * Sync all file types
   */
  async syncAll(userId?: string): Promise<void> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      syncLogger.info('Sync is disabled, skipping sync all');
      return;
    }

    // Skip periodic sync if initial sync is running
    if (this.isInitialSyncRunning) {
      syncLogger.info('Initial sync is running, skipping periodic sync');
      return;
    }

    const targetUserId = userId || this.userId;
    syncLogger.info(`Syncing all file types for user ${targetUserId || 'default'}...`);

    const fileTypes: SyncFileType[] = ['categories', 'locations', 'inventoryItems', 'todoItems', 'settings'];

    for (const fileType of fileTypes) {
      // Check permission before queuing
      if (this.hasPermission(fileType, targetUserId)) {
        // Do full sync (pull + push) to ensure bidirectional sync
        this.queueSync(fileType, 'full', 'normal', targetUserId);
      } else {
        syncLogger.warn(`Skipping ${fileType} sync for user ${targetUserId}: Insufficient permission`);
      }
    }
  }

  /**
   * Sync all accessible homes
   */
  async syncAllHomes(): Promise<void> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      syncLogger.info('Sync is disabled, skipping sync all homes');
      return;
    }

    syncLogger.header('SYNC ALL HOMES');

    try {
      // Get all accessible accounts
      const response = await this.apiClient.request<{ accounts: { userId: string }[] }>('/api/accounts', {
        method: 'GET',
        requiresAuth: true,
      });

      const accounts = response.accounts || [];
      syncLogger.info(`Found ${accounts.length} accessible account(s)`);

      for (const account of accounts) {
        await this.syncAll(account.userId);
      }
    } catch (error) {
      syncLogger.error('Error syncing all homes:', error);
      // Fallback: just sync current home
      await this.syncAll();
    }
  }

  /**
   * Queue a sync task
   */
  async queueSync(fileType: SyncFileType, operation: 'pull' | 'push' | 'full', priority: 'high' | 'normal' | 'low' = 'normal', userId?: string): Promise<void> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      syncLogger.info(`Sync is disabled, ignoring ${operation} queue for ${fileType}`);
      return;
    }

    const targetUserId = userId || this.userId;

    // Check permission before queuing
    if (!this.hasPermission(fileType, targetUserId)) {
      syncLogger.warn(`Sync BLOCKED for ${fileType} (user: ${targetUserId}) due to insufficient permissions.`);
      return;
    }

    const taskKey = `${fileType}-${operation}-${targetUserId || 'default'}`;

    // Check if there's already an in-flight sync for this fileType+operation
    if (this.inFlightSyncs.has(taskKey)) {
      syncLogger.debug(`Sync already in-flight for ${taskKey}, skipping duplicate request`);
      return;
    }

    // If trying to do pull/push, check if a full sync is in progress for this fileType+userId
    if (operation !== 'full') {
      const fullSyncKey = `${fileType}-full-${targetUserId || 'default'}`;
      if (this.inFlightSyncs.has(fullSyncKey)) {
        syncLogger.debug(`Full sync in progress for ${fileType} (user ${targetUserId || 'default'}), skipping ${operation} request`);
        return;
      }
    }

    // If trying to do full sync, check if any sync is in progress for this fileType+userId
    if (operation === 'full') {
      const pullKey = `${fileType}-pull-${targetUserId || 'default'}`;
      const pushKey = `${fileType}-push-${targetUserId || 'default'}`;
      if (this.inFlightSyncs.has(pullKey) || this.inFlightSyncs.has(pushKey)) {
        syncLogger.debug(`Pull or push in progress for ${fileType} (user ${targetUserId || 'default'}), skipping full sync request`);
        return;
      }
    }

    // Debounce: Check if we recently synced this fileType
    const lastSync = this.lastSyncTime.get(fileType);
    const now = Date.now();
    if (lastSync && (now - lastSync) < this.SYNC_DEBOUNCE_MS) {
      syncLogger.debug(`Debouncing sync for ${fileType}, last sync was ${now - lastSync}ms ago`);
      return;
    }

    // Check if there's already a pending task for this fileType+operation+userId in the queue
    const existingTaskIndex = this.syncQueue.findIndex(
      t => t.fileType === fileType && t.operation === operation && t.userId === targetUserId
    );

    if (existingTaskIndex !== -1) {
      // Replace existing task if new one has higher priority, otherwise skip
      const existingTask = this.syncQueue[existingTaskIndex];
      if (priority === 'high' && existingTask.priority !== 'high') {
        syncLogger.info(`Replacing existing ${existingTask.priority} priority task with high priority for ${taskKey}`);
        this.syncQueue.splice(existingTaskIndex, 1);
      } else {
        syncLogger.debug(`Task already queued for ${taskKey}, skipping duplicate`);
        return;
      }
    }

    const task: SyncTask = {
      id: `${fileType}-${operation}-${Date.now()}`,
      fileType,
      operation,
      priority,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
      userId: targetUserId,
    };

    syncLogger.debug('Queuing sync task', task);

    // Insert task based on priority
    if (priority === 'high') {
      // High priority goes to front
      this.syncQueue.unshift(task);
    } else {
      this.syncQueue.push(task);
    }

    // Start processing if not already processing
    if (!this.isProcessing) {
      syncLogger.info(`Starting queue processing (queue length: ${this.syncQueue.length})`);
      this.processQueue();
    } else {
      syncLogger.debug(`Queue already processing, task added to queue (queue length: ${this.syncQueue.length})`);
    }
  }

  /**
   * Process the sync queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.syncQueue.length === 0) {
      if (this.isProcessing) {
        syncLogger.debug(`Queue already processing, skipping (queue length: ${this.syncQueue.length})`);
      } else {
        syncLogger.debug(`Queue is empty, nothing to process`);
      }
      return;
    }

    this.isProcessing = true;
    syncLogger.header('PROCESSING SYNC QUEUE');
    syncLogger.info(`Queue length: ${this.syncQueue.length}`);
    syncLogger.debug('Tasks', this.syncQueue.map(t => ({ id: t.id, fileType: t.fileType, operation: t.operation, priority: t.priority })));

    while (this.syncQueue.length > 0) {
      const task = this.syncQueue.shift()!;
      const remainingTasks = this.syncQueue.length;
      syncLogger.info(`Processing task ${task.id} (${remainingTasks} tasks remaining)`);

      try {
        await this.executeTask(task);
        syncLogger.info(`Task ${task.id} completed successfully`);
      } catch (error) {
        syncLogger.error('Error executing task', { task, error });

        // Retry if max retries not reached
        if (task.retries < task.maxRetries) {
          task.retries++;
          syncLogger.warn(`Retrying task (${task.retries}/${task.maxRetries})`, task);
          this.syncQueue.unshift(task); // Add to front for retry
          await this.delay(1000 * task.retries); // Exponential backoff
        } else {
          syncLogger.error(`Task failed after ${task.maxRetries} retries`, task);
          this.notifyListeners({
            type: 'error',
            fileType: task.fileType,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    this.isProcessing = false;
    syncLogger.end('SYNC QUEUE PROCESSING COMPLETE');
  }

  /**
   * Execute a sync task
   */
  private async executeTask(task: SyncTask): Promise<void> {
    const taskKey = `${task.fileType}-${task.operation}`;

    // Check if already in-flight (shouldn't happen due to queueSync checks, but double-check)
    if (this.inFlightSyncs.has(taskKey)) {
      syncLogger.debug(`Task ${taskKey} already in-flight, skipping`);
      return;
    }

    syncLogger.debug('Executing task', task);

    // Create a promise for this sync operation
    const syncPromise = (async () => {
      try {
        if (task.operation === 'full') {
          await this.syncFile(task.fileType, 'full', task.userId);
        } else if (task.operation === 'pull') {
          await this.pullFile(task.fileType, task.userId);
        } else if (task.operation === 'push') {
          await this.pushFile(task.fileType, task.userId);
        }

        // Update last sync time on success
        this.lastSyncTime.set(task.fileType, Date.now());
      } finally {
        // Remove from in-flight map when done
        this.inFlightSyncs.delete(taskKey);
      }
    })();

    // Track this sync as in-flight
    this.inFlightSyncs.set(taskKey, syncPromise);

    // Wait for the sync to complete
    await syncPromise;
  }

  /**
   * Sync a single file type with pull-merge-push
   */
  async syncFile(fileType: SyncFileType, mode: 'pull' | 'push' | 'full', userId?: string): Promise<void> {
    const targetUserId = userId || this.userId;

    // Final safety check for permissions
    if (!this.hasPermission(fileType, targetUserId)) {
      const errorMsg = `Permission denied for syncing ${fileType} (user: ${targetUserId})`;
      syncLogger.error(errorMsg);
      throw new Error(errorMsg);
    }

    syncLogger.info(`Syncing ${fileType} in ${mode} mode for user ${targetUserId || 'default'}...`);

    if (mode === 'pull') {
      await this.pullFile(fileType, targetUserId);
    } else if (mode === 'push') {
      await this.pushFile(fileType, targetUserId);
    } else {
      // Full sync: pull -> merge -> push
      await this.pullFile(fileType, targetUserId);
      await this.pushFile(fileType, targetUserId);
    }
  }

  /**
   * Pull data from server for a specific file type
   */
  private async pullFile(fileType: SyncFileType, userId?: string): Promise<void> {
    const pullStartTime = Date.now();
    const targetUserId = userId || this.userId;
    syncLogger.header(`PULL FILE START - ${fileType} (user: ${targetUserId || 'default'})`);
    syncLogger.verbose(`Timestamp: ${new Date().toISOString()}`);

    const endpoint = `/api/sync/${fileType}/pull${targetUserId ? `?userId=${targetUserId}` : ''}`;
    const requestDetails = {
      method: 'GET',
      endpoint,
      fileType,
      userId: targetUserId,
      deviceId: this.deviceId,
      deviceName: this.syncMetadata?.deviceName,
    };

    // Log request details
    syncLogger.debug('Pull request details', requestDetails);
    if (this.syncMetadata) {
      syncLogger.verbose('Sync metadata', {
        lastSyncTime: this.syncMetadata[fileType].lastSyncTime,
        lastServerTimestamp: this.syncMetadata[fileType].lastServerTimestamp,
        syncCount: this.syncMetadata[fileType].syncCount,
        lastSyncStatus: this.syncMetadata[fileType].lastSyncStatus,
      });
    }

    try {
      const response = await this.apiClient.request<{
        success: boolean;
        data?: unknown;
        serverTimestamp: string;
        lastSyncTime: string;
      }>(endpoint, {
        method: 'GET',
        requiresAuth: true,
      });

      const pullDuration = Date.now() - pullStartTime;
      syncLogger.header(`PULL RESPONSE RECEIVED - ${fileType}`);
      syncLogger.info(`Duration: ${pullDuration}ms`);
      syncLogger.info(`Response Success: ${response.success}`);
      syncLogger.info(`Server Timestamp: ${response.serverTimestamp}`);
      syncLogger.info(`Last Sync Time: ${response.lastSyncTime}`);

      if (response.data !== undefined) {
        const dataStr = JSON.stringify(response.data);
        const dataSize = new Blob([dataStr]).size;
        const dataLength = Array.isArray(response.data) ? response.data.length : 1;
        syncLogger.verbose(`Response Data Size: ${dataSize} bytes`);
        syncLogger.verbose(`Response Data Length: ${dataLength} items`);
        syncLogger.verbose('Response Data', response.data);
      } else {
        syncLogger.verbose('Response Data: (undefined)');
      }

      if (response.success && response.data !== undefined) {
        // Merge server data with local data
        if (fileType === 'settings') {
          await this.mergeSettings(response.data as Settings, targetUserId);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const changes = await this.mergeEntries(fileType, response.data as unknown[], targetUserId) as any;
          // Cleanup old deleted items after merging (only for non-settings file types)
          await this.cleanupDeletedItems(fileType, targetUserId);

          this.notifyListeners({
            type: 'pull',
            fileType,
            timestamp: response.serverTimestamp,
            changes: changes as SyncChanges<unknown>,
          });
        }

        // Update sync metadata (create new object to avoid read-only property issues)
        if (this.syncMetadata) {
          this.syncMetadata = {
            ...this.syncMetadata,
            [fileType]: {
              ...this.syncMetadata[fileType],
              lastSyncTime: response.lastSyncTime,
              lastServerTimestamp: response.serverTimestamp,
              lastSyncStatus: 'success' as const,
              syncCount: this.syncMetadata[fileType].syncCount + 1,
            },
          };
          await this.saveSyncMetadata();
        }

        if (fileType === 'settings') {
          this.notifyListeners({
            type: 'pull',
            fileType,
            timestamp: response.serverTimestamp,
          });
        }

        syncLogger.end(`Pull completed successfully for ${fileType}`);
      } else {
        syncLogger.warn(`Pull response indicates failure or no data for ${fileType}`);
        syncLogger.end('PULL FILE COMPLETE (NO DATA)');
      }
    } catch (error) {
      // Verbose error logging
      const errorDetails: {
        request: typeof requestDetails;
        error: string;
        errorMessage?: string;
        status?: number;
        responseBody?: unknown;
      } = {
        request: requestDetails,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      // Extract response body and status from error if available
      if (error instanceof Error) {
        errorDetails.errorMessage = error.message;
        const errorWithResponse = error as Error & { responseBody?: unknown; status?: number };
        if (errorWithResponse.responseBody !== undefined) {
          errorDetails.responseBody = errorWithResponse.responseBody;
        }
        if (errorWithResponse.status !== undefined) {
          errorDetails.status = errorWithResponse.status;
        }
      }

      const pullDuration = Date.now() - pullStartTime;
      syncLogger.fail(`PULL FILE FAILED - ${fileType}`, errorDetails);
      syncLogger.verbose(`Duration: ${pullDuration}ms`);
      syncLogger.verbose('Full error object', error);

      if (this.syncMetadata) {
        // Update sync metadata (create new object to avoid read-only property issues)
        this.syncMetadata = {
          ...this.syncMetadata,
          [fileType]: {
            ...this.syncMetadata[fileType],
            lastSyncStatus: 'error' as const,
          },
        };
        await this.saveSyncMetadata();
      }

      this.notifyListeners({
        type: 'error',
        fileType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Push merged data to server for a specific file type
   */
  private async pushFile(fileType: SyncFileType, userId?: string): Promise<void> {
    const pushStartTime = Date.now();
    const targetUserId = userId || this.userId;
    // If target is self (owner), use undefined to access default (unscoped) files
    const fileUserId = targetUserId === this.ownerId ? undefined : targetUserId;

    syncLogger.header(`PUSH FILE START - ${fileType} (user: ${targetUserId || 'default'})`);
    syncLogger.verbose(`Timestamp: ${new Date().toISOString()}`);

    let requestBody: SyncFileData<unknown> | null = null;
    const endpoint = `/api/sync/${fileType}/push`;

    try {
      // Get local data
      let data: unknown;

      if (fileType === 'categories') {
        const { getAllCategoriesForSync } = await import('./CategoryService');
        data = await getAllCategoriesForSync(fileUserId);
      } else if (fileType === 'locations') {
        const { getAllLocationsForSync } = await import('./LocationService');
        data = await getAllLocationsForSync(fileUserId);
      } else if (fileType === 'inventoryItems') {
        const { getAllItemsForSync } = await import('./InventoryService');
        data = await getAllItemsForSync(fileUserId);
      } else if (fileType === 'todoItems') {
        const { getAllTodosForSync } = await import('./TodoService');
        data = await getAllTodosForSync(fileUserId);
      } else if (fileType === 'settings') {
        const { getSettings } = await import('./SettingsService');
        data = await getSettings(fileUserId);
      }

      const dataStr = JSON.stringify(data);
      const dataSize = new Blob([dataStr]).size;
      const dataLength = Array.isArray(data) ? data.length : 1;
      syncLogger.verbose(`Local data size: ${dataSize} bytes`);
      syncLogger.verbose(`Local data length: ${dataLength} items`);
      syncLogger.verbose(`Local data for ${fileType}`, data);

      if (this.syncMetadata) {
        syncLogger.verbose('Sync metadata', {
          lastSyncTime: this.syncMetadata[fileType].lastSyncTime,
          lastServerTimestamp: this.syncMetadata[fileType].lastServerTimestamp,
          syncCount: this.syncMetadata[fileType].syncCount,
          lastSyncStatus: this.syncMetadata[fileType].lastSyncStatus,
        });
      }

      // Prepare push request
      requestBody = {
        version: '1.0.0',
        deviceId: this.deviceId!,
        syncTimestamp: new Date().toISOString(),
        deviceName: this.syncMetadata?.deviceName,
        userId: targetUserId || undefined,
        data: data,
      };

      const requestDetails = {
        method: 'POST',
        endpoint,
        fileType,
        deviceId: this.deviceId,
        deviceName: this.syncMetadata?.deviceName,
        syncTimestamp: requestBody.syncTimestamp,
        version: requestBody.version,
        dataSize: new Blob([JSON.stringify(requestBody.data)]).size,
        dataLength: Array.isArray(requestBody.data) ? requestBody.data.length : 1,
      };

      // Log request details
      syncLogger.debug('Push request details', requestDetails);
      syncLogger.verbose('Full request body', requestBody);

      const response = await this.apiClient.request<{
        success: boolean;
        serverTimestamp: string;
        lastSyncTime: string;
        entriesCount: number;
        message?: string;
      }>(endpoint, {
        method: 'POST',
        body: requestBody,
        requiresAuth: true,
      });

      const pushDuration = Date.now() - pushStartTime;
      syncLogger.header(`PUSH RESPONSE RECEIVED - ${fileType}`);
      syncLogger.info(`Duration: ${pushDuration}ms`);
      syncLogger.info(`Response Success: ${response.success}`);
      syncLogger.info(`Server Timestamp: ${response.serverTimestamp}`);
      syncLogger.info(`Last Sync Time: ${response.lastSyncTime}`);
      syncLogger.info(`Entries Count: ${response.entriesCount}`);
      if (response.message) {
        syncLogger.info(`Response Message: ${response.message}`);
      }
      syncLogger.verbose('Full Response', response);

      if (response.success) {
        // Update sync metadata (create new object to avoid read-only property issues)
        if (this.syncMetadata) {
          this.syncMetadata = {
            ...this.syncMetadata,
            [fileType]: {
              ...this.syncMetadata[fileType],
              lastSyncTime: response.lastSyncTime,
              lastServerTimestamp: response.serverTimestamp,
              lastSyncStatus: 'success' as const,
              syncCount: this.syncMetadata[fileType].syncCount + 1,
            },
          };
          await this.saveSyncMetadata();
        }

        this.notifyListeners({
          type: 'push',
          fileType,
          timestamp: response.serverTimestamp,
          entriesCount: response.entriesCount,
        });

        syncLogger.end(`Push completed successfully for ${fileType}`);
      } else {
        syncLogger.warn(`Push response indicates failure for ${fileType}`);
        syncLogger.end('PUSH FILE COMPLETE (FAILED)');
      }
    } catch (error) {
      // Verbose error logging
      const errorDetails: {
        request: {
          method: string;
          endpoint: string;
          fileType: SyncFileType;
          requestBody: SyncFileData<unknown> | null;
        };
        error: string;
        errorMessage?: string;
        status?: number;
        responseBody?: unknown;
      } = {
        request: {
          method: 'POST',
          endpoint,
          fileType,
          requestBody: requestBody,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      // Extract response body and status from error if available
      if (error instanceof Error) {
        errorDetails.errorMessage = error.message;
        const errorWithResponse = error as Error & { responseBody?: unknown; status?: number };
        if (errorWithResponse.responseBody !== undefined) {
          errorDetails.responseBody = errorWithResponse.responseBody;
        }
        if (errorWithResponse.status !== undefined) {
          errorDetails.status = errorWithResponse.status;
        }
      }

      const pushDuration = Date.now() - pushStartTime;
      syncLogger.fail(`PUSH FILE FAILED - ${fileType}`, errorDetails);
      syncLogger.verbose(`Duration: ${pushDuration}ms`);
      syncLogger.verbose('Full error object', error);

      if (this.syncMetadata) {
        // Update sync metadata (create new object to avoid read-only property issues)
        this.syncMetadata = {
          ...this.syncMetadata,
          [fileType]: {
            ...this.syncMetadata[fileType],
            lastSyncStatus: 'error' as const,
          },
        };
        await this.saveSyncMetadata();
      }

      this.notifyListeners({
        type: 'error',
        fileType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Merge entries from server with local data
   */
  private async mergeEntries(fileType: SyncFileType, serverData: unknown[], userId?: string): Promise<void> {
    syncLogger.verbose(`Merging entries for ${fileType}`, serverData);

    // If user is self (owner), use undefined for file operations (unscoped)
    const fileUserId = userId === this.ownerId ? undefined : userId;

    // Suppress sync callbacks during merge to prevent triggering additional syncs
    this.isMergingData = true;
    syncCallbackRegistry.setSuppressCallbacks(true);

    try {
      let localData: unknown[];
      let writeFile: (data: unknown) => Promise<boolean>;

      if (fileType === 'categories') {
        const { getAllCategoriesForSync } = await import('./CategoryService');
        const { readFile: _readFile, writeFile: writeCatFile } = await import('./FileSystemService');
        const localCategories = await getAllCategoriesForSync(fileUserId);
        localData = localCategories;
        writeFile = async (data: unknown) => writeCatFile('categories.json', { categories: data as Category[] }, fileUserId);
      } else if (fileType === 'locations') {
        const { getAllLocationsForSync } = await import('./LocationService');
        const { readFile: _readFile2, writeFile: writeLocFile } = await import('./FileSystemService');
        const localLocations = await getAllLocationsForSync(fileUserId);
        localData = localLocations;
        writeFile = async (data: unknown) => writeLocFile('locations.json', { locations: data as Location[] }, fileUserId);
      } else if (fileType === 'inventoryItems') {
        const { getAllItemsForSync } = await import('./InventoryService');
        const { readFile: _readFile3, writeFile: writeItemFile } = await import('./FileSystemService');
        const localItems = await getAllItemsForSync(fileUserId);
        localData = localItems;
        writeFile = async (data: unknown) => writeItemFile('items.json', { items: data as InventoryItem[] }, fileUserId);
      } else if (fileType === 'todoItems') {
        const { getAllTodosForSync } = await import('./TodoService');
        const { readFile: _readFile4, writeFile: writeTodoFile } = await import('./FileSystemService');
        const localTodos = await getAllTodosForSync(fileUserId);
        localData = localTodos;
        writeFile = async (data: unknown) => writeTodoFile('todos.json', { todos: data as TodoItem[] }, fileUserId);
      } else {
        return;
      }

      // Perform merge
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { merged, changes } = this.mergeByTimestamp(localData as any[], serverData as any[]);
      syncLogger.verbose(`Merged data for ${fileType}`, merged);
      syncLogger.verbose(`Changes for ${fileType}`, changes);

      // Same merged data (callbacks will be suppressed)
      // Only write if there are changes or if server sent data (to ensure consistency)
      // Though mergeByTimestamp will always return merged array
      await writeFile(merged);

      return changes as unknown as void; // Cast to void but actually we want to return changes to the caller, but caller is pullFile which doesn't use it directly yet except for passing to notifyListeners.
      // Wait, pullFile calls this. mergeEntries signature says Promise<void>. 
      // I should refactor mergeEntries to return Promise<SyncChanges<unknown> | void> or store it in a way that pullFile can access.
      // Actually, mergeEntries is private and called by pullFile. I can change the signature.
    } finally {
      // Re-enable sync callbacks after merge completes
      this.isMergingData = false;
      syncCallbackRegistry.setSuppressCallbacks(false);
    }
  }

  /**
   * Merge settings from server with local settings
   */
  private async mergeSettings(serverSettings: Settings, userId?: string): Promise<void> {
    syncLogger.verbose('Merging settings', serverSettings);

    // If user is self (owner), use undefined for file operations (unscoped)
    const fileUserId = userId === this.ownerId ? undefined : userId;

    // Suppress sync callbacks during merge to prevent triggering additional syncs
    this.isMergingData = true;
    syncCallbackRegistry.setSuppressCallbacks(true);

    try {
      const { getSettings } = await import('./SettingsService');
      const { writeFile } = await import('./FileSystemService');

      const localSettings = await getSettings(fileUserId);

      // Use settings with later updatedAt timestamp
      const localTime = new Date(localSettings.updatedAt || localSettings.createdAt || 0);
      const serverTime = new Date(serverSettings.updatedAt || serverSettings.createdAt || 0);

      const merged = serverTime > localTime ? serverSettings : localSettings;

      syncLogger.verbose('Merged settings', merged);

      // Save merged settings (callbacks will be suppressed)
      await writeFile('settings.json', merged, fileUserId);
    } finally {
      // Re-enable sync callbacks after merge completes
      this.isMergingData = false;
      syncCallbackRegistry.setSuppressCallbacks(false);
    }
  }

  /**
   * Merge two arrays of entries by timestamp, handling deletions
   */
  private mergeByTimestamp<T extends { id: string; createdAt?: string; updatedAt?: string; deletedAt?: string }>(
    local: T[],
    server: T[]
  ): { merged: T[]; changes: SyncChanges<T> } {
    syncLogger.verbose(`Merging by timestamp, local count: ${local.length}, server count: ${server.length}`);

    const mergedMap = new Map<string, T>();
    const changes: SyncChanges<T> = {
      added: [],
      updated: [],
      removed: [],
    };

    // Add all local entries
    local.forEach(entry => {
      mergedMap.set(entry.id, entry);
    });

    // Merge with server entries based on timestamps and deletion state
    server.forEach(serverEntry => {
      const localEntry = mergedMap.get(serverEntry.id);

      if (!localEntry) {
        // Entry only exists on server - add it (including if deleted)
        // Only consider it "added" if it's not deleted
        mergedMap.set(serverEntry.id, serverEntry);

        if (!serverEntry.deletedAt) {
          syncLogger.verbose(`Adding new server entry: ${serverEntry.id}`);
          changes.added.push(serverEntry);
        } else {
          syncLogger.verbose(`Server entry is new but deleted, ignoring for UI update: ${serverEntry.id}`);
        }
      } else {
        // Entry exists on both - need to handle deletion state
        const localDeletedAt = localEntry.deletedAt ? new Date(localEntry.deletedAt).getTime() : 0;
        const serverDeletedAt = serverEntry.deletedAt ? new Date(serverEntry.deletedAt).getTime() : 0;
        const localUpdatedAt = new Date(localEntry.updatedAt || localEntry.createdAt || 0).getTime();
        const serverUpdatedAt = new Date(serverEntry.updatedAt || serverEntry.createdAt || 0).getTime();

        // Both deleted - use later deletion timestamp
        if (localDeletedAt > 0 && serverDeletedAt > 0) {
          if (serverDeletedAt > localDeletedAt) {
            syncLogger.verbose(`Both deleted, using server deletion (later): ${serverEntry.id}`);
            mergedMap.set(serverEntry.id, serverEntry);
            // No UI change needed
          } else {
            syncLogger.verbose(`Both deleted, keeping local deletion (later): ${serverEntry.id}`);
          }
        }
        // Server deleted, local not deleted
        else if (serverDeletedAt > 0 && localDeletedAt === 0) {
          // If deletion is more recent than local update, apply deletion
          if (serverDeletedAt > localUpdatedAt) {
            syncLogger.verbose(`Server deleted (more recent than local update), applying deletion: ${serverEntry.id}`);
            mergedMap.set(serverEntry.id, serverEntry);
            changes.removed.push(serverEntry.id);
          } else {
            syncLogger.verbose(`Server deleted but local update is more recent, keeping local: ${serverEntry.id}`);
          }
        }
        // Local deleted, server not deleted
        else if (localDeletedAt > 0 && serverDeletedAt === 0) {
          // If deletion is more recent than server update, keep deletion
          if (localDeletedAt > serverUpdatedAt) {
            syncLogger.verbose(`Local deleted (more recent than server update), keeping deletion: ${serverEntry.id}`);
          } else {
            // Server update is more recent than deletion - restore from server
            syncLogger.verbose(`Local deleted but server update is more recent, restoring from server: ${serverEntry.id}`);
            mergedMap.set(serverEntry.id, serverEntry);
            changes.added.push(serverEntry); // Treated as add since it was deleted locally
          }
        }
        // Neither deleted - use normal timestamp-based merge
        else {
          if (serverUpdatedAt > localUpdatedAt) {
            syncLogger.verbose(`Using server version for entry: ${serverEntry.id}, server time: ${new Date(serverUpdatedAt).toISOString()}, local time: ${new Date(localUpdatedAt).toISOString()}`);
            mergedMap.set(serverEntry.id, serverEntry);
            changes.updated.push(serverEntry);
          } else {
            syncLogger.verbose(`Keeping local version for entry: ${serverEntry.id}, local time: ${new Date(localUpdatedAt).toISOString()}, server time: ${new Date(serverUpdatedAt).toISOString()}`);
          }
        }
      }
    });

    const result = Array.from(mergedMap.values());
    syncLogger.verbose(`Merge completed, result count: ${result.length}`);
    return { merged: result, changes };
  }

  /**
   * Get sync status for all file types
   */
  async getSyncStatus(): Promise<SyncMetadata | null> {
    return this.syncMetadata;
  }

  /**
   * Get sync status for a specific file type
   */
  getFileSyncStatus(fileType: SyncFileType): FileSyncState | null {
    if (!this.syncMetadata) {
      return null;
    }
    return this.syncMetadata[fileType];
  }

  /**
   * Register a listener for sync events
   */
  addListener(listener: (event: SyncEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of a sync event
   */
  private notifyListeners(event: SyncEvent): void {
    syncLogger.debug('Notifying listeners', event);
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        syncLogger.error('Error in listener', error);
      }
    });
  }

  /**
   * Cleanup deleted items older than retention period
   */
  private async cleanupDeletedItems(fileType: SyncFileType, userId?: string): Promise<void> {
    // Check if cleanup should run (at most once per day per file type)
    const lastCleanup = this.lastCleanupTime.get(fileType) || 0;
    const now = Date.now();
    if (now - lastCleanup < this.CLEANUP_INTERVAL_MS) {
      syncLogger.debug(`Skipping cleanup for ${fileType}, last cleanup was ${Math.round((now - lastCleanup) / (60 * 60 * 1000))} hours ago`);
      return;
    }

    syncLogger.info(`Starting cleanup for ${fileType}...`);

    // If user is self (owner), use undefined for file operations (unscoped)
    const fileUserId = userId === this.ownerId ? undefined : userId;

    // Suppress sync callbacks during cleanup
    this.isMergingData = true;
    syncCallbackRegistry.setSuppressCallbacks(true);

    try {
      let allItems: unknown[];
      let writeFile: (data: unknown) => Promise<boolean>;
      const cutoffDate = new Date(now - this.CLEANUP_RETENTION_DAYS * 24 * 60 * 60 * 1000);

      if (fileType === 'categories') {
        const { getAllCategoriesForSync } = await import('./CategoryService');
        const { writeFile: writeCatFile } = await import('./FileSystemService');
        allItems = await getAllCategoriesForSync(fileUserId);
        writeFile = async (data: unknown) => writeCatFile('categories.json', { categories: data as Category[] }, fileUserId);
      } else if (fileType === 'locations') {
        const { getAllLocationsForSync } = await import('./LocationService');
        const { writeFile: writeLocFile } = await import('./FileSystemService');
        allItems = await getAllLocationsForSync(fileUserId);
        writeFile = async (data: unknown) => writeLocFile('locations.json', { locations: data as Location[] }, fileUserId);
      } else if (fileType === 'inventoryItems') {
        const { getAllItemsForSync } = await import('./InventoryService');
        const { writeFile: writeItemFile } = await import('./FileSystemService');
        allItems = await getAllItemsForSync(fileUserId);
        writeFile = async (data: unknown) => writeItemFile('items.json', { items: data as InventoryItem[] }, fileUserId);
      } else if (fileType === 'todoItems') {
        const { getAllTodosForSync } = await import('./TodoService');
        const { writeFile: writeTodoFile } = await import('./FileSystemService');
        allItems = await getAllTodosForSync(fileUserId);
        writeFile = async (data: unknown) => writeTodoFile('todos.json', { todos: data as TodoItem[] }, fileUserId);
      } else {
        return; // Settings don't need cleanup
      }

      // Filter out items with deletedAt older than retention period
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cleaned = (allItems as any[]).filter((item: { deletedAt?: string }) => {
        if (!item.deletedAt) {
          return true; // Keep non-deleted items
        }
        const deletedDate = new Date(item.deletedAt);
        const shouldKeep = deletedDate > cutoffDate;
        if (!shouldKeep) {
          syncLogger.verbose(`Removing item ${(item as { id: string }).id} deleted on ${item.deletedAt}`);
        }
        return shouldKeep;
      });

      const removedCount = allItems.length - cleaned.length;
      if (removedCount > 0) {
        syncLogger.info(`Cleanup removed ${removedCount} old deleted items from ${fileType}`);
        await writeFile(cleaned);
      } else {
        syncLogger.debug(`No old deleted items to remove from ${fileType}`);
      }

      // Update last cleanup time
      this.lastCleanupTime.set(fileType, now);
    } catch (error) {
      syncLogger.error(`Error during cleanup for ${fileType}`, error);
    } finally {
      // Re-enable sync callbacks after cleanup completes
      this.isMergingData = false;
      syncCallbackRegistry.setSuppressCallbacks(false);
    }
  }

  /**
   * Utility: Delay for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources
   * Stops sync operations but does NOT modify persisted sync state
   */
  async cleanup(): Promise<void> {
    syncLogger.info('Cleaning up (stopping sync operations)...');

    // Stop periodic sync immediately
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      syncLogger.debug('Periodic sync interval cleared');
    }

    // Clear queue to prevent new syncs
    this.syncQueue = [];
    syncLogger.debug('Sync queue cleared');

    // Wait for any in-flight syncs to complete (with timeout)
    const promises = Array.from(this.inFlightSyncs.values());
    if (promises.length > 0) {
      syncLogger.info(`Waiting for ${promises.length} in-flight sync(s) to complete...`);
      try {
        await Promise.race([
          Promise.all(promises),
          new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
        ]);
        syncLogger.info('All in-flight syncs completed or timed out');
      } catch (error) {
        syncLogger.error('Error waiting for in-flight syncs', error);
      }
    }

    // Clear in-flight syncs and last sync times
    this.inFlightSyncs.clear();
    this.lastSyncTime.clear();
    this.isInitialSyncRunning = false;

    // Clear listeners
    this.listeners.clear();

    syncLogger.end('Cleanup complete - sync operations stopped, persisted state NOT modified');
  }
}

export default SyncService;

