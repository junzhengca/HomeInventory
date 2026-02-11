import React, { useRef, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { InventoryItem } from '../../types/inventory';
import { useAppDispatch } from '../../store/hooks';
import type { RootState } from '../../store';
import { useStore } from 'react-redux';
import { ItemFormBottomSheet, type ItemFormSubmitValues } from './ItemFormBottomSheet';
import { uiLogger } from '../../utils/Logger';

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
    async (values: ItemFormSubmitValues) => {
      uiLogger.info(`handleSubmit called with icon: ${values.icon}`, { iconColor: values.iconColor });
      const itemId = currentItemIdRef.current;
      uiLogger.info('currentItemIdRef.current', itemId);
      if (!itemId) {
        uiLogger.info('NO itemId - returning early!');
        return;
      }
      uiLogger.info('About to call updateItem with itemId', itemId);
      dispatch({ type: 'inventory/UPDATE_ITEM', payload: { id: itemId, updates: values } });

      // Clear the ref after update is dispatched
      currentItemIdRef.current = null;
      uiLogger.info('updateItem called');
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
        uiLogger.info('present called with itemId', itemId);
        const state = store.getState() as RootState;
        const items = state.inventory.items;
        uiLogger.info('items length', items.length);

        const item = items.find((i) => i.id === itemId);
        if (!item) {
          uiLogger.info('Item not found!');
          return;
        }

        uiLogger.info('Item found', item);
        uiLogger.info('bottomSheetRef.current', bottomSheetRef.current);

        // Store the current item ID
        currentItemIdRef.current = itemId;

        // Set initialData - this triggers form population
        setInitialData(item);

        // Present the bottom sheet immediately
        // The form will be populated on the next render cycle
        setTimeout(() => {
          uiLogger.info('Calling present()');
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
      shouldAutoFocus={false}
    />
  );
});

EditItemBottomSheet.displayName = 'EditItemBottomSheet';
