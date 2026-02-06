import React, { useRef, useCallback, useEffect } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Ionicons } from '@expo/vector-icons';
import type { InventoryItem } from '../../types/inventory';
import { useAppDispatch } from '../../store/hooks';
import { ItemFormBottomSheet } from './ItemFormBottomSheet';
import { uiLogger } from '../../utils/Logger';

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

  const [lastLocation, setLastLocation] = React.useState<string | undefined>(undefined);
  const [lastStatus, setLastStatus] = React.useState<string | undefined>(undefined);

  // Load persisted values on mount
  React.useEffect(() => {
    (async () => {
      try {
        const location = await AsyncStorage.getItem('LAST_CREATED_ITEM_LOCATION');
        const status = await AsyncStorage.getItem('LAST_CREATED_ITEM_STATUS');
        if (location) setLastLocation(location);
        if (status) setLastStatus(status);
      } catch (error) {
        uiLogger.error('Failed to load last created item settings', error);
      }
    })();
  }, []);

  const combinedInitialData = React.useMemo(() => {
    const data = { ...initialData };
    if (!data.location && lastLocation) {
      data.location = lastLocation;
    }
    if (!data.status && lastStatus) {
      data.status = lastStatus;
    }
    return data;
  }, [initialData, lastLocation, lastStatus]);

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

      // Save location and status
      try {
        await AsyncStorage.setItem('LAST_CREATED_ITEM_LOCATION', values.location);
        await AsyncStorage.setItem('LAST_CREATED_ITEM_STATUS', values.status);
        setLastLocation(values.location);
        setLastStatus(values.status);
      } catch (error) {
        uiLogger.error('Failed to save last created item settings', error);
      }
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
      initialData={combinedInitialData}
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      onSheetClose={onSheetClose}
    />
  );
};
