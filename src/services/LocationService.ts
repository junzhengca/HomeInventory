import { Location } from '../types/inventory';
import { fileSystemService } from './FileSystemService';
import { generateItemId } from '../utils/idGenerator';
import { ApiClient } from './ApiClient';
import {
  BatchSyncRequest,
  BatchSyncPullRequest,
  BatchSyncPushRequest,
  LocationServerData
} from '../types/api';
import { SyncDelta } from '../types/sync';
import { syncLogger } from '../utils/Logger';
import Ionicons from '@expo/vector-icons/Ionicons';

const LOCATIONS_FILE = 'locations.json';

interface LocationsData {
  locations: Location[];
  lastSyncTime?: string;
  lastPulledVersion?: number;
}

class LocationService {
  public constructor() {}

  /**
   * Get all locations (excluding deleted items)
   */
  async getAllLocations(homeId: string): Promise<Location[]> {
    if (!homeId) {
      throw new Error('homeId is required for locations');
    }
    const data = await fileSystemService.readFile<LocationsData>(LOCATIONS_FILE, homeId);
    const locations = data?.locations || [];
    return locations.filter((loc) => !loc.deletedAt);
  }

  /**
   * Get a single location by ID
   */
  async getLocationById(id: string, homeId: string): Promise<Location | null> {
    if (!homeId) {
      throw new Error('homeId is required to get location by ID');
    }
    const locations = await this.getAllLocations(homeId);
    return locations.find((loc) => loc.id === id) || null;
  }

  /**
   * Create a new location
   */
  async createLocation(location: Omit<Location, 'id' | 'version' | 'clientUpdatedAt' | 'homeId'>, homeId: string): Promise<Location | null> {
    try {
      if (!homeId) {
        throw new Error('homeId is required to create location');
      }
      const data = await fileSystemService.readFile<LocationsData>(LOCATIONS_FILE, homeId);
      const locations = data?.locations || [];
      const now = new Date().toISOString();

      const newLocation: Location = {
        ...location,
        homeId,
        id: generateItemId(),
        createdAt: now,
        updatedAt: now,

        // Sync metadata
        version: 1,
        clientUpdatedAt: now,
        pendingCreate: true,
        pendingUpdate: false,
        pendingDelete: false
      };

      locations.push(newLocation);
      const success = await fileSystemService.writeFile<LocationsData>(LOCATIONS_FILE, { ...data, locations }, homeId);

      return success ? newLocation : null;
    } catch (error) {
      syncLogger.error('Error creating location:', error);
      return null;
    }
  }

  /**
   * Update an existing location
   */
  async updateLocation(
    id: string,
    updates: Partial<Omit<Location, 'id' | 'version' | 'clientUpdatedAt'>>,
    homeId: string
  ): Promise<Location | null> {
    try {
      if (!homeId) {
        throw new Error('homeId is required to update location');
      }
      const data = await fileSystemService.readFile<LocationsData>(LOCATIONS_FILE, homeId);
      const locations = data?.locations || [];
      const index = locations.findIndex((loc) => loc.id === id);

      if (index === -1) {
        return null;
      }

      const now = new Date().toISOString();
      const isPendingCreate = locations[index].pendingCreate;

      locations[index] = {
        ...locations[index],
        ...updates,
        updatedAt: now,
        // Sync metadata
        version: locations[index].version + 1,
        clientUpdatedAt: now,
        pendingUpdate: !isPendingCreate, // If it's pending create, it stays pending create
      };

      const success = await fileSystemService.writeFile<LocationsData>(LOCATIONS_FILE, { ...data, locations }, homeId);
      return success ? locations[index] : null;

    } catch (error) {
      syncLogger.error('Error updating location:', error);
      return null;
    }
  }

  /**
   * Delete a location (soft delete)
   */
  async deleteLocation(id: string, homeId: string): Promise<boolean> {
    try {
      if (!homeId) {
        throw new Error('homeId is required to delete location');
      }
      const data = await fileSystemService.readFile<LocationsData>(LOCATIONS_FILE, homeId);
      const locations = data?.locations || [];
      const index = locations.findIndex((loc) => loc.id === id);

      if (index === -1) {
        return false;
      }

      if (locations[index].deletedAt) {
        return true;
      }

      const now = new Date().toISOString();
      const isPendingCreate = locations[index].pendingCreate;

      if (isPendingCreate) {
        locations.splice(index, 1);
      } else {
        locations[index] = {
          ...locations[index],
          deletedAt: now,
          updatedAt: now,
          version: locations[index].version + 1,
          clientUpdatedAt: now,
          pendingDelete: true,
          pendingUpdate: false,
        };
      }

      return await fileSystemService.writeFile<LocationsData>(LOCATIONS_FILE, { ...data, locations }, homeId);

    } catch (error) {
      syncLogger.error('Error deleting location:', error);
      return false;
    }
  }

  /**
   * Sync locations with server and return delta of changes
   */
  async syncLocations(
    homeId: string,
    apiClient: ApiClient,
    deviceId: string
  ): Promise<SyncDelta<Location>> {
    syncLogger.info('Starting location sync...');
    try {
      const data = await fileSystemService.readFile<LocationsData>(LOCATIONS_FILE, homeId);
      let locations = data?.locations || [];
      const lastSyncTime = data?.lastSyncTime;
      const lastPulledVersion = data?.lastPulledVersion || 0;

      // Accumulators for tracking changes
      const updated = new Map<string, Location>();
      const created = new Map<string, Location>();
      const deleted = new Set<string>();

      // 1. Prepare Push Requests
      const pendingLocations = locations.filter(l => l.pendingCreate || l.pendingUpdate || l.pendingDelete);
      const pushRequests: BatchSyncPushRequest[] = [];

      if (pendingLocations.length > 0) {
        syncLogger.info(`Pushing ${pendingLocations.length} pending locations`);
        pushRequests.push({
          entityType: 'locations',
          entities: pendingLocations.map(l => ({
            entityId: l.id,
            entityType: 'locations',
            homeId: homeId,
            data: {
              id: l.id,
              name: l.name,
              icon: l.icon
            },
            version: l.version,
            clientUpdatedAt: l.clientUpdatedAt,
            pendingCreate: l.pendingCreate,
            pendingDelete: l.pendingDelete,
          })),
          lastPulledAt: lastSyncTime,
          checkpoint: { lastPulledVersion }
        });
      }

      // 2. Prepare Pull Request
      const pullRequests: BatchSyncPullRequest[] = [{
        entityType: 'locations',
        since: lastSyncTime,
        includeDeleted: true,
        checkpoint: { lastPulledVersion }
      }];

      // 3. Perform Batch Sync
      const batchRequest: BatchSyncRequest = {
        homeId,
        deviceId,
        pullRequests,
        pushRequests: pushRequests.length > 0 ? pushRequests : undefined
      };

      const response = await apiClient.batchSync(batchRequest);

      if (!response.success) {
        syncLogger.error('Sync failed:', response);
        return {
          updated: [],
          created: [],
          deleted: [],
          confirmed: [],
          unchanged: true,
          serverTimestamp: new Date().toISOString(),
        };
      }

      // CRITICAL FIX: Re-read data before applying results to capture any local changes
      // that happened while we were waiting for the server response
      const freshData = await fileSystemService.readFile<LocationsData>(LOCATIONS_FILE, homeId);
      if (freshData?.locations) {
        // Update our local reference to the fresh data
        locations = freshData.locations;
      }

      // 4. Process Push Results
      if (response.pushResults) {
        for (const pushResult of response.pushResults) {
          if (pushResult.entityType === 'locations') {
            for (const result of pushResult.results) {
              const index = locations.findIndex(l => l.id === result.entityId);
              if (index === -1) continue;

              if (result.status === 'created' || result.status === 'updated') {
                // Track as updated
                updated.set(locations[index].id, locations[index]);

                locations[index] = {
                  ...locations[index],
                  pendingCreate: false,
                  pendingUpdate: false,
                  pendingDelete: false,
                  serverUpdatedAt: result.serverUpdatedAt,
                  lastSyncedAt: response.serverTimestamp,
                };
                if (result.status === 'created' && result.serverVersion) {
                  locations[index].version = result.serverVersion;
                }
              } else if (result.status === 'server_version' && result.winner === 'server') {
                if (result.serverVersionData) {
                  const serverData = result.serverVersionData.data as unknown as LocationServerData;
                  const mergedLocation: Location = {
                    ...locations[index],
                    name: serverData.name,
                    icon: serverData.icon as keyof typeof Ionicons.glyphMap | undefined,
                    version: result.serverVersionData.version,
                    serverUpdatedAt: result.serverVersionData.updatedAt,
                    lastSyncedAt: response.serverTimestamp,
                    pendingCreate: false,
                    pendingUpdate: false,
                  };

                  // Track as updated
                  updated.set(locations[index].id, mergedLocation);
                  locations[index] = mergedLocation;
                }
              } else if (result.status === 'deleted') {
                // Track as deleted
                deleted.add(locations[index].id);

                locations[index] = {
                  ...locations[index],
                  pendingDelete: false,
                  lastSyncedAt: response.serverTimestamp
                };
              }
            }
          }
        }
      }

      // 5. Process Pull Results
      if (response.pullResults) {
        for (const pullResult of response.pullResults) {
          if (pullResult.entityType === 'locations') {
            for (const entity of pullResult.entities) {
              const index = locations.findIndex(l => l.id === entity.entityId);
              const serverData = entity.data as unknown as LocationServerData;

              const newLocation: Location = {
                id: entity.entityId,
                homeId: homeId,
                name: serverData.name,
                icon: serverData.icon as keyof typeof Ionicons.glyphMap | undefined,
                // Common fields
                createdAt: entity.updatedAt, // Approximate
                updatedAt: entity.updatedAt,
                version: entity.version,
                serverUpdatedAt: entity.updatedAt,
                clientUpdatedAt: entity.clientUpdatedAt,
                lastSyncedAt: response.serverTimestamp,
              };

              if (index >= 0) {
                if (!locations[index].pendingUpdate && !locations[index].pendingCreate && !locations[index].pendingDelete) {
                  locations[index] = { ...locations[index], ...newLocation };
                  // Track as updated
                  updated.set(entity.entityId, locations[index]);
                }
              } else {
                locations.push(newLocation);
                // Track as created
                created.set(entity.entityId, newLocation);
              }
            }

            for (const deletedId of pullResult.deletedEntityIds) {
              const index = locations.findIndex(l => l.id === deletedId);
              if (index >= 0) {
                locations[index] = {
                  ...locations[index],
                  deletedAt: response.serverTimestamp,
                  pendingDelete: false
                };
                // Track as deleted
                deleted.add(deletedId);
              }
            }
          }
        }
      }

      // 6. Save changes
      const checkPoint = response.pullResults?.find(r => r.entityType === 'locations')?.checkpoint;
      const newLastPulledVersion = checkPoint?.lastPulledVersion ?? lastPulledVersion;

      await fileSystemService.writeFile<LocationsData>(LOCATIONS_FILE, {
        locations,
        lastSyncTime: response.serverTimestamp,
        lastPulledVersion: newLastPulledVersion
      }, homeId);

      syncLogger.info('Location sync complete');

      // Return delta
      return {
        updated: Array.from(updated.values()),
        created: Array.from(created.values()),
        deleted: Array.from(deleted),
        confirmed: [],
        unchanged: updated.size === 0 && created.size === 0 && deleted.size === 0,
        serverTimestamp: response.serverTimestamp,
      };

    } catch (error) {
      syncLogger.error('Error syncing locations:', error);
      return {
        updated: [],
        created: [],
        deleted: [],
        confirmed: [],
        unchanged: true,
        serverTimestamp: new Date().toISOString(),
      };
    }
  }
}

export const locationService = new LocationService();
export type { LocationService };
