import { EntityType } from './api';

// Universal wrapper for synced items (Server representation)
export interface SyncEntity<T = any> {
    entityId: string;
    entityType: EntityType;
    homeId: string;
    data: T;
    version: number;
    createdBy: string; // userId
    updatedBy: string; // userId
    createdByDeviceId?: string;
    updatedByDeviceId?: string;
    deletedAt?: string | null;
    deletedBy?: string | null;
    count?: number; // Optional, added for some lists (like categories/locations usage count)
}

// Client-side storage format
export interface LocalEntity<T = any> {
    // Entity identification
    entityId: string;
    entityType: EntityType;
    homeId: string;

    // Entity data
    data: T;

    // Sync metadata
    version: number; // Last known server version

    // Timestamps
    serverUpdatedAt: string | null;   // Last known server timestamp
    clientUpdatedAt: string;          // Last local modification

    // Sync Status
    lastSyncedAt: string | null;      // Last successful sync time for this entity

    // Pending operations tracking
    pendingCreate?: boolean;          // Created offline, not yet known to server
    pendingUpdate?: boolean;          // Modified locally, not yet pushed
    pendingDelete?: boolean;          // Deleted locally, not yet pushed

    // Change tracking
    createdLocallyAt: string;
    modifiedLocallyAt: string;
}

// Checkpoint for sync state per entity type
export interface SyncCheckpoint {
    homeId: string;
    entityType: EntityType;
    lastSyncedAt: string | null;
    lastPulledVersion: number;
    lastPushedVersion: number;
    serverTimestamp?: string; // Latest timestamp from server
}

// Result of a sync operation for a single entity
export interface EntitySyncResult {
    entityId: string;
    status: 'created' | 'updated' | 'server_version' | 'deleted' | 'error';
    winner?: 'client' | 'server';
    syncedAt: string;
    error?: string;
    serverVersion?: number;
}
