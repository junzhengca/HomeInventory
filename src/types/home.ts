import { SyncMetadata } from './inventory';

export interface Home extends SyncMetadata {
    id: string;
    name: string;
    address?: string; // Detailed address
    createdAt: string;
    updatedAt: string;
}
