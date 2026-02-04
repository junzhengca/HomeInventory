import { EntityType } from '../types/api';
import { InventoryItem, TodoItem, Category, Location } from '../types/inventory';
import { Settings } from '../types/settings';

// Configuration for a syncable entity type
export interface EntityConfig {
    entityType: EntityType;
    collectionName: string; // Internal collection name if needed
    validateData: (data: any) => boolean;
    supportsSoftDelete: boolean;
    // Permissions can be simple strings for now, or functions if we need complex logic
    readPermission: 'owner' | 'member';
    writePermission: 'owner' | 'member';
}

// Registry to hold configurations
class EntityRegistryClass {
    private registry: Record<string, EntityConfig> = {};

    constructor() {
        this.registerDefaults();
    }

    private registerDefaults() {
        // IMPORTANT: Homes MUST be registered and synced FIRST
        // This ensures the home exists on the server before any child entities are synced
        this.register({
            entityType: 'homes',
            collectionName: 'homes',
            supportsSoftDelete: true,
            readPermission: 'owner',
            writePermission: 'owner',
            validateData: (data: any) => {
                return !!(data && typeof data === 'object' && typeof data.name === 'string');
            }
        });

        // Inventory Items
        this.register({
            entityType: 'inventoryItems',
            collectionName: 'inventory_items',
            supportsSoftDelete: true,
            readPermission: 'member', // Logic handled in service/middleware usually, but good for ref
            writePermission: 'member',
            validateData: (data: any) => {
                return !!(data && typeof data === 'object' && typeof data.name === 'string');
            }
        });

        // Todo Items
        this.register({
            entityType: 'todoItems',
            collectionName: 'todo_items',
            supportsSoftDelete: true,
            readPermission: 'member',
            writePermission: 'member',
            validateData: (data: any) => {
                return !!(data && typeof data === 'object' && typeof data.title === 'string');
            }
        });

        // Categories
        this.register({
            entityType: 'categories',
            collectionName: 'categories',
            supportsSoftDelete: true,
            readPermission: 'member',
            writePermission: 'member',
            validateData: (data: any) => {
                return !!(data && typeof data === 'object' && typeof data.name === 'string');
            }
        });

        // Locations
        this.register({
            entityType: 'locations',
            collectionName: 'locations',
            supportsSoftDelete: true,
            readPermission: 'member',
            writePermission: 'member',
            validateData: (data: any) => {
                return !!(data && typeof data === 'object' && typeof data.name === 'string');
            }
        });

        // Settings
        this.register({
            entityType: 'settings',
            collectionName: 'settings',
            supportsSoftDelete: false, // Settings usually update in place
            readPermission: 'member',
            writePermission: 'member',
            validateData: (data: any) => {
                return !!(data && typeof data === 'object');
            }
        });
    }

    register(config: EntityConfig) {
        this.registry[config.entityType] = config;
    }

    getConfig(entityType: EntityType): EntityConfig | undefined {
        return this.registry[entityType];
    }

    getAllEntityTypes(): EntityType[] {
        // IMPORTANT: Return types in proper sync order - homes MUST be first
        // This ensures home exists on server before syncing child entities
        const allTypes = Object.keys(this.registry) as EntityType[];

        // Ensure 'homes' is always first if present
        const homesIndex = allTypes.indexOf('homes');
        if (homesIndex > 0) {
            allTypes.splice(homesIndex, 1);
            allTypes.unshift('homes');
        }

        return allTypes;
    }
}

export const EntityRegistry = new EntityRegistryClass();
