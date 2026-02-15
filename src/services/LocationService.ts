import { Location } from '../types/inventory';
import { generateItemId } from '../utils/idGenerator';
import {
  BaseSyncableEntityService,
  SyncableEntityConfig,
} from './syncable/BaseSyncableEntityService';
import { ApiClient } from './ApiClient';
import { LocationServerData, SyncEntityType } from '../types/api';
import { SyncDelta } from '../types/sync';
import Ionicons from '@expo/vector-icons/Ionicons';

// Base file name (FileSystemService appends _homeId for scoping)
const LOCATIONS_FILE = 'locations.json';
const ENTITY_TYPE: SyncEntityType = 'locations';

interface CreateLocationInput {
  name: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

class LocationService extends BaseSyncableEntityService<Location, LocationServerData> {
  constructor() {
    const config: SyncableEntityConfig<Location, LocationServerData> = {
      entityType: ENTITY_TYPE,
      fileName: LOCATIONS_FILE,
      entityName: 'location',

      generateId: generateItemId,

      toServerData: (location) => ({
        id: location.id,
        name: location.name,
        icon: location.icon,
        homeId: location.homeId,
      }),

      fromServerData: (serverData, meta) => ({
        id: meta.entityId,
        homeId: meta.homeId,
        name: serverData.name,
        icon: serverData.icon as keyof typeof Ionicons.glyphMap | undefined,
        createdAt: meta.updatedAt,
        updatedAt: meta.updatedAt,
        version: meta.version,
        serverUpdatedAt: meta.updatedAt,
        clientUpdatedAt: meta.clientUpdatedAt,
        lastSyncedAt: meta.serverTimestamp,
      }),

      toSyncEntity: (location, homeId) => ({
        entityId: location.id,
        entityType: ENTITY_TYPE,
        homeId,
        data: {
          id: location.id,
          name: location.name,
          icon: location.icon,
          homeId: homeId,
        },
        version: location.version,
        clientUpdatedAt: location.clientUpdatedAt,
        pendingCreate: !!location.pendingCreate,
        pendingDelete: !!location.pendingDelete,
      }),

      createEntity: (input, homeId, id, now) => ({
        ...input,
        homeId,
        id,
        createdAt: now,
        updatedAt: now,
        version: 1,
        clientUpdatedAt: now,
        pendingCreate: true,
        pendingUpdate: false,
        pendingDelete: false,
      }),

      applyUpdate: (entity, updates, now) => ({
        ...entity,
        ...updates,
        updatedAt: now,
        version: entity.version + 1,
        clientUpdatedAt: now,
      }),
    };

    super(config);
  }

  // Method aliases for backward compatibility with components
  async getAllLocations(homeId: string): Promise<Location[]> {
    return this.getAll(homeId);
  }

  async getLocationById(id: string, homeId: string): Promise<Location | null> {
    return this.getById(id, homeId);
  }

  async createLocation(
    input: CreateLocationInput,
    homeId: string
  ): Promise<Location | null> {
    return this.create(input, homeId);
  }

  async updateLocation(
    id: string,
    updates: Partial<Omit<Location, 'id' | 'version' | 'clientUpdatedAt'>>,
    homeId: string
  ): Promise<Location | null> {
    return this.update(id, updates, homeId);
  }

  async deleteLocation(id: string, homeId: string): Promise<boolean> {
    return this.delete(id, homeId);
  }

  async syncLocations(
    homeId: string,
    apiClient: ApiClient,
    deviceId: string
  ): Promise<SyncDelta<Location>> {
    return this.sync(homeId, apiClient, deviceId);
  }
}

export const locationService = new LocationService();
export type { LocationService, CreateLocationInput };
