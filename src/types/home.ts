export interface Home {
    id: string;
    name: string;
    address?: string; // Detailed address
    role?: 'owner' | 'member';
    owner?: {
        userId: string;
        email: string;
        nickname: string;
        avatarUrl?: string;
    };
    settings?: {
        canShareInventory: boolean;
        canShareTodos: boolean;
    };
    invitationCode?: string;
    createdAt: string;
    updatedAt: string;

    // Sync metadata
    serverUpdatedAt?: string;
    clientUpdatedAt?: string;
    lastSyncedAt?: string;

    // Pending operations
    pendingCreate?: boolean;
    pendingUpdate?: boolean;
    pendingLeave?: boolean;
    pendingJoin?: boolean;
    pendingDelete?: boolean;
}
