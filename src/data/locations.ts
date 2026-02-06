import { Location } from '../types/inventory';

// Note: These are templates for initialization. homeId will be injected during creation.
export const locations: Omit<Location, 'homeId'>[] = [
  { id: 'kitchen', name: 'Kitchen', icon: 'restaurant-outline', version: 1, clientUpdatedAt: new Date().toISOString() },
  { id: 'medical-cabinet', name: 'Medical Cabinet', icon: 'medkit-outline', version: 1, clientUpdatedAt: new Date().toISOString() },
  { id: 'bookshelf', name: 'Bookshelf', icon: 'book-outline', version: 1, clientUpdatedAt: new Date().toISOString() },
  { id: 'bedroom', name: 'Bedroom', icon: 'bed-outline', version: 1, clientUpdatedAt: new Date().toISOString() },
  { id: 'living-room', name: 'Living Room', icon: 'tv-outline', version: 1, clientUpdatedAt: new Date().toISOString() },
];

