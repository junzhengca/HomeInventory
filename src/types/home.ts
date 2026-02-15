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
    memberCount?: number;
    isOwner?: boolean;
    createdAt: string;
    updatedAt: string;
}

/**
 * Loading state for home operations
 */
export type HomeOperationType = 'list' | 'create' | 'update' | 'delete' | 'leave';

export interface HomeLoadingState {
    isLoading: boolean;
    operation: HomeOperationType | null;
    error: string | null;
}
