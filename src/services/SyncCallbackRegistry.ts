import { EntityType } from '../types/api';

export type SyncFileType = EntityType;

export interface PendingItemsResult {
  created: any[];
  updated: any[];
  deleted: string[];
}

export type GetPendingItemsCallback = (homeId: string) => Promise<PendingItemsResult>;

class SyncCallbackRegistry {
  private callbacks: Map<SyncFileType, ((userId?: string) => void) | null> = new Map();
  private pendingItemsCallbacks: Map<SyncFileType, GetPendingItemsCallback | null> = new Map();
  private suppressCallbacks: boolean = false;

  setCallback(fileType: SyncFileType, callback: ((userId?: string) => void) | null): void {
    this.callbacks.set(fileType, callback);
  }

  setPendingItemsCallback(fileType: SyncFileType, callback: GetPendingItemsCallback | null): void {
    this.pendingItemsCallbacks.set(fileType, callback);
  }

  getPendingItemsCallback(fileType: SyncFileType): GetPendingItemsCallback | null {
    return this.pendingItemsCallbacks.get(fileType) || null;
  }

  trigger(fileType: SyncFileType, userId?: string): void {
    if (this.suppressCallbacks) return;
    const callback = this.callbacks.get(fileType);
    if (callback) callback(userId);
  }
}

export const syncCallbackRegistry = new SyncCallbackRegistry();
