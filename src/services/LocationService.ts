import { Location } from '../types/inventory';
import { readFile, writeFile } from './FileSystemService';
import { generateLocationId } from '../utils/idGenerator';

const LOCATIONS_FILE = 'locations.json';

interface LocationsData {
  locations: Location[];
}

/**
 * Get all locations
 */
export const getAllLocations = async (): Promise<Location[]> => {
  const data = await readFile<LocationsData>(LOCATIONS_FILE);
  return data?.locations || [];
};

/**
 * Get a single location by ID
 */
export const getLocationById = async (id: string): Promise<Location | null> => {
  const locations = await getAllLocations();
  return locations.find((location) => location.id === id) || null;
};

/**
 * Create a new location
 */
export const createLocation = async (
  location: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Location | null> => {
  try {
    const locations = await getAllLocations();

    // Check if location name already exists
    const existingLocation = locations.find(
      (loc) => loc.name === location.name
    );

    if (existingLocation) {
      throw new Error('Location with this name already exists');
    }

    const now = new Date().toISOString();
    const newLocation: Location = {
      ...location,
      id: generateLocationId(),
      createdAt: now,
      updatedAt: now,
    };

    locations.push(newLocation);
    const success = await writeFile<LocationsData>(LOCATIONS_FILE, { locations });

    return success ? newLocation : null;
  } catch (error) {
    console.error('Error creating location:', error);
    return null;
  }
};

/**
 * Update an existing location
 */
export const updateLocation = async (
  id: string,
  updates: Partial<Omit<Location, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Location | null> => {
  try {
    const locations = await getAllLocations();
    const index = locations.findIndex((location) => location.id === id);

    if (index === -1) {
      return null;
    }

    // Check for duplicate names
    if (updates.name) {
      const duplicate = locations.find(
        (loc, idx) =>
          idx !== index &&
          loc.name === updates.name
      );

      if (duplicate) {
        throw new Error('Location with this name already exists');
      }
    }

    locations[index] = { ...locations[index], ...updates, updatedAt: new Date().toISOString() };
    const success = await writeFile<LocationsData>(LOCATIONS_FILE, { locations });

    return success ? locations[index] : null;
  } catch (error) {
    console.error('Error updating location:', error);
    return null;
  }
};

/**
 * Delete a location
 */
export const deleteLocation = async (id: string): Promise<boolean> => {
  try {
    const locations = await getAllLocations();
    const location = locations.find((loc) => loc.id === id);

    if (!location) {
      return false; // Location not found
    }

    // Check if location is in use by items
    const { getAllItems } = await import('./InventoryService');
    const items = await getAllItems();
    const inUse = items.some((item) => item.location === id);

    if (inUse) {
      throw new Error('Cannot delete location that is in use by items');
    }

    const filteredLocations = locations.filter((loc) => loc.id !== id);
    return await writeFile<LocationsData>(LOCATIONS_FILE, { locations: filteredLocations });
  } catch (error) {
    console.error('Error deleting location:', error);
    return false;
  }
};

