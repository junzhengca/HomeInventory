import * as SecureStore from 'expo-secure-store';
import { ApiClient } from './ApiClient';
import { syncLogger } from '../utils/Logger';
import {
  EntityType,
  PullEntitiesRequest,
  PushEntitiesRequest,
  PushEntity,
  PushResult,
} from '../types/api';
import {
  SyncCheckpoint,
} from '../types/sync_types';
import { EntityRegistry } from './EntityRegistry';
import { syncCallbackRegistry } from './SyncCallbackRegistry';

export type SyncFileType = EntityType;

// Queue task type
interface SyncTask {
  id: string;
  fileType: EntityType;
  operation: 'pull' | 'push' | 'full';
  priority: 'high' | 'normal' | 'low';
  timestamp: number;
  retries: number;
  maxRetries: number;
  userId?: string; // Target user/home ID
}

export interface SyncEvent {
  type: 'pull' | 'push' | 'error';
  fileType: EntityType;
  timestamp?: string;
  entriesCount?: number;
  error?: string;
  changes?: {
    added: any[];
    updated: any[];
    removed: string[];
  };
}

class SyncService {
  private apiClient: ApiClient;
  private deviceId: string | null = null;
  private userId: string | undefined = undefined;
  private ownerId: string | undefined = undefined;

  // Queue management
  private syncQueue: SyncTask[] = [];
  private isProcessing: boolean = false;
  private listeners: Set<(event: SyncEvent) => void> = new Set();

  // Local storage cache for checkpoints (in memory for speed, persisted to SecureStore)
  private checkpoints: Map<string, SyncCheckpoint> = new Map();

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Initialize sync service
   */
  async initialize(deviceName?: string, userId?: string, ownerId?: string): Promise<void> {
    syncLogger.header('INITIALIZING SYNC SERVICE (REVAMPED)');

    if (userId) this.userId = userId;
    if (ownerId) this.ownerId = ownerId;

    // Get or create device ID
    this.deviceId = await SecureStore.getItemAsync('device_id');
    if (!this.deviceId) {
      this.deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      await SecureStore.setItemAsync('device_id', this.deviceId);
      syncLogger.info(`Generated new device ID: ${this.deviceId}`);
    }

    // Load checkpoints
    await this.loadCheckpoints();

    syncLogger.end('SYNC SERVICE INITIALIZATION');
  }

  // --- Configuration & State ---

  async setUserId(userId: string | undefined): Promise<void> {
    if (this.userId !== userId) {
      this.userId = userId;
      syncLogger.info(`Switched active user/home context to: ${userId}`);
    }
  }

  async isEnabled(): Promise<boolean> {
    const syncEnabledStr = await SecureStore.getItemAsync('sync_enabled');
    return syncEnabledStr === 'true';
  }

  async enable(): Promise<void> {
    await SecureStore.setItemAsync('sync_enabled', 'true');
    await this.syncAll();
  }

  async disable(): Promise<void> {
    await SecureStore.setItemAsync('sync_enabled', 'false');
    this.syncQueue = [];
  }

  addListener(listener: (event: SyncEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(event: SyncEvent) {
    this.listeners.forEach(l => l(event));
  }

  async getSyncStatus() {
    return null; // TODO: Implement proper status return
  }

  // --- Checkpoint Management ---

  private getCheckpointKey(homeId: string, entityType: EntityType): string {
    return `${homeId}:${entityType}`;
  }

  private async loadCheckpoints() {
    try {
      const stored = await SecureStore.getItemAsync('sync_checkpoints');
      if (stored) {
        const parsed = JSON.parse(stored);
        for (const key in parsed) {
          this.checkpoints.set(key, parsed[key]);
        }
      }
    } catch (e) {
      syncLogger.error('Failed to load checkpoints', e);
    }
  }

  private async saveCheckpoints() {
    try {
      const obj: Record<string, SyncCheckpoint> = {};
      this.checkpoints.forEach((val, key) => {
        obj[key] = val;
      });
      await SecureStore.setItemAsync('sync_checkpoints', JSON.stringify(obj));
    } catch (e) {
      syncLogger.error('Failed to save checkpoints', e);
    }
  }

  private getCheckpoint(homeId: string, entityType: EntityType): SyncCheckpoint {
    const key = this.getCheckpointKey(homeId, entityType);
    let cp = this.checkpoints.get(key);
    if (!cp) {
      cp = {
        homeId,
        entityType,
        lastSyncedAt: null,
        lastPulledVersion: 0,
        lastPushedVersion: 0,
      };
      this.checkpoints.set(key, cp);
    }
    return cp;
  }

  private updateCheckpoint(cp: SyncCheckpoint) {
    const key = this.getCheckpointKey(cp.homeId, cp.entityType);
    this.checkpoints.set(key, cp);
    this.saveCheckpoints();
  }

  // --- Core Sync Logic ---

  async queueSync(
    entityType: EntityType,
    operation: 'pull' | 'push' | 'full',
    priority: 'high' | 'normal' | 'low' = 'normal',
    userId?: string
  ): Promise<void> {
    const enabled = await this.isEnabled();
    if (!enabled) return;

    const targetUserId = entityType === 'homes' && this.ownerId ? this.ownerId : (userId || this.userId || 'unknown');

    const task: SyncTask = {
      id: `${entityType}-${operation}-${Date.now()}`,
      fileType: entityType,
      operation,
      priority,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
      userId: targetUserId
    };

    if (priority === 'high') this.syncQueue.unshift(task);
    else this.syncQueue.push(task);

    this.processQueue();
  }

  async syncAll(userId?: string) {
    const types = EntityRegistry.getAllEntityTypes();

    if (types.includes('homes')) {
      syncLogger.info('[SyncService] Syncing homes first (required before child entities)...');
      await this.syncFile('homes', 'full', userId);
      await this.waitForEntitySync('homes');
      syncLogger.info('[SyncService] Homes sync complete, proceeding with other entities...');
    }

    for (const type of types) {
      if (type !== 'homes') {
        this.queueSync(type, 'full', 'normal', userId);
      }
    }
  }

  private async waitForEntitySync(entityType: EntityType): Promise<void> {
    return new Promise((resolve) => {
      const checkQueue = () => {
        const hasPending = this.syncQueue.some(task => task.fileType === entityType);
        if (!hasPending && !this.isProcessing) {
          resolve();
        } else if (!hasPending && this.isProcessing) {
          resolve();
        } else {
          setTimeout(checkQueue, 50);
        }
      };
      setTimeout(checkQueue, 10);
    });
  }

  async syncFile(entityType: EntityType, mode: 'pull' | 'push' | 'full', userId?: string) {
    return this.queueSync(entityType, mode, 'high', userId);
  }

  private async processQueue() {
    if (this.isProcessing || this.syncQueue.length === 0) return;
    this.isProcessing = true;

    try {
      while (this.syncQueue.length > 0) {
        const task = this.syncQueue.shift()!;
        try {
          await this.executeTask(task);
        } catch (error) {
          syncLogger.error(`Task failed: ${task.id}`, error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeTask(task: SyncTask) {
    const { fileType, operation, userId } = task;
    const targetUserId = userId || this.userId || 'unknown';

    syncLogger.info(`Executing ${operation} for ${fileType} (user: ${targetUserId})`);

    if (operation === 'pull' || operation === 'full') {
      await this.pullEntities(fileType, targetUserId);
    }

    if (operation === 'push' || operation === 'full') {
      await this.pushEntities(fileType, targetUserId);
    }
  }

  private async pullEntities(entityType: EntityType, homeId: string) {
    const checkpoint = this.getCheckpoint(homeId, entityType);

    const request: PullEntitiesRequest = {
      entityType,
      homeId,
      deviceId: this.deviceId!,
      checkpoint: { lastPulledVersion: checkpoint.lastPulledVersion },
      includeDeleted: true,
    };

    const response = await this.apiClient.pullEntities(request);

    if (!response.success) {
      throw new Error('Pull failed');
    }

    if (response.changes.length > 0) {
      const added: any[] = [];
      const updated: any[] = [];
      const removed: string[] = [];

      for (const change of response.changes) {
        if (change.changeType === 'deleted') {
          removed.push(change.entityId);
        } else if (change.changeType === 'created') {
          added.push(change.data);
        } else {
          updated.push(change.data);
        }
      }

      this.notifyListeners({
        type: 'pull',
        fileType: entityType,
        timestamp: response.serverTimestamp,
        changes: { added, updated, removed }
      });
    }

    checkpoint.lastPulledVersion = response.latestVersion;
    checkpoint.lastSyncedAt = new Date().toISOString();
    checkpoint.serverTimestamp = response.serverTimestamp;
    this.updateCheckpoint(checkpoint);
  }

  private async pushEntities(entityType: EntityType, homeId: string) {
    const getPending = syncCallbackRegistry.getPendingItemsCallback(entityType);
    if (!getPending) return;

    const { created, updated, deleted } = await getPending(homeId);

    if (created.length === 0 && updated.length === 0 && deleted.length === 0) {
      return;
    }

    syncLogger.info(`Pushing ${entityType} for ${homeId}: ${created.length} created, ${updated.length} updated, ${deleted.length} deleted`);

    const entities: PushEntity[] = [];

    [...created, ...updated].forEach(item => {
      entities.push({
        entityId: item.id || item.entityId,
        entityType,
        homeId,
        data: item,
        clientUpdatedAt: new Date().toISOString(),
        version: item.version || 0,
      });
    });

    deleted.forEach(id => {
      entities.push({
        entityId: id,
        entityType,
        homeId,
        data: { id } as any,
        clientUpdatedAt: new Date().toISOString(),
        deletedAt: new Date().toISOString(),
      });
    });

    const checkpoint = this.getCheckpoint(homeId, entityType);

    const request: PushEntitiesRequest = {
      entityType,
      entities,
      checkpoint: { lastPulledVersion: checkpoint.lastPulledVersion },
    };

    const response = await this.apiClient.pushEntities(request, homeId);

    if (!response.success) {
      throw new Error('Push failed');
    }

    const conflicts: PushResult[] = [];

    for (const res of response.results) {
      if (res.status === 'conflict') {
        conflicts.push(res);
      }
    }

    const conflictUpdates: any[] = [];

    for (const conflict of conflicts) {
      if (conflict.serverVersion && typeof conflict.serverVersion === 'object') {
        const serverEntity = conflict.serverVersion as any;
        if (serverEntity.data) {
          conflictUpdates.push(serverEntity.data);
        }
      }
    }

    if (conflictUpdates.length > 0) {
      this.notifyListeners({
        type: 'pull',
        fileType: entityType,
        changes: {
          added: [],
          updated: conflictUpdates,
          removed: []
        }
      });
    }

    checkpoint.lastPushedVersion = Math.max(checkpoint.lastPushedVersion, ...response.results.map(r => r.serverVersion || 0));
    this.updateCheckpoint(checkpoint);
  }
}

export default SyncService;
