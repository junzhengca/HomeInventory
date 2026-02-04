import { BehaviorSubject } from 'rxjs';
import { readFile, writeFile } from './FileSystemService';
import { Home } from '../types/home';
import { generateItemId } from '../utils/idGenerator';

const HOMES_FILE = 'homes.json';

interface HomesData {
    homes: Home[];
    activeHomeId?: string;
}

class HomeService {
    // Using BehaviorSubject to hold the current state
    private homesSubject = new BehaviorSubject<Home[]>([]);
    private currentHomeIdSubject = new BehaviorSubject<string | null>(null);

    // Expose observables for components to consume
    homes$ = this.homesSubject.asObservable();
    currentHomeId$ = this.currentHomeIdSubject.asObservable();

    /**
     * Initialize the service: read homes from disk, create default if none exist.
     */
    async init() {
        let data = await readFile<HomesData>(HOMES_FILE);

        if (!data || !data.homes || data.homes.length === 0) {
            console.log('[HomeService] No homes found, creating default home...');
            const defaultHome: Home = {
                id: generateItemId(),
                name: 'My Home',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            data = {
                homes: [defaultHome],
                activeHomeId: defaultHome.id
            };
            const success = await writeFile(HOMES_FILE, data);
            if (!success) {
                console.error('[HomeService] Failed to write default home');
                return;
            }
        }

        this.homesSubject.next(data.homes);

        // Determine active home
        let activeHomeId = data.activeHomeId;

        // Validate activeHomeId exists in homes list
        const isValidHome = activeHomeId && data.homes.some(h => h.id === activeHomeId);

        if (!isValidHome) {
            // Fallback to first home if activeHomeId is missing or invalid
            if (data.homes.length > 0) {
                activeHomeId = data.homes[0].id;
                console.log('[HomeService] Active home invalid or missing, falling back to first home:', activeHomeId);

                // Persist the correction
                await writeFile<HomesData>(HOMES_FILE, {
                    homes: data.homes,
                    activeHomeId
                });
            }
        }

        if (activeHomeId) {
            this.currentHomeIdSubject.next(activeHomeId);
        }
    }

    /**
     * Create a new home and switch to it.
     */
    async createHome(name: string, address?: string): Promise<Home | null> {
        const newHome: Home = {
            id: generateItemId(),
            name,
            address,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const currentHomes = this.homesSubject.value;
        const updatedHomes = [...currentHomes, newHome];

        // When creating a new home, we switch to it, so it becomes active
        const success = await writeFile<HomesData>(HOMES_FILE, {
            homes: updatedHomes,
            activeHomeId: newHome.id
        });

        if (success) {
            this.homesSubject.next(updatedHomes);
            this.switchHome(newHome.id); // switchHome also updates subject, but we already saved to disk
            return newHome;
        }
        return null;
    }

    /**
     * Switch the active home.
     */
    async switchHome(id: string) {
        const home = this.homesSubject.value.find((h) => h.id === id);
        if (home) {
            this.currentHomeIdSubject.next(id);
            // Persist the switch
            await writeFile<HomesData>(HOMES_FILE, {
                homes: this.homesSubject.value,
                activeHomeId: id
            });
        } else {
            console.warn(`[HomeService] Attempted to switch to non-existent homeId: ${id}`);
        }
    }

    /**
     * Get the current home object synchronously.
     */
    getCurrentHome(): Home | undefined {
        const id = this.currentHomeIdSubject.value;
        return this.homesSubject.value.find((h) => h.id === id);
    }
}

export const homeService = new HomeService();
