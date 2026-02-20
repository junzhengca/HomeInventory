import { fileSystemService } from './FileSystemService';
import { Home, HomeLoadingState, HomeOperationType } from '../types/home';
import { generateItemId } from '../utils/idGenerator';
import { dataInitializationService } from './DataInitializationService';
import { storageLogger } from '../utils/Logger';
import { ApiClient } from './ApiClient';
import {
    ListHomesResponse,
    CreateHomeRequest,
    UpdateHomeRequest,
    DeleteHomeResponse,
    LeaveHomeResponse,
    HomeDto,
} from '../types/api';

const HOMES_FILE = 'homes.json';

interface HomesData {
    homes: Home[];
}

class HomeService {
    // Simple state instead of RxJS BehaviorSubject
    private homes: Home[] = [];
    private currentHomeId: string | null = null;
    private listeners: Set<() => void> = new Set();

    // Loading state tracking
    private loadingState: HomeLoadingState = {
        isLoading: false,
        operation: null,
        error: null,
    };

    /**
     * Initialize the service: read homes from disk.
     * Does NOT create default home - homes should come from server or explicit creation.
     */
    async init(): Promise<void> {
        const data = await fileSystemService.readFile<HomesData>(HOMES_FILE);
        const homesData = data || { homes: [] };

        // If no homes exist, initialize with empty array (no default home)
        if (!homesData.homes || homesData.homes.length === 0) {
            storageLogger.info('No homes found, initializing with empty list');
            homesData.homes = [];
            await fileSystemService.writeFile(HOMES_FILE, homesData);
        }

        // Migration: Clean up legacy sync metadata from existing homes
        const cleanedHomes = homesData.homes.map(home => {
            const legacyKeys = [
                'serverUpdatedAt', 'clientUpdatedAt', 'lastSyncedAt',
                'pendingCreate', 'pendingUpdate', 'pendingLeave', 'pendingJoin', 'pendingDelete'
            ];
            const hasLegacyKeys = legacyKeys.some(key => key in home);
            if (hasLegacyKeys) {
                storageLogger.info(`Migrating home ${home.id}, removing sync metadata`);
                const cleaned = { ...home };
                legacyKeys.forEach(key => delete (cleaned as Record<string, unknown>)[key]);
                return cleaned as Home;
            }
            return home;
        });

        // If migration happened, persist the cleaned data
        if (cleanedHomes.length !== homesData.homes.length ||
            cleanedHomes.some((h, i) => h !== homesData.homes[i])) {
            homesData.homes = cleanedHomes;
            await fileSystemService.writeFile(HOMES_FILE, homesData);
        }

        this.homes = homesData.homes;

        // Set initial home (first one) if not already set
        if (!this.currentHomeId && this.homes.length > 0) {
            this.currentHomeId = this.homes[0].id;
        }
    }

    /**
     * Subscribe to home state changes
     * @returns Unsubscribe function
     */
    subscribe(callback: () => void): () => void {
        this.listeners.add(callback);
        return () => {
            this.listeners.delete(callback);
        };
    }

    /**
     * Notify all listeners of state change
     */
    private notifyListeners(): void {
        this.listeners.forEach(cb => cb());
    }

    /**
     * Get current loading state
     */
    getLoadingState(): HomeLoadingState {
        return { ...this.loadingState };
    }

    /**
     * Set loading state
     */
    private setLoading(operation: HomeOperationType | null, error: string | null = null): void {
        this.loadingState = {
            isLoading: operation !== null,
            operation,
            error,
        };
        this.notifyListeners();
    }

    /**
     * Persist homes to local storage
     */
    private async persist(): Promise<void> {
        const data: HomesData = { homes: this.homes };
        await fileSystemService.writeFile(HOMES_FILE, data);
    }

    /**
     * Convert API DTO to domain model
     */
    private dtoToHome(dto: HomeDto): Home {
        const now = new Date().toISOString();
        return {
            id: dto.homeId,
            name: dto.name,
            address: dto.address,
            role: dto.role,
            owner: dto.owner,
            settings: dto.settings,
            invitationCode: dto.invitationCode,
            memberCount: dto.memberCount,
            isOwner: dto.role === 'owner',
            createdAt: dto.createdAt || now,
            updatedAt: dto.updatedAt || now,
        };
    }

    /**
     * Fetch homes from server
     */
    async fetchHomes(apiClient: ApiClient): Promise<Home[]> {
        this.setLoading('list');
        try {
            const response = await apiClient.listHomes() as ListHomesResponse;
            const homes = response.homes.map(dto => this.dtoToHome(dto));

            // Merge with local homes (preserve local homes that haven't been synced yet)
            const syncedHomeIds = new Set(homes.map(h => h.id));
            const localOnlyHomes = this.homes.filter(h => !syncedHomeIds.has(h.id));

            const mergedHomes = [...homes, ...localOnlyHomes];
            this.homes = mergedHomes;

            // Persist merged list
            await this.persist();

            // Ensure we have an active home
            if (!this.currentHomeId && this.homes.length > 0) {
                this.currentHomeId = this.homes[0].id;
            }

            this.setLoading(null);
            this.notifyListeners();
            return this.homes;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch homes';
            storageLogger.error('Failed to fetch homes:', error);
            this.setLoading(null, errorMessage);
            throw error;
        }
    }

    /**
     * Create a new home and switch to it
     */
    async createHome(apiClient: ApiClient, name: string, address?: string): Promise<Home | null> {
        this.setLoading('create');
        try {
            const newId = generateItemId();
            const request: CreateHomeRequest = {
                homeId: newId,
                name,
                address,
            };

            const response = await apiClient.createHome(request) as { home: HomeDto };
            const newHome = this.dtoToHome(response.home);

            // Add to homes list
            this.homes.push(newHome);
            await this.persist();

            // Switch to the new home
            this.switchHome(newHome.id);

            // Initialize home-specific data files
            await dataInitializationService.initializeHomeData(newHome.id);

            this.setLoading(null);
            this.notifyListeners();
            return newHome;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create home';
            storageLogger.error('Failed to create home:', error);
            this.setLoading(null, errorMessage);
            throw error;
        }
    }

    /**
     * Update an existing home
     */
    async updateHome(apiClient: ApiClient, id: string, updates: { name?: string; address?: string }): Promise<boolean> {
        this.setLoading('update');
        try {
            const request: UpdateHomeRequest = updates;
            const response = await apiClient.updateHome(id, request) as { home: HomeDto };

            // Update local home
            const index = this.homes.findIndex(h => h.id === id);
            if (index >= 0) {
                this.homes[index] = this.dtoToHome(response.home);
                await this.persist();
                this.notifyListeners();
            }

            this.setLoading(null);
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update home';
            storageLogger.error('Failed to update home:', error);
            this.setLoading(null, errorMessage);
            return false;
        }
    }

    /**
     * Delete (or leave) a home
     * @param apiClient - API client instance
     * @param id - Home ID
     * @param userId - Optional user ID. Required when leaving as a member. If not provided and role is member, will use owner's userId (for backward compatibility)
     */
    async deleteHome(apiClient: ApiClient, id: string, userId?: string): Promise<boolean> {
        this.setLoading('delete');
        try {
            const home = this.homes.find(h => h.id === id);
            if (!home) {
                this.setLoading(null, 'Home not found');
                return false;
            }

            if (home.role === 'owner') {
                // Owner deleting the home
                await apiClient.deleteHome(id) as DeleteHomeResponse;
            } else {
                // Member leaving the home - userId is required
                const memberUserId = userId || home.owner?.userId;
                if (!memberUserId) {
                    this.setLoading(null, 'User ID not found');
                    return false;
                }
                await apiClient.leaveHome(id, memberUserId) as LeaveHomeResponse;
            }

            // Remove from local list
            const wasActiveHome = this.currentHomeId === id;
            this.homes = this.homes.filter(h => h.id !== id);
            await this.persist();

            // If we deleted the active home, switch to another one
            if (wasActiveHome) {
                if (this.homes.length > 0) {
                    this.switchHome(this.homes[0].id);
                } else {
                    this.currentHomeId = null;
                }
            }

            // Delete home-specific files
            await fileSystemService.deleteHomeFiles(id);

            this.setLoading(null);
            this.notifyListeners();
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete home';
            storageLogger.error('Failed to delete home:', error);
            this.setLoading(null, errorMessage);
            return false;
        }
    }

    /**
     * Switch the active home
     */
    switchHome(id: string): void {
        const home = this.homes.find((h) => h.id === id);
        if (home) {
            this.currentHomeId = id;
            this.notifyListeners();
        } else {
            storageLogger.warn(`Attempted to switch to non-existent homeId: ${id}`);
        }
    }

    /**
     * Get the current home object synchronously
     */
    getCurrentHome(): Home | null {
        if (!this.currentHomeId) return null;
        return this.homes.find((h) => h.id === this.currentHomeId) ?? null;
    }

    /**
     * Get all homes synchronously
     */
    getHomes(): Home[] {
        return [...this.homes];
    }

    /**
     * Ensure at least one home exists, creating default if needed
     */
    async ensureDefaultHome(apiClient: ApiClient): Promise<Home | null> {
        const homes = this.getHomes();

        if (homes.length === 0) {
            storageLogger.info('No homes found, creating default home...');
            try {
                const newHome = await this.createHome(apiClient, 'My Home');
                if (newHome) {
                    storageLogger.info('Default home created and initialized');
                    return newHome;
                }
            } catch (error) {
                storageLogger.error('Failed to create default home via API, falling back to local-only home', error);
                // Fallback: create local-only home
                const now = new Date().toISOString();
                const defaultHome: Home = {
                    id: generateItemId(),
                    name: 'My Home',
                    createdAt: now,
                    updatedAt: now,
                };

                this.homes.push(defaultHome);
                await this.persist();
                this.switchHome(defaultHome.id);
                await dataInitializationService.initializeHomeData(defaultHome.id);
                return defaultHome;
            }
            return null;
        }

        // If we have homes but no active home, set the first one
        if (!this.currentHomeId && homes.length > 0) {
            this.switchHome(homes[0].id);
            await dataInitializationService.initializeHomeData(homes[0].id);
            return homes[0];
        }

        return this.getCurrentHome();
    }
}

export const homeService = new HomeService();
