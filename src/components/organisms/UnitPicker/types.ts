export interface UnitItemData {
    id: string;
    label: string;
    value: string;
}

export interface UnitPickerState {
    isVisible: boolean;
    layout: {
        x: number;
        y: number;
        width: number;
        height: number;
        pageX: number;
        pageY: number;
    } | null;
    items: UnitItemData[];
    selectedValue: string;
    onSelect: (value: string) => void;
}
