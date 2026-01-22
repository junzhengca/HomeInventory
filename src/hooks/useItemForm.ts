import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { InventoryItem } from '../types/inventory';
import { getItemById } from '../services/InventoryService';
import { useInventory, useAppSelector } from '../store/hooks';
import { selectItemById } from '../store/slices/inventorySlice';

/**
 * Form data structure for item creation/editing
 */
export interface ItemFormData {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  locationId: string;
  status: string;
  price: string;
  detailedLocation: string;
  amount: string;
  warningThreshold: string;
  purchaseDate: Date | null;
  expiryDate: Date | null;
}

/**
 * Form validation errors
 */
export interface ItemFormErrors {
  name?: string;
  locationId?: string;
}

interface UseItemFormOptions {
  itemId?: string;
  onItemLoaded?: (item: InventoryItem) => void;
}

interface UseItemFormReturn {
  // State
  item: InventoryItem | null;
  formData: ItemFormData;
  isLoading: boolean;
  isSaving: boolean;
  errors: ItemFormErrors;

  // Actions
  updateField: <K extends keyof ItemFormData>(
    field: K,
    value: ItemFormData[K]
  ) => void;
  validate: () => boolean;
  reset: () => void;
  initializeFromItem: (item: InventoryItem) => void;
}

const INITIAL_FORM_DATA: ItemFormData = {
  name: '',
  icon: 'cube-outline',
  iconColor: '#95A5A6',
  locationId: '',
  status: 'using',
  price: '0',
  detailedLocation: '',
  amount: '',
  warningThreshold: '0',
  purchaseDate: null,
  expiryDate: null,
};

/**
 * Hook to manage item form state, validation, and data loading.
 * Used by both CreateItemBottomSheet and EditItemBottomSheet.
 *
 * @param options - Configuration options including itemId for editing
 * @returns Form state and handlers
 *
 * @example
 * const {
 *   formData,
 *   categories,
 *   updateField,
 *   validate
 * } = useItemForm({ itemId: '123' });
 */
export const useItemForm = ({
  itemId,
  onItemLoaded,
}: UseItemFormOptions = {}): UseItemFormReturn => {
  const { t } = useTranslation();
  const { loading: itemsLoading } = useInventory();

  // Get item from Redux store if itemId is provided
  const itemFromRedux = useAppSelector((state) =>
    itemId ? selectItemById(state, itemId) : null
  );

  const [item, setItem] = useState<InventoryItem | null>(itemFromRedux);
  const [formData, setFormData] = useState<ItemFormData>(INITIAL_FORM_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving] = useState(false);
  const [errors, setErrors] = useState<ItemFormErrors>({});

  // Track if form was initialized to prevent re-initialization during edits
  const isInitializedRef = useRef(false);

  // Load item data if itemId is provided
  useEffect(() => {
    const loadItem = async () => {
      // If item is in Redux, use it
      if (itemFromRedux) {
        setItem(itemFromRedux);
        return;
      }

      // If items are still loading, wait
      if (itemsLoading) {
        return;
      }

      // Items are loaded but item not found, try loading from service
      if (itemId && !isInitializedRef.current) {
        setIsLoading(true);
        try {
          const itemData = await getItemById(itemId);
          if (itemData) {
            setItem(itemData);
          }
        } catch (error) {
          console.error('Error loading item:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadItem();
  }, [itemFromRedux, itemId, itemsLoading]);

  // Initialize form data when item is loaded
  const initializeFromItem = useCallback(
    (itemData: InventoryItem) => {
      setFormData({
        name: itemData.name,
        icon: itemData.icon,
        iconColor: itemData.iconColor,
        locationId: itemData.location,
        status: itemData.status || 'using',
        price: itemData.price.toString(),
        detailedLocation: itemData.detailedLocation || '',
        amount: itemData.amount?.toString() ?? '',
        warningThreshold: itemData.warningThreshold?.toString() || '0',
        purchaseDate: itemData.purchaseDate
          ? new Date(itemData.purchaseDate)
          : null,
        expiryDate: itemData.expiryDate ? new Date(itemData.expiryDate) : null,
      });
      isInitializedRef.current = true;
      onItemLoaded?.(itemData);
    },
    [onItemLoaded]
  );

  // Auto-initialize when item changes (only for edit mode)
  useEffect(() => {
    if (item && itemId && !isInitializedRef.current) {
      initializeFromItem(item);
    }
  }, [item, itemId, initializeFromItem]);

  const updateField = useCallback(
    <K extends keyof ItemFormData>(field: K, value: ItemFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error when field is updated
      if (errors[field as keyof ItemFormErrors]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field as keyof ItemFormErrors];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const validate = useCallback((): boolean => {
    const newErrors: ItemFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('editItem.errors.enterName');
    }
    if (!formData.locationId) {
      newErrors.locationId = t('editItem.errors.selectLocation');
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      if (firstError) {
        Alert.alert(t('editItem.errors.title'), firstError);
      }
      return false;
    }

    return true;
  }, [formData, t]);

  const reset = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    isInitializedRef.current = false;
  }, []);

  return {
    item,
    formData,
    isLoading,
    isSaving,
    errors,
    updateField,
    validate,
    reset,
    initializeFromItem,
  };
};
