import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { UnitPickerState, UnitItemData } from './types';
import { UnitDropdownOverlay } from './UnitDropdownOverlay';

interface UnitPickerContextType {
    state: UnitPickerState;
    showPicker: (params: {
        layout: UnitPickerState['layout'];
        items: UnitItemData[];
        selectedValue: string;
        onSelect: (value: string) => void;
    }) => void;
    hidePicker: () => void;
}

const UnitPickerContext = createContext<UnitPickerContextType | undefined>(undefined);

export const UnitPickerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<UnitPickerState>({
        isVisible: false,
        layout: null,
        items: [],
        selectedValue: '',
        onSelect: () => { },
    });

    const showPicker = useCallback((params: {
        layout: UnitPickerState['layout'];
        items: UnitItemData[];
        selectedValue: string;
        onSelect: (value: string) => void;
    }) => {
        setState({
            isVisible: true,
            layout: params.layout,
            items: params.items,
            selectedValue: params.selectedValue,
            onSelect: params.onSelect,
        });
    }, []);

    const hidePicker = useCallback(() => {
        setState((prev) => ({ ...prev, isVisible: false }));
    }, []);

    return (
        <UnitPickerContext.Provider value={{ state, showPicker, hidePicker }}>
            {children}
            <UnitDropdownOverlay />
        </UnitPickerContext.Provider>
    );
};

export const useUnitPicker = () => {
    const context = useContext(UnitPickerContext);
    if (!context) {
        throw new Error('useUnitPicker must be used within a UnitPickerProvider');
    }
    return context;
};
