import * as SecureStore from 'expo-secure-store';
import { Category, Location, InventoryItem, TodoItem } from '../types/inventory';
import { Settings } from '../types/settings';
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
}

// Sync event type
export interface SyncEvent {
  type: 'pull' | 'push' | 'error';
  fileType: SyncFileType;
  timestamp?: string;
  entriesCount?: number;
  error?: string;
}

class SyncService {
  private apiClient: {
    request: <T>(endpoint: string, options: { method: string; body?: unknown; requiresAuth?: boolean }) => Promise<T>;
  };
  private deviceId: string | null = null;
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
  async initialize(deviceName?: string): Promise<void> {
    syncLogger.header('INITIALIZING SYNC SERVICE');

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

      // Start periodic sync every 5 seconds AFTER initial sync completes
      this.syncInterval = setInterval(() => {
        this.syncAll();
      }, 5000);

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
  async isEnabled(): Promise<boolean> {
    // Always check persisted state as the single source of truth
    const syncEnabledStr = await SecureStore.getItemAsync('sync_enabled');
    const persistedEnabled = syncEnabledStr === 'true';

    syncLogger.debug(`Checking sync enabled state: persisted=${syncEnabledStr ?? 'null'}, enabled=${persistedEnabled}`);

    return persistedEnabled;
  }

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
  async syncAll(): Promise<void> {
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

    syncLogger.info('Syncing all file types...');

    const fileTypes: SyncFileType[] = ['categories', 'locations', 'inventoryItems', 'todoItems', 'settings'];

    for (const fileType of fileTypes) {
      // Do full sync (pull + push) to ensure bidirectional sync
      this.queueSync(fileType, 'full');
    }
  }

  /**
   * Queue a sync task
   */
  async queueSync(fileType: SyncFileType, operation: 'pull' | 'push' | 'full', priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      syncLogger.info(`Sync is disabled, ignoring ${operation} queue for ${fileType}`);
      return;
    }

    const taskKey = `${fileType}-${operation}`;

    // Check if there's already an in-flight sync for this fileType+operation
    if (this.inFlightSyncs.has(taskKey)) {
      syncLogger.debug(`Sync already in-flight for ${taskKey}, skipping duplicate request`);
      return;
    }

    // If trying to do pull/push, check if a full sync is in progress for this fileType
    if (operation !== 'full') {
      const fullSyncKey = `${fileType}-full`;
      if (this.inFlightSyncs.has(fullSyncKey)) {
        syncLogger.debug(`Full sync in progress for ${fileType}, skipping ${operation} request`);
        return;
      }
    }

    // If trying to do full sync, check if any sync is in progress for this fileType
    if (operation === 'full') {
      const pullKey = `${fileType}-pull`;
      const pushKey = `${fileType}-push`;
      if (this.inFlightSyncs.has(pullKey) || this.inFlightSyncs.has(pushKey)) {
        syncLogger.debug(`Pull or push in progress for ${fileType}, skipping full sync request`);
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

    // Check if there's already a pending task for this fileType+operation in the queue
    const existingTaskIndex = this.syncQueue.findIndex(
      t => t.fileType === fileType && t.operation === operation
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
          await this.syncFile(task.fileType, 'full');
        } else if (task.operation === 'pull') {
          await this.pullFile(task.fileType);
        } else if (task.operation === 'push') {
          await this.pushFile(task.fileType);
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
  async syncFile(fileType: SyncFileType, mode: 'pull' | 'push' | 'full'): Promise<void> {
    syncLogger.info(`Syncing ${fileType} in ${mode} mode...`);

    if (mode === 'pull') {
      await this.pullFile(fileType);
    } else if (mode === 'push') {
      await this.pushFile(fileType);
    } else {
      // Full sync: pull -> merge -> push
      await this.pullFile(fileType);
      await this.pushFile(fileType);
    }
  }

  /**
   * Pull data from server for a specific file type
   */
  private async pullFile(fileType: SyncFileType): Promise<void> {
    const pullStartTime = Date.now();
    syncLogger.header(`PULL FILE START - ${fileType}`);
    syncLogger.verbose(`Timestamp: ${new Date().toISOString()}`);

    const endpoint = `/api/sync/${fileType}/pull`;
    const requestDetails = {
      method: 'GET',
      endpoint,
      fileType,
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
          await this.mergeSettings(response.data as Settings);
        } else {
          await this.mergeEntries(fileType, response.data as unknown[]);
          // Cleanup old deleted items after merging (only for non-settings file types)
          await this.cleanupDeletedItems(fileType);
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

        this.notifyListeners({
          type: 'pull',
          fileType,
          timestamp: response.serverTimestamp,
        });

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
  private async pushFile(fileType: SyncFileType): Promise<void> {
    const pushStartTime = Date.now();
    syncLogger.header(`PUSH FILE START - ${fileType}`);
    syncLogger.verbose(`Timestamp: ${new Date().toISOString()}`);

    let requestBody: SyncFileData<unknown> | null = null;
    const endpoint = `/api/sync/${fileType}/push`;

    try {
      // Get local data
      let data: unknown;

      if (fileType === 'categories') {
        const { getAllCategoriesForSync } = await import('./CategoryService');
        data = await getAllCategoriesForSync();
      } else if (fileType === 'locations') {
        const { getAllLocationsForSync } = await import('./LocationService');
        data = await getAllLocationsForSync();
      } else if (fileType === 'inventoryItems') {
        const { getAllItemsForSync } = await import('./InventoryService');
        data = await getAllItemsForSync();
      } else if (fileType === 'todoItems') {
        const { getAllTodosForSync } = await import('./TodoService');
        data = await getAllTodosForSync();
      } else if (fileType === 'settings') {
        const { getSettings } = await import('./SettingsService');
        data = await getSettings();
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
  private async mergeEntries(fileType: SyncFileType, serverData: unknown[]): Promise<void> {
    syncLogger.verbose(`Merging entries for ${fileType}`, serverData);

    // Suppress sync callbacks during merge to prevent triggering additional syncs
    this.isMergingData = true;
    syncCallbackRegistry.setSuppressCallbacks(true);

    try {
      let localData: unknown[];
      let writeFile: (data: unknown) => Promise<boolean>;

      if (fileType === 'categories') {
        const { getAllCategoriesForSync } = await import('./CategoryService');
        const { readFile: _readFile, writeFile: writeCatFile } = await import('./FileSystemService');
        const localCategories = await getAllCategoriesForSync();
        localData = localCategories;
        writeFile = async (data: unknown) => writeCatFile('categories.json', { categories: data as Category[] });
      } else if (fileType === 'locations') {
        const { getAllLocationsForSync } = await import('./LocationService');
        const { readFile: _readFile2, writeFile: writeLocFile } = await import('./FileSystemService');
        const localLocations = await getAllLocationsForSync();
        localData = localLocations;
        writeFile = async (data: unknown) => writeLocFile('locations.json', { locations: data as Location[] });
      } else if (fileType === 'inventoryItems') {
        const { getAllItemsForSync } = await import('./InventoryService');
        const { readFile: _readFile3, writeFile: writeItemFile } = await import('./FileSystemService');
        const localItems = await getAllItemsForSync();
        localData = localItems;
        writeFile = async (data: unknown) => writeItemFile('items.json', { items: data as InventoryItem[] });
      } else if (fileType === 'todoItems') {
        const { getAllTodosForSync } = await import('./TodoService');
        const { readFile: _readFile4, writeFile: writeTodoFile } = await import('./FileSystemService');
        const localTodos = await getAllTodosForSync();
        localData = localTodos;
        writeFile = async (data: unknown) => writeTodoFile('todos.json', { todos: data as TodoItem[] });
      } else {
        return;
      }

      // Perform merge
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const merged = this.mergeByTimestamp(localData as any[], serverData as any[]);
      syncLogger.verbose(`Merged data for ${fileType}`, merged);

      // Save merged data (callbacks will be suppressed)
      await writeFile(merged);
    } finally {
      // Re-enable sync callbacks after merge completes
      this.isMergingData = false;
      syncCallbackRegistry.setSuppressCallbacks(false);
    }
  }

  /**
   * Merge settings from server with local settings
   */
  private async mergeSettings(serverSettings: Settings): Promise<void> {
    syncLogger.verbose('Merging settings', serverSettings);

    // Suppress sync callbacks during merge to prevent triggering additional syncs
    this.isMergingData = true;
    syncCallbackRegistry.setSuppressCallbacks(true);

    try {
      const { getSettings } = await import('./SettingsService');
      const { writeFile } = await import('./FileSystemService');

      const localSettings = await getSettings();

      // Use settings with later updatedAt timestamp
      const localTime = new Date(localSettings.updatedAt || localSettings.createdAt || 0);
      const serverTime = new Date(serverSettings.updatedAt || serverSettings.createdAt || 0);

      const merged = serverTime > localTime ? serverSettings : localSettings;

      syncLogger.verbose('Merged settings', merged);

      // Save merged settings (callbacks will be suppressed)
      await writeFile('settings.json', merged);
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
  ): T[] {
    syncLogger.verbose(`Merging by timestamp, local count: ${local.length}, server count: ${server.length}`);

    const mergedMap = new Map<string, T>();

    // Add all local entries
    local.forEach(entry => {
      mergedMap.set(entry.id, entry);
    });

    // Merge with server entries based on timestamps and deletion state
    server.forEach(serverEntry => {
      const localEntry = mergedMap.get(serverEntry.id);

      if (!localEntry) {
        // Entry only exists on server - add it (including if deleted)
        syncLogger.verbose(`Adding new server entry: ${serverEntry.id}${serverEntry.deletedAt ? ' (deleted)' : ''}`);
        mergedMap.set(serverEntry.id, serverEntry);
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
          }
        }
        // Neither deleted - use normal timestamp-based merge
        else {
          if (serverUpdatedAt > localUpdatedAt) {
            syncLogger.verbose(`Using server version for entry: ${serverEntry.id}, server time: ${new Date(serverUpdatedAt).toISOString()}, local time: ${new Date(localUpdatedAt).toISOString()}`);
            mergedMap.set(serverEntry.id, serverEntry);
          } else {
            syncLogger.verbose(`Keeping local version for entry: ${serverEntry.id}, local time: ${new Date(localUpdatedAt).toISOString()}, server time: ${new Date(serverUpdatedAt).toISOString()}`);
          }
        }
      }
    });

    const result = Array.from(mergedMap.values());
    syncLogger.verbose(`Merge completed, result count: ${result.length}`);
    return result;
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
  private async cleanupDeletedItems(fileType: SyncFileType): Promise<void> {
    // Check if cleanup should run (at most once per day per file type)
    const lastCleanup = this.lastCleanupTime.get(fileType) || 0;
    const now = Date.now();
    if (now - lastCleanup < this.CLEANUP_INTERVAL_MS) {
      syncLogger.debug(`Skipping cleanup for ${fileType}, last cleanup was ${Math.round((now - lastCleanup) / (60 * 60 * 1000))} hours ago`);
      return;
    }

    syncLogger.info(`Starting cleanup for ${fileType}...`);

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
        allItems = await getAllCategoriesForSync();
        writeFile = async (data: unknown) => writeCatFile('categories.json', { categories: data as Category[] });
      } else if (fileType === 'locations') {
        const { getAllLocationsForSync } = await import('./LocationService');
        const { writeFile: writeLocFile } = await import('./FileSystemService');
        allItems = await getAllLocationsForSync();
        writeFile = async (data: unknown) => writeLocFile('locations.json', { locations: data as Location[] });
      } else if (fileType === 'inventoryItems') {
        const { getAllItemsForSync } = await import('./InventoryService');
        const { writeFile: writeItemFile } = await import('./FileSystemService');
        allItems = await getAllItemsForSync();
        writeFile = async (data: unknown) => writeItemFile('items.json', { items: data as InventoryItem[] });
      } else if (fileType === 'todoItems') {
        const { getAllTodosForSync } = await import('./TodoService');
        const { writeFile: writeTodoFile } = await import('./FileSystemService');
        allItems = await getAllTodosForSync();
        writeFile = async (data: unknown) => writeTodoFile('todos.json', { todos: data as TodoItem[] });
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

