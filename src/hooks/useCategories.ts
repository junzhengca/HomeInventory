import { useState, useCallback, useEffect } from 'react';
import { Category } from '../types/inventory';
import { getAllCategories } from '../services/CategoryService';
import { useHome } from './useHome';
import { useAppSelector } from '../store/hooks';
import { selectCategoryRefreshTimestamp } from '../store/slices/refreshSlice';
import { uiLogger } from '../utils/Logger';

export const useCategories = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const { currentHomeId } = useHome();
    const refreshTimestamp = useAppSelector(selectCategoryRefreshTimestamp);

    const loadCategories = useCallback(async () => {
        if (!currentHomeId) {
            setCategories([]);
            return;
        }

        setLoading(true);
        try {
            const data = await getAllCategories(currentHomeId);
            setCategories(data);
        } catch (error) {
            uiLogger.error('Failed to load categories', error);
        } finally {
            setLoading(false);
        }
    }, [currentHomeId]);

    // Load categories when home changes or when refresh timestamp changes
    useEffect(() => {
        loadCategories();
    }, [loadCategories, refreshTimestamp]);

    return {
        categories,
        loading,
        refreshCategories: loadCategories,
    };
};
