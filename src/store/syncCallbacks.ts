import { syncCallbackRegistry } from '../services/SyncCallbackRegistry';
import { InventoryItem, TodoItem } from '../types/inventory';
import { homeService } from '../services/HomeService';
import { getAllCategoriesForSync } from '../services/CategoryService';
import { getAllLocationsForSync } from '../services/LocationService';
import { getSettings } from '../services/SettingsService';

/**
 * Registers callbacks that allow the SyncService to query the Redux store
 * or local services for pending items (created/updated/deleted offline).
 */
export function initializeSyncCallbacks(store: any) {
    console.log('[SyncCallbacks] Initializing store-connected sync callbacks...');

    // Homes
    syncCallbackRegistry.setPendingItemsCallback('homes', async () => {
        const homes = await homeService.getAllHomesForSync();
        const created: any[] = [];
        const updated: any[] = [];
        const deleted: string[] = [];

        homes.forEach(home => {
            if (home.pendingCreate) created.push(home);
            else if (home.pendingUpdate) updated.push(home);
            else if (home.pendingDelete || home.deletedAt) {
                if (!home.serverUpdatedAt || new Date(home.deletedAt!).getTime() > new Date(home.serverUpdatedAt).getTime()) {
                    deleted.push(home.id);
                }
            } else {
                if (!home.serverUpdatedAt && !home.version) {
                    created.push(home);
                } else if (home.clientUpdatedAt && home.serverUpdatedAt) {
                    if (new Date(home.clientUpdatedAt).getTime() > new Date(home.serverUpdatedAt).getTime()) {
                        updated.push(home);
                    }
                }
            }
        });

        return { created, updated, deleted };
    });

    // Categories
    syncCallbackRegistry.setPendingItemsCallback('categories', async (homeId) => {
        const categories = await getAllCategoriesForSync(homeId);
        const created: any[] = [];
        const updated: any[] = [];
        const deleted: string[] = [];

        categories.forEach(cat => {
            if (cat.pendingCreate) created.push(cat);
            else if (cat.pendingUpdate) updated.push(cat);
            else if (cat.pendingDelete || cat.deletedAt) {
                if (!cat.serverUpdatedAt || new Date(cat.deletedAt!).getTime() > new Date(cat.serverUpdatedAt).getTime()) {
                    deleted.push(cat.id);
                }
            } else {
                if (!cat.serverUpdatedAt && !cat.version) {
                    created.push(cat);
                } else if (cat.clientUpdatedAt && cat.serverUpdatedAt) {
                    if (new Date(cat.clientUpdatedAt).getTime() > new Date(cat.serverUpdatedAt).getTime()) {
                        updated.push(cat);
                    }
                }
            }
        });

        return { created, updated, deleted };
    });

    // Locations
    syncCallbackRegistry.setPendingItemsCallback('locations', async (homeId) => {
        const locations = await getAllLocationsForSync(homeId);
        const created: any[] = [];
        const updated: any[] = [];
        const deleted: string[] = [];

        locations.forEach(loc => {
            if (loc.pendingCreate) created.push(loc);
            else if (loc.pendingUpdate) updated.push(loc);
            else if (loc.pendingDelete || loc.deletedAt) {
                if (!loc.serverUpdatedAt || new Date(loc.deletedAt!).getTime() > new Date(loc.serverUpdatedAt).getTime()) {
                    deleted.push(loc.id);
                }
            } else {
                if (!loc.serverUpdatedAt && !loc.version) {
                    created.push(loc);
                } else if (loc.clientUpdatedAt && loc.serverUpdatedAt) {
                    if (new Date(loc.clientUpdatedAt).getTime() > new Date(loc.serverUpdatedAt).getTime()) {
                        updated.push(loc);
                    }
                }
            }
        });

        return { created, updated, deleted };
    });

    // Settings
    syncCallbackRegistry.setPendingItemsCallback('settings', async (homeId) => {
        const settings = await getSettings(homeId);
        const created: any[] = [];
        const updated: any[] = [];
        const deleted: string[] = [];

        // Settings is a single object, if it has clientUpdatedAt > serverUpdatedAt, it's an update
        if (settings.clientUpdatedAt && settings.serverUpdatedAt) {
            if (new Date(settings.clientUpdatedAt).getTime() > new Date(settings.serverUpdatedAt).getTime()) {
                updated.push(settings);
            }
        } else if (!settings.serverUpdatedAt) {
            // New settings
            updated.push(settings);
        }

        return { created, updated, deleted };
    });

    // Inventory Items
    syncCallbackRegistry.setPendingItemsCallback('inventoryItems', async (homeId) => {
        const state = store.getState();
        const items = state.inventory.items;
        const activeHomeId = state.auth.activeHomeId;

        if (homeId !== activeHomeId) {
            return { created: [], updated: [], deleted: [] };
        }

        const created: InventoryItem[] = [];
        const updated: InventoryItem[] = [];
        const deleted: string[] = [];

        items.forEach((item: InventoryItem) => {
            if (item.pendingCreate) created.push(item);
            else if (item.pendingUpdate) updated.push(item);
            else if (item.pendingDelete || item.deletedAt) {
                if (!item.serverUpdatedAt || new Date(item.deletedAt!).getTime() > new Date(item.serverUpdatedAt).getTime()) {
                    deleted.push(item.id);
                }
            } else {
                if (!item.serverUpdatedAt && !item.version) {
                    created.push(item);
                } else if (item.clientUpdatedAt && item.serverUpdatedAt) {
                    if (new Date(item.clientUpdatedAt).getTime() > new Date(item.serverUpdatedAt).getTime()) {
                        updated.push(item);
                    }
                }
            }
        });

        return { created, updated, deleted };
    });

    // Todo Items
    syncCallbackRegistry.setPendingItemsCallback('todoItems', async (homeId) => {
        const state = store.getState();
        const todos = state.todo.todos;
        const activeHomeId = state.auth.activeHomeId;

        if (homeId !== activeHomeId) return { created: [], updated: [], deleted: [] };

        const created: TodoItem[] = [];
        const updated: TodoItem[] = [];
        const deleted: string[] = [];

        todos.forEach((item: TodoItem) => {
            if (item.pendingCreate) created.push(item);
            else if (item.pendingUpdate) updated.push(item);
            else if (item.pendingDelete || item.deletedAt) {
                if (!item.serverUpdatedAt || new Date(item.deletedAt!).getTime() > new Date(item.serverUpdatedAt).getTime()) {
                    deleted.push(item.id);
                }
            } else {
                if (!item.serverUpdatedAt && !item.version) {
                    created.push(item);
                } else if (item.clientUpdatedAt && item.serverUpdatedAt) {
                    if (new Date(item.clientUpdatedAt).getTime() > new Date(item.serverUpdatedAt).getTime()) {
                        updated.push(item);
                    }
                }
            }
        });

        return { created, updated, deleted };
    });

    console.log('[SyncCallbacks] Callbacks registered.');
}
