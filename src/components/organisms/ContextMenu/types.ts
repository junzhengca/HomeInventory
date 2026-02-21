import { ReactNode } from 'react';

export interface ContextMenuItemData {
    id: string;
    label: string;
    icon?: string;
    onPress: () => void;
    isDestructive?: boolean;
    disabled?: boolean;
}

export interface ContextMenuLayout {
    x: number;
    y: number;
    width: number;
    height: number;
    pageX: number;
    pageY: number;
}

export interface ContextMenuState {
    isVisible: boolean;
    layout: ContextMenuLayout | null;
    items: ContextMenuItemData[];
    renderContent?: () => ReactNode;
}
