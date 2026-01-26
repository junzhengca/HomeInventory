import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ContextMenuState, ContextMenuLayout, ContextMenuItemData } from './types';
import { ContextMenuOverlay } from './ContextMenuOverlay';

interface ContextMenuContextType {
    showMenu: (params: {
        layout: ContextMenuLayout;
        items: ContextMenuItemData[];
    }) => void;
    hideMenu: () => void;
    state: ContextMenuState;
}

const ContextMenuContext = createContext<ContextMenuContextType | undefined>(undefined);

export const ContextMenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<ContextMenuState>({
        isVisible: false,
        layout: null,
        items: [],
    });

    const showMenu = useCallback(({ layout, items }: {
        layout: ContextMenuLayout;
        items: ContextMenuItemData[];
    }) => {
        setState({
            isVisible: true,
            layout,
            items,
        });
    }, []);

    const hideMenu = useCallback(() => {
        setState((prev) => ({ ...prev, isVisible: false }));
    }, []);

    return (
        <ContextMenuContext.Provider value={{ showMenu, hideMenu, state }}>
            {children}
            <ContextMenuOverlay />
        </ContextMenuContext.Provider>
    );
};

export const useContextMenu = () => {
    const context = useContext(ContextMenuContext);
    if (!context) {
        throw new Error('useContextMenu must be used within a ContextMenuProvider');
    }
    return context;
};
