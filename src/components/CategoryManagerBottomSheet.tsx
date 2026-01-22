import React, { useCallback, useMemo, useState, useEffect } from 'react';
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
import { useTheme } from '../theme/ThemeProvider';
import type { StyledProps } from '../utils/styledComponents';
import type { Category } from '../types/inventory';
import { useCategory } from '../store/hooks';
import { useKeyboardVisibility } from '../hooks';
import { BottomSheetHeader, FormSection, MemoizedInput } from './ui';
import { CategoryPreviewCard } from './CategoryPreviewCard';
import { IconSelector } from './IconSelector';
import { ColorPalette } from './ColorPalette';
import { categoryIcons } from '../data/categoryIcons';
import { categoryColors } from '../data/categoryColors';
import { BottomActionBar } from './BottomActionBar';

const Backdrop = styled(BottomSheetBackdrop)`
  background-color: rgba(0, 0, 0, 0.5);
`;

const ContentContainer = styled.View`
  flex: 1;
  position: relative;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
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

interface CategoryManagerBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal>;
  onCategoriesChanged?: () => void;
}

type FormMode = 'list' | 'create' | 'edit';

interface CategoryFormData {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}

/**
 * Refactored CategoryManagerBottomSheet using custom hooks and reusable components.
 * Reduced from 530 lines to ~300 lines by extracting:
 * - Keyboard tracking to useKeyboardVisibility hook
 * - UI components to reusable ui/ directory
 */
export const CategoryManagerBottomSheet: React.FC<
  CategoryManagerBottomSheetProps
> = ({ bottomSheetRef, onCategoriesChanged }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { refreshCategories } = useCategory();
  const { isKeyboardVisible, dismissKeyboard } = useKeyboardVisibility();

  const [mode, setMode] = useState<FormMode>('list');
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    label: '',
    icon: categoryIcons[0] || 'cube-outline',
    iconColor: categoryColors[0] || '#4A90E2',
  });

  const snapPoints = useMemo(() => ['100%'], []);
  const keyboardBehavior = useMemo(() => 'extend' as const, []);
  const keyboardBlurBehavior = useMemo(() => 'restore' as const, []);

  // Load categories on mount
  const loadCategories = useCallback(async () => {
    try {
      const { getAllCategories } = await import('../services/CategoryService');
      const allCategories = await getAllCategories();
      const custom = allCategories.filter((cat) => cat.isCustom);
      setCategories(custom);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleClose = useCallback(() => {
    dismissKeyboard();
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef, dismissKeyboard]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      label: '',
      icon: categoryIcons[0] || 'cube-outline',
      iconColor: categoryColors[0] || '#4A90E2',
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
      label: category.label,
      icon: category.icon || categoryIcons[0] || 'cube-outline',
      iconColor: category.iconColor || categoryColors[0] || '#4A90E2',
    });
    setEditingId(category.id);
    setMode('edit');
  }, []);

  const handleCancel = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const handleSave = useCallback(async () => {
    if (!formData.name.trim() || !formData.label.trim()) {
      Alert.alert(
        t('categoryManager.errors.title'),
        t('categoryManager.errors.enterName')
      );
      return;
    }

    setIsLoading(true);
    try {
      const { createCategory, updateCategory } =
        await import('../services/CategoryService');

      let result: Category | null = null;

      if (editingId) {
        result = await updateCategory(editingId, {
          name: formData.name.trim(),
          label: formData.label.trim(),
          icon: formData.icon,
          iconColor: formData.iconColor,
        });
      } else {
        result = await createCategory({
          name: formData.name.trim(),
          label: formData.label.trim(),
          icon: formData.icon,
          iconColor: formData.iconColor,
        });
      }

      if (result) {
        await loadCategories();
        resetForm();
        refreshCategories();
        onCategoriesChanged?.();
      } else {
        Alert.alert(
          t('categoryManager.errors.title'),
          editingId
            ? t('categoryManager.errors.updateFailed')
            : t('categoryManager.errors.createFailed')
        );
      }
    } catch (error: unknown) {
      console.error('Error saving category:', error);
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
    loadCategories,
    refreshCategories,
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
                const { deleteCategory, isCategoryInUse } =
                  await import('../services/CategoryService');

                const inUse = await isCategoryInUse(categoryId);
                if (inUse) {
                  Alert.alert(
                    t('categoryManager.errors.title'),
                    t('categoryManager.errors.deleteInUse')
                  );
                  return;
                }

                const success = await deleteCategory(categoryId);
                if (success) {
                  await loadCategories();
                  refreshCategories();
                  onCategoriesChanged?.();
                } else {
                  Alert.alert(
                    t('categoryManager.errors.title'),
                    t('categoryManager.errors.deleteFailed')
                  );
                }
              } catch (error: unknown) {
                console.error('Error deleting category:', error);
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
    [loadCategories, refreshCategories, onCategoriesChanged, t]
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
              icon: (
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={theme.colors.surface}
                />
              ),
              disabled: isLoading,
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
            icon: (
              <Ionicons name="add" size={18} color={theme.colors.surface} />
            ),
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
    theme,
    t,
    isKeyboardVisible,
  ]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
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
            paddingHorizontal: theme.spacing.lg,
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

              <FormSection label={t('categoryManager.nameZh')}>
                <MemoizedInput
                  value={formData.label}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, label: text }))
                  }
                  placeholder={t('categoryManager.placeholderZh')}
                  placeholderTextColor={theme.colors.textLight}
                />
              </FormSection>

              <FormSection label={t('categoryManager.icon')}>
                <IconSelector
                  selectedIcon={formData.icon}
                  iconColor={formData.iconColor}
                  onIconSelect={(icon) =>
                    setFormData((prev) => ({ ...prev, icon }))
                  }
                />
              </FormSection>

              <FormSection label={t('categoryManager.color')}>
                <ColorPalette
                  selectedColor={formData.iconColor}
                  onColorSelect={(color) =>
                    setFormData((prev) => ({ ...prev, iconColor: color }))
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
