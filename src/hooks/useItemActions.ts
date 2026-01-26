import { Alert } from 'react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useInventory } from '../store/hooks';

export const useItemActions = () => {
    const { t } = useTranslation();
    const { deleteItem } = useInventory();

    const confirmDelete = useCallback(
        (itemId: string, onDeleted?: () => void) => {
            Alert.alert(
                t('itemDetails.delete.title'),
                t('itemDetails.delete.message'),
                [
                    {
                        text: t('itemDetails.delete.cancel'),
                        style: 'cancel',
                    },
                    {
                        text: t('itemDetails.delete.confirm'),
                        style: 'destructive',
                        onPress: () => {
                            deleteItem(itemId);
                            onDeleted?.();
                        },
                    },
                ]
            );
        },
        [t, deleteItem]
    );

    return {
        confirmDelete,
    };
};
