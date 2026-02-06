import { useState, useCallback, useEffect } from 'react';
import { Category } from '../types/inventory';
import { getAllCategories } from '../services/CategoryService';
import { useHome } from './useHome';
import { uiLogger } from '../utils/Logger';

export const useCategories = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const { currentHomeId } = useHome();

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

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    return {
        categories,
        loading,
        refreshCategories: loadCategories,
    };
};
