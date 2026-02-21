import React, { useCallback, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import styled from 'styled-components/native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import type { StyledProps } from '../../utils/styledComponents';
import type { Category } from '../../types/inventory';
import { DEFAULT_INVENTORY_CATEGORY_IDS } from '../../utils/inventoryCategoryI18n';
import { uiLogger } from '../../utils/Logger';
import { useInventoryCategories } from '../../store/hooks';
import { useKeyboardVisibility } from '../../hooks';
import { BottomSheetHeader, FormSection, MemoizedInput } from '../atoms';
import { CategoryPreviewCard, IconSelector, BottomActionBar } from '../molecules';
import { categoryIcons } from '../../data/categoryIcons';

const Backdrop = styled(BottomSheetBackdrop)`
  background-color: rgba(0, 0, 0, 0.5);
`;

const ContentContainer = styled.View`
  flex: 1;
  position: relative;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const EmptyState = styled.View`
  align-items: center;
  padding: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const EmptyStateText = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  text-align: center;
`;

export interface CategoryManagerBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  onCategoriesChanged?: () => void;
}

type FormMode = 'list' | 'create' | 'edit';

interface CategoryFormData {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/**
 * CategoryManagerBottomSheet - Manage custom inventory categories
 * Now uses Redux state and CRUD API endpoints instead of sync/file storage.
 */
export const CategoryManagerBottomSheet: React.FC<
  CategoryManagerBottomSheetProps
> = ({ bottomSheetRef, onCategoriesChanged }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { categories: allCategories, createCategory, updateCategory, deleteCategory, loading } = useInventoryCategories();
  const { isKeyboardVisible, dismissKeyboard } = useKeyboardVisibility();

  // Filter to show only custom categories
  const categories = useMemo(
    () => allCategories.filter((cat) => !DEFAULT_INVENTORY_CATEGORY_IDS.has(cat.id)),
    [allCategories]
  );

  const [mode, setMode] = useState<FormMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    icon: categoryIcons[0] || 'cube-outline',
  });

  const snapPoints = useMemo(() => ['100%'], []);
  const keyboardBehavior = useMemo(() => 'extend' as const, []);
  const keyboardBlurBehavior = useMemo(() => 'restore' as const, []);

  const handleClose = useCallback(() => {
    dismissKeyboard();
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef, dismissKeyboard]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      icon: categoryIcons[0] || 'cube-outline',
    });
    setEditingId(null);
    setMode('list');
  }, []);

  const handleStartCreate = useCallback(() => {
    resetForm();
    setMode('create');
  }, [resetForm]);

  const handleStartEdit = useCallback((category: Category) => {
    setFormData({
      name: category.name,
      icon: (category.icon as keyof typeof Ionicons.glyphMap) || categoryIcons[0] || 'cube-outline',
    });
    setEditingId(category.id);
    setMode('edit');
  }, []);

  const handleCancel = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      Alert.alert(
        t('categoryManager.errors.title'),
        t('categoryManager.errors.enterName')
      );
      return;
    }

    setIsLoading(true);
    try {
      if (editingId) {
        updateCategory(editingId, formData.name.trim(), undefined, undefined, formData.icon);
      } else {
        createCategory(formData.name.trim(), undefined, undefined, formData.icon);
      }

      resetForm();
      onCategoriesChanged?.();
    } catch (error: unknown) {
      uiLogger.error('Error saving category', error);
      const errorMessage = error instanceof Error ? error.message : undefined;
      Alert.alert(
        t('categoryManager.errors.title'),
        errorMessage ||
        (editingId
          ? t('categoryManager.errors.updateFailed')
          : t('categoryManager.errors.createFailed'))
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    formData,
    editingId,
    updateCategory,
    createCategory,
    onCategoriesChanged,
    resetForm,
    t,
  ]);

  const handleDelete = useCallback(
    async (categoryId: string) => {
      Alert.alert(
        t('categoryManager.delete.title'),
        t('categoryManager.delete.message'),
        [
          { text: t('categoryManager.buttons.cancel'), style: 'cancel' },
          {
            text: t('categoryManager.buttons.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                deleteCategory(categoryId);
                onCategoriesChanged?.();
              } catch (error: unknown) {
                uiLogger.error('Error deleting category', error);
                const errorMessage =
                  error instanceof Error ? error.message : undefined;
                Alert.alert(
                  t('categoryManager.errors.title'),
                  errorMessage || t('categoryManager.errors.deleteFailed')
                );
              }
            },
          },
        ]
      );
    },
    [deleteCategory, onCategoriesChanged, t]
  );

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <Backdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const getHeaderText = useCallback(() => {
    if (mode === 'edit') return t('categoryManager.editTitle');
    if (mode === 'create') return t('categoryManager.createTitle');
    return t('categoryManager.title');
  }, [mode, t]);

  const getSubtitleText = useCallback(() => {
    if (mode === 'create' || mode === 'edit')
      return t('categoryManager.formSubtitle');
    return t('categoryManager.subtitle');
  }, [mode, t]);

  const renderFooter = useCallback(() => {
    if (mode === 'create' || mode === 'edit') {
      return (
        <BottomActionBar
          actions={[
            {
              label: t('categoryManager.buttons.cancel'),
              onPress: handleCancel,
              variant: 'outlined',
            },
            {
              label: t('categoryManager.buttons.save'),
              onPress: handleSave,
              variant: 'filled',
              iconName: 'checkmark',
              disabled: isLoading || loading,
            },
          ]}
          safeArea={!isKeyboardVisible}
          inBottomSheet
        />
      );
    }
    return (
      <BottomActionBar
        actions={[
          {
            label: t('categoryManager.buttons.create'),
            onPress: handleStartCreate,
            variant: 'filled',
            iconName: 'add',
          },
        ]}
        safeArea={!isKeyboardVisible}
        inBottomSheet
      />
    );
  }, [
    mode,
    handleCancel,
    handleSave,
    handleStartCreate,
    isLoading,
    loading,
    t,
    isKeyboardVisible,
  ]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.background }}
      enablePanDownToClose
      enableContentPanningGesture={false}
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior={keyboardBlurBehavior}
      android_keyboardInputMode="adjustResize"
      enableHandlePanningGesture={false}
      topInset={insets.top}
      index={0}
      footerComponent={renderFooter}
      enableDynamicSizing={false}
    >
      <ContentContainer>
        <BottomSheetHeader
          title={getHeaderText()}
          subtitle={getSubtitleText()}
          onClose={handleClose}
        />
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.md,
            paddingBottom: theme.spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnPanDownToDismiss={false}
        >
          {mode === 'list' ? (
            <FormSection label={t('categoryManager.customCategories')}>
              {categories.length === 0 ? (
                <EmptyState>
                  <EmptyStateText>
                    {t('categoryManager.emptyState')}
                  </EmptyStateText>
                </EmptyState>
              ) : (
                <View>
                  {categories.map((category) => (
                    <CategoryPreviewCard
                      key={category.id}
                      category={category}
                      onEdit={handleStartEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </View>
              )}
            </FormSection>
          ) : (
            <>
              <FormSection label={t('categoryManager.nameEn')}>
                <MemoizedInput
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, name: text }))
                  }
                  placeholder={t('categoryManager.placeholderEn')}
                  placeholderTextColor={theme.colors.textLight}
                />
              </FormSection>

              <FormSection label={t('categoryManager.icon')}>
                <IconSelector
                  selectedIcon={formData.icon}
                  onIconSelect={(icon) =>
                    setFormData((prev) => ({ ...prev, icon }))
                  }
                />
              </FormSection>
            </>
          )}
        </BottomSheetScrollView>
      </ContentContainer>
    </BottomSheetModal>
  );
};
