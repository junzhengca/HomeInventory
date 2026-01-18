import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { InventoryItem, Category } from '../types/inventory';
import { getItemById } from '../services/InventoryService';
import { getAllCategories } from '../services/CategoryService';
import { useInventory, useCategory, useAppSelector } from '../store/hooks';
import { selectItemById } from '../store/slices/inventorySlice';

/**
 * Form data structure for item creation/editing
 */
export interface ItemFormData {
  name: string;
  categoryId: string;
  locationId: string;
  price: string;
  detailedLocation: string;
  amount: string;
  tags: string[];
  purchaseDate: Date | null;
  expiryDate: Date | null;
}

/**
 * Form validation errors
 */
export interface ItemFormErrors {
  name?: string;
  categoryId?: string;
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
  categories: Category[];
  isLoading: boolean;
  isSaving: boolean;
  errors: ItemFormErrors;

  // Actions
  updateField: <K extends keyof ItemFormData>(
    field: K,
    value: ItemFormData[K]
  ) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  validate: () => boolean;
  reset: () => void;
  initializeFromItem: (item: InventoryItem) => void;
}

const INITIAL_FORM_DATA: ItemFormData = {
  name: '',
  categoryId: '',
  locationId: '',
  price: '0',
  detailedLocation: '',
  amount: '',
  tags: [],
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
 *   addTag,
 *   validate
 * } = useItemForm({ itemId: '123' });
 */
export const useItemForm = ({
  itemId,
  onItemLoaded,
}: UseItemFormOptions = {}): UseItemFormReturn => {
  const { t } = useTranslation();
  const { loading: itemsLoading } = useInventory();
  useCategory();

  // Get item from Redux store if itemId is provided
  const itemFromRedux = useAppSelector((state) =>
    itemId ? selectItemById(state, itemId) : null
  );

  const [item, setItem] = useState<InventoryItem | null>(itemFromRedux);
  const [formData, setFormData] = useState<ItemFormData>(INITIAL_FORM_DATA);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving] = useState(false);
  const [errors, setErrors] = useState<ItemFormErrors>({});

  // Track if form was initialized to prevent re-initialization during edits
  const isInitializedRef = useRef(false);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const allCategories = await getAllCategories();
        setCategories(allCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    loadCategories();
  }, []);

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
        categoryId: itemData.category,
        locationId: itemData.location,
        price: itemData.price.toString(),
        detailedLocation: itemData.detailedLocation || '',
        amount: itemData.amount?.toString() || '',
        tags: itemData.tags || [],
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

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (trimmed && !formData.tags.includes(trimmed)) {
        setFormData((prev) => ({ ...prev, tags: [...prev.tags, trimmed] }));
      }
    },
    [formData.tags]
  );

  const removeTag = useCallback((tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: ItemFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('editItem.errors.enterName');
    }
    if (!formData.categoryId) {
      newErrors.categoryId = t('editItem.errors.selectCategory');
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
    categories,
    isLoading,
    isSaving,
    errors,
    updateField,
    addTag,
    removeTag,
    validate,
    reset,
    initializeFromItem,
  };
};
