import React, { useRef, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import type { InventoryItem } from '../../types/inventory';
import { useAppDispatch } from '../../store/hooks';
import type { RootState } from '../../store';
import { useStore } from 'react-redux';
import { ItemFormBottomSheet } from './ItemFormBottomSheet';

export interface EditItemBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  onItemUpdated?: () => void;
}

export interface EditItemBottomSheetRef {
  present: (itemId: string) => void;
}

/**
 * Edit item bottom sheet using shared ItemFormBottomSheet component.
 *
 * Uses uncontrolled inputs with refs to prevent IME composition interruption
 * for Chinese/Japanese input methods.
 */
export const EditItemBottomSheet = forwardRef<
  EditItemBottomSheetRef,
  EditItemBottomSheetProps
>(({ bottomSheetRef, onItemUpdated }, ref) => {
  const dispatch = useAppDispatch();
  const store = useStore();
  // const { updateItem, items } = useInventory(); // Removed to prevent re-renders

  // Track which item ID is currently being edited
  const currentItemIdRef = useRef<string | null>(null);
  // State for initial data (triggers form population in hook's useEffect)
  const [initialData, setInitialData] = useState<Partial<InventoryItem> | null>(null);

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
      console.log('[EditItemBottomSheet] handleSubmit called with icon:', values.icon, 'iconColor:', values.iconColor);
      const itemId = currentItemIdRef.current;
      console.log('[EditItemBottomSheet] currentItemIdRef.current:', itemId);
      if (!itemId) {
        console.log('[EditItemBottomSheet] NO itemId - returning early!');
        return;
      }
      console.log('[EditItemBottomSheet] About to call updateItem with itemId:', itemId);
      // updateItem(itemId, values);
      dispatch({ type: 'inventory/UPDATE_ITEM', payload: { id: itemId, updates: values } });

      // Clear the ref after update is dispatched
      currentItemIdRef.current = null;
      console.log('[EditItemBottomSheet] updateItem called');
    },
    [dispatch]
  );

  const handleSuccess = useCallback(() => {
    onItemUpdated?.();
  }, [onItemUpdated]);

  const handleSheetClose = useCallback(() => {
    // Don't clear currentItemIdRef here - it's needed for the form submission
    // It will be cleared after successful update in handleSuccess
    setInitialData(null);
  }, []);

  // Expose present method
  useImperativeHandle(
    ref,
    () => ({
      present: (itemId: string) => {
        console.log('[EditItemBottomSheet] present called with itemId:', itemId);
        const state = store.getState() as RootState;
        const items = state.inventory.items;
        console.log('[EditItemBottomSheet] items length:', items.length);

        const item = items.find((i) => i.id === itemId);
        if (!item) {
          console.log('[EditItemBottomSheet] Item not found!');
          return;
        }

        console.log('[EditItemBottomSheet] Item found:', item);
        console.log('[EditItemBottomSheet] bottomSheetRef.current:', bottomSheetRef.current);

        // Store the current item ID
        currentItemIdRef.current = itemId;

        // Set initialData - this triggers form population
        setInitialData(item);

        // Present the bottom sheet immediately
        // The form will be populated on the next render cycle
        setTimeout(() => {
          console.log('[EditItemBottomSheet] Calling present()');
          bottomSheetRef.current?.present();
        }, 0);
      },
    }),
    [store, bottomSheetRef]
  );

  return (
    <ItemFormBottomSheet
      bottomSheetRef={bottomSheetRef}
      mode="edit"
      initialData={initialData}
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      onSheetClose={handleSheetClose}
    />
  );
});

EditItemBottomSheet.displayName = 'EditItemBottomSheet';
