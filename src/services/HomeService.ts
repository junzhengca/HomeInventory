import { BehaviorSubject, map } from 'rxjs';
import { readFile, writeFile, deleteHomeFiles } from './FileSystemService';
import { Home } from '../types/home';
import { generateItemId } from '../utils/idGenerator';
import { SyncHomesResponse, PushHomesResponse, HomeSyncData } from '../types/api';
import { initializeHomeData } from './DataInitializationService';
import { syncLogger } from '../utils/Logger';
import { ApiClient } from './ApiClient';

const HOMES_FILE = 'homes.json';

interface HomesData {
    homes: Home[];
    lastSyncTime?: string;
}

class HomeService {
    // Using BehaviorSubject to hold the current state
    private homesSubject = new BehaviorSubject<Home[]>([]);
    private currentHomeIdSubject = new BehaviorSubject<string | null>(null);

    // Expose observables for components to consume
    // Filter out homes that are pending deletion or pending leave so the UI updates immediately
    homes$ = this.homesSubject.asObservable().pipe(
        map(homes => homes.filter(h => !h.pendingDelete && !h.pendingLeave))
    );
    currentHomeId$ = this.currentHomeIdSubject.asObservable();

    /**
     * Initialize the service: read homes from disk, create default if none exist.
     */
    async init() {
        let data = await readFile<HomesData>(HOMES_FILE);

        if (!data || !data.homes || data.homes.length === 0) {
            syncLogger.info('No homes found, creating default home...');
            const defaultHome: Home = {
                id: generateItemId(),
                name: 'My Home',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                clientUpdatedAt: new Date().toISOString(),
                pendingCreate: true,
            };
            data = { homes: [defaultHome] };
            const success = await writeFile(HOMES_FILE, data);
            if (!success) {
                syncLogger.error('Failed to write default home');
                return;
            }
            // Initialize home-specific data files for the default home
            await initializeHomeData(defaultHome.id);
        }

        // Self-healing: Ensure local-only homes are marked as pendingCreate
        let dataChanged = false;
        if (data && data.homes) {
            data.homes = data.homes.map(home => {
                // If a home has no server timestamp and isn't marked for creation/joining, it's a "lost" local home
                if (!home.serverUpdatedAt && !home.pendingCreate && !home.pendingJoin) {
                    syncLogger.info(`Repaired home ${home.id} (missing sync flags)`);
                    dataChanged = true;
                    return {
                        ...home,
                        pendingCreate: true,
                        clientUpdatedAt: home.clientUpdatedAt || home.updatedAt || new Date().toISOString()
                    };
                }
                return home;
            });

            if (dataChanged) {
                await writeFile(HOMES_FILE, data);
            }
        }

        this.homesSubject.next(data.homes);

        // Set initial home (first one) if not already set
        if (!this.currentHomeIdSubject.value && data.homes.length > 0) {
            // Find first available home (not pending delete/leave)
            const availableHome = data.homes.find(h => !h.pendingDelete && !h.pendingLeave);
            if (availableHome) {
                this.currentHomeIdSubject.next(availableHome.id);
            }
        }
    }

    /**
     * Sync homes with server
     */
    async syncHomes(apiClient: ApiClient): Promise<void> {
        syncLogger.info('Starting home sync...');
        try {
            const data = await readFile<HomesData>(HOMES_FILE);
            const lastSyncTime = data?.lastSyncTime;
            const currentHomes = [...this.homesSubject.value];

            // 1. Identify pending changes
            const pendingHomes = currentHomes.filter(h => h.pendingCreate || h.pendingUpdate || h.pendingLeave || h.pendingJoin || h.pendingDelete);

            let syncResponse: SyncHomesResponse | PushHomesResponse;

            if (pendingHomes.length > 0) {
                syncLogger.info(`Pushing ${pendingHomes.length} pending changes...`);
                const pushResponse = await apiClient.pushHomes({
                    homes: pendingHomes.map(h => ({
                        homeId: h.id,
                        name: h.name,
                        address: h.address,
                        clientUpdatedAt: h.clientUpdatedAt || h.updatedAt,
                        pendingCreate: h.pendingCreate,
                        pendingUpdate: h.pendingUpdate,
                        pendingLeave: h.pendingLeave,
                        pendingJoin: h.pendingJoin,
                        pendingDelete: h.pendingDelete,
                    })),
                    lastSyncedAt: lastSyncTime,
                });
                syncResponse = pushResponse;

                // Handle results of push
                for (const result of pushResponse.results) {
                    const localIndex = currentHomes.findIndex(h => h != null && h.id === result.homeId);
                    if (localIndex >= 0) {
                        if (result.status === 'created' || result.status === 'updated') {
                            // Clear pending flags on success
                            currentHomes[localIndex] = {
                                ...currentHomes[localIndex],
                                pendingCreate: false,
                                pendingUpdate: false,
                                serverUpdatedAt: result.serverUpdatedAt,
                                lastSyncedAt: pushResponse.serverTimestamp,
                            };
                        } else if (result.status === 'deleted') {
                            // Home deleted on server, remove locally
                            await deleteHomeFiles(result.homeId);
                            // Mark for deletion by setting pendingDelete
                            currentHomes[localIndex] = {
                                ...currentHomes[localIndex],
                                pendingDelete: true,
                            };
                        } else if (result.status === 'server_version' && result.winner === 'server') {
                            // Server won conflict, update local data
                            currentHomes[localIndex] = {
                                ...currentHomes[localIndex],
                                ...(result.serverVersion ?? {}),
                                id: result.homeId,
                                pendingCreate: false,
                                pendingUpdate: false,
                                serverUpdatedAt: result.serverUpdatedAt,
                                lastSyncedAt: pushResponse.serverTimestamp,
                            };
                        }
                    }
                }

                // Filter out homes marked for deletion
                const filteredHomes = currentHomes.filter(h => !h.pendingDelete);
                // Update array in place
                currentHomes.length = 0;
                currentHomes.push(...filteredHomes);

                // Handle errors (like homeId collisions)
                if ((syncResponse as PushHomesResponse).errors) {
                    (syncResponse as PushHomesResponse).errors.forEach((error) => {
                        if (error.code === 'homeId_exists' && error.suggestedHomeId) {
                            syncLogger.info(`homeId collision for ${error.homeId}, retrying with ${error.suggestedHomeId}`);
                            const localIndex = currentHomes.findIndex(h => h != null && h.id === error.homeId);
                            if (localIndex >= 0) {
                                currentHomes[localIndex] = {
                                    ...currentHomes[localIndex],
                                    id: error.suggestedHomeId,
                                };
                            }
                            // Note: The next sync loop will pick this up and try again
                        }
                    });
                }
            } else {
                syncLogger.info('No pending changes, pulling updates...');
                syncResponse = await apiClient.syncHomes(lastSyncTime, true);
            }

            // 2. Process updates from server (new homes found on server)
            const serverHomes: HomeSyncData[] = 'homes' in syncResponse
                ? (syncResponse as SyncHomesResponse).homes
                : (syncResponse as PushHomesResponse).newHomesFromServer;
            serverHomes.forEach((serverHome) => {
                const homeId = serverHome.homeId;
                const existingIndex = currentHomes.findIndex(h => h.id === homeId);
                const now = new Date().toISOString();
                const mappedHome: Home = {
                    id: homeId,
                    name: serverHome.name,
                    address: serverHome.address,
                    role: serverHome.role,
                    owner: serverHome.owner,
                    settings: serverHome.settings,
                    invitationCode: serverHome.invitationCode,
                    createdAt: serverHome.createdAt || now,
                    updatedAt: serverHome.updatedAt || now,
                    serverUpdatedAt: serverHome.serverUpdatedAt || serverHome.updatedAt,
                    lastSyncedAt: syncResponse.serverTimestamp,
                };

                if (existingIndex >= 0) {
                    // Update existing (if not pending local changes that we just decided to keep)
                    if (!currentHomes[existingIndex].pendingUpdate && !currentHomes[existingIndex].pendingCreate) {
                        currentHomes[existingIndex] = {
                            ...currentHomes[existingIndex],
                            ...mappedHome,
                        };
                    }
                } else {
                    // Add new home
                    currentHomes.push(mappedHome);
                }
            });

            // 3. Handle deletions
            const deletedHomeIds = syncResponse.deletedHomeIds || [];
            let finalHomes = currentHomes;
            if (deletedHomeIds.length > 0) {
                syncLogger.info(`Removing ${deletedHomeIds.length} deleted homes`);
                finalHomes = currentHomes.filter(h => !deletedHomeIds.includes(h.id));
                for (const deletedId of deletedHomeIds) {
                    await deleteHomeFiles(deletedId);
                }
            }

            // 4. Ensure at least one home exists after sync
            const availableAfterSync = finalHomes.filter(h => !h.pendingDelete && !h.pendingLeave);
            if (availableAfterSync.length === 0) {
                syncLogger.info('No homes remaining after sync, creating new default home...');
                const now = new Date().toISOString();
                const defaultHome: Home = {
                    id: generateItemId(),
                    name: 'My Home',
                    createdAt: now,
                    updatedAt: now,
                    clientUpdatedAt: now,
                    pendingCreate: true,
                };
                finalHomes.push(defaultHome);
            }

            // 5. Persist
            const newData: HomesData = {
                homes: finalHomes,
                lastSyncTime: syncResponse.serverTimestamp,
            };

            await writeFile(HOMES_FILE, newData);
            this.homesSubject.next(finalHomes);

            // 6. Handle active home switch if needed
            const activeId = this.currentHomeIdSubject.value;
            // Check if active home was permanently deleted or is now pending delete/leave
            const activeHome = finalHomes.find(h => h.id === activeId);
            if (!activeHome || activeHome.pendingDelete || activeHome.pendingLeave) {
                // Find next available home
                const nextHome = finalHomes.find(h => !h.pendingDelete && !h.pendingLeave);
                if (nextHome) {
                    syncLogger.info('Active home was deleted or unavailable, switching...');
                    this.switchHome(nextHome.id);
                }
            }

            syncLogger.info('Sync complete');

        } catch (error) {
            syncLogger.error('Error syncing homes:', error);
        }
    }

    /**
     * Create a new home and switch to it.
     */
    async createHome(name: string, address?: string): Promise<Home | null> {
        const now = new Date().toISOString();
        const newHome: Home = {
            id: generateItemId(),
            name,
            address,
            role: 'owner',
            createdAt: now,
            updatedAt: now,
            clientUpdatedAt: now,
            pendingCreate: true,
        };

        const currentHomes = this.homesSubject.value;
        const updatedHomes = [...currentHomes, newHome];

        const success = await writeFile<HomesData>(HOMES_FILE, { homes: updatedHomes });
        if (success) {
            this.homesSubject.next(updatedHomes);
            this.switchHome(newHome.id);
            // Initialize home-specific data files (categories, locations, items, todos)
            await initializeHomeData(newHome.id);
            return newHome;
        }
        return null;
    }

    /**
     * Update an existing home locally.
     */
    async updateHome(id: string, updates: Partial<Home>): Promise<boolean> {
        const currentHomes = [...this.homesSubject.value];
        const index = currentHomes.findIndex(h => h.id === id);

        if (index < 0) return false;

        const now = new Date().toISOString();
        currentHomes[index] = {
            ...currentHomes[index],
            ...updates,
            updatedAt: now,
            clientUpdatedAt: now,
            pendingUpdate: true,
        };

        const success = await writeFile<HomesData>(HOMES_FILE, { homes: currentHomes });
        if (success) {
            this.homesSubject.next(currentHomes);
            return true;
        }
        return false;
    }

    /**
     * Delete (or leave) a home.
     */
    async deleteHome(id: string): Promise<boolean> {
        const currentHomes = [...this.homesSubject.value];
        const index = currentHomes.findIndex(h => h.id === id);

        if (index < 0) return false;

        const home = currentHomes[index];
        const now = new Date().toISOString();

        if (home.role === 'owner') {
            // Owner deleting the home
            currentHomes[index] = {
                ...home,
                updatedAt: now,
                clientUpdatedAt: now,
                pendingDelete: true,
            };
        } else {
            // Member leaving the home
            currentHomes[index] = {
                ...home,
                updatedAt: now,
                clientUpdatedAt: now,
                pendingLeave: true,
            };
        }

        // If this was the last available home, create a new default home
        const availableAfterDelete = currentHomes.filter(h => !h.pendingDelete && !h.pendingLeave);
        if (availableAfterDelete.length === 0) {
            syncLogger.info('Last home deleted, creating new default home...');
            const defaultHome: Home = {
                id: generateItemId(),
                name: 'My Home',
                createdAt: now,
                updatedAt: now,
                clientUpdatedAt: now,
                pendingCreate: true,
            };
            currentHomes.push(defaultHome);
        }

        const success = await writeFile<HomesData>(HOMES_FILE, { homes: currentHomes });
        if (success) {
            this.homesSubject.next(currentHomes);

            // If we're deleting/leaving the current home, switch to another one
            if (this.currentHomeIdSubject.value === id) {
                const availableHome = currentHomes.find(h => h.id !== id && !h.pendingLeave && !h.pendingDelete);
                if (availableHome) {
                    this.switchHome(availableHome.id);
                    // If this is a newly created default home, initialize its data files
                    if (availableHome.pendingCreate) {
                        await initializeHomeData(availableHome.id);
                    }
                }
            }
            return true;
        }
        return false;
    }

    /**
     * Switch the active home.
     */
    switchHome(id: string) {
        const home = this.homesSubject.value.find((h) => h.id === id);
        if (home) {
            this.currentHomeIdSubject.next(id);
        } else {
            syncLogger.warn(`Attempted to switch to non-existent homeId: ${id}`);
        }
    }

    /**
     * Get the current home object synchronously.
     * Returns undefined if current home is pending delete/leave.
     */
    getCurrentHome(): Home | undefined {
        const id = this.currentHomeIdSubject.value;
        const home = this.homesSubject.value.find((h) => h.id === id);
        if (home && (home.pendingDelete || home.pendingLeave)) return undefined;
        return home;
    }

    /**
     * Get all homes synchronously.
     * Filter pending delete/leave homes.
     */
    getHomes(): Home[] {
        return this.homesSubject.value.filter(h => !h.pendingDelete && !h.pendingLeave);
    }
}

export const homeService = new HomeService();
