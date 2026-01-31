import React, { useRef, useCallback, useEffect } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import type { InventoryItem } from '../../types/inventory';
import { useAppDispatch } from '../../store/hooks';
import { ItemFormBottomSheet } from './ItemFormBottomSheet';

export interface CreateItemBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  onItemCreated?: () => void;
  initialData?: Partial<InventoryItem> | null;
  onSheetClose?: () => void;
}

/**
 * Create item bottom sheet using shared ItemFormBottomSheet component.
 * Reduced from ~565 lines to ~40 lines by sharing code with EditItemBottomSheet.
 *
 * Uses uncontrolled inputs with refs to prevent IME composition interruption
 * for Chinese/Japanese input methods.
 */
export const CreateItemBottomSheet: React.FC<CreateItemBottomSheetProps> = ({
  bottomSheetRef,
  onItemCreated,
  initialData,
  onSheetClose,
}) => {
  const dispatch = useAppDispatch();
  // const { createItem } = useInventory(); // Removed to prevent re-renders on items change

  const handleSubmit = useCallback(
    async (values: {
      name: string;
      location: string;
      detailedLocation: string;
      status: string;
      price: number;
      amount?: number;
      warningThreshold: number;
      icon: keyof typeof Ionicons.glyphMap;
      iconColor: string;
      purchaseDate?: string;
      expiryDate?: string;
    }) => {
      // createItem(values);
      dispatch({ type: 'inventory/CREATE_ITEM', payload: values });
    },
    [dispatch]
  );

  const handleSuccess = useCallback(() => {
    onItemCreated?.();
  }, [onItemCreated]);

  return (
    <ItemFormBottomSheet
      bottomSheetRef={bottomSheetRef}
      mode="create"
      initialData={initialData}
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      onSheetClose={onSheetClose}
    />
  );
};
