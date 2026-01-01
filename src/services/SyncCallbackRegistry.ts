// Centralized registry for sync callbacks to avoid naming conflicts

type SyncFileType = 'categories' | 'locations' | 'inventoryItems' | 'todoItems' | 'settings';

class SyncCallbackRegistry {
  private callbacks: Map<SyncFileType, (() => void) | null> = new Map();
  private suppressCallbacks: boolean = false; // Flag to suppress callbacks during merge operations

  setCallback(fileType: SyncFileType, callback: (() => void) | null): void {
    this.callbacks.set(fileType, callback);
  }

  getCallback(fileType: SyncFileType): (() => void) | null {
    return this.callbacks.get(fileType) || null;
  }

  setSuppressCallbacks(suppress: boolean): void {
    this.suppressCallbacks = suppress;
    if (suppress) {
      console.log('[SyncCallbackRegistry] Suppressing sync callbacks');
    } else {
      console.log('[SyncCallbackRegistry] Re-enabling sync callbacks');
    }
  }

  trigger(fileType: SyncFileType): void {
    if (this.suppressCallbacks) {
      console.log(`[SyncCallbackRegistry] Callback suppressed for ${fileType} (merge in progress)`);
      return;
    }

    const callback = this.callbacks.get(fileType);
    if (callback) {
      console.log(`[SyncCallbackRegistry] Triggering sync for ${fileType}`);
      callback();
    }
  }
}

export const syncCallbackRegistry = new SyncCallbackRegistry();

