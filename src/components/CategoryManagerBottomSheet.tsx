import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TouchableOpacity, Alert, View, Text, Keyboard } from 'react-native';
import styled from 'styled-components/native';
// Note: View and Text are imported above and will be used in styled components
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import type { StyledProps } from '../utils/styledComponents';
import { Category } from '../types/inventory';
import { getAllCategories, createCategory, updateCategory, deleteCategory, isCategoryInUse } from '../services/CategoryService';
import { useCategory } from '../store/hooks';
import { IconSelector } from './IconSelector';
import { ColorPalette } from './ColorPalette';
import { CategoryPreviewCard } from './CategoryPreviewCard';
import { categoryIcons } from '../data/categoryIcons';
import { categoryColors } from '../data/categoryColors';
import { BottomActionBar } from './BottomActionBar';

const Backdrop = styled(BottomSheetBackdrop)`
  background-color: rgba(0, 0, 0, 0.5);
`;

const Header = styled(View)`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const HeaderLeft = styled(View)`
  flex: 1;
`;

const Title = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.xxl}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const Subtitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

const CloseButton = styled(TouchableOpacity)`
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  align-items: center;
  justify-content: center;
`;

const ContentContainer = styled(View)`
  flex: 1;
  position: relative;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
`;

const FormSection = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const Label = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const Input = styled(BottomSheetTextInput)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.border};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const CategoriesList = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;


const EmptyState = styled(View)`
  align-items: center;
  padding: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const EmptyStateText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  text-align: center;
`;

interface CategoryManagerBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal>;
  onCategoriesChanged?: () => void;
}

export const CategoryManagerBottomSheet: React.FC<CategoryManagerBottomSheetProps> = ({
  bottomSheetRef,
  onCategoriesChanged,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { refreshCategories } = useCategory();
  const [_categories, setCategories] = useState<Category[]>([]);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryLabel, setCategoryLabel] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof Ionicons.glyphMap>(categoryIcons?.[0] || 'cube-outline');
  const [selectedColor, setSelectedColor] = useState<string>(categoryColors?.[0] || '#4A90E2');
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const snapPoints = useMemo(() => ['100%'], []);

  const keyboardBehavior = useMemo(() => 'interactive' as const, []);
  const keyboardBlurBehavior = useMemo(() => 'restore' as const, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const allCategories = await getAllCategories();
        setCategories(allCategories);
        const custom = allCategories.filter((cat) => cat.isCustom);
        setCustomCategories(custom);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Track keyboard visibility to adjust footer padding
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener('keyboardWillShow', () => {
      setIsKeyboardVisible(true);
    });

    const keyboardWillHideListener = Keyboard.addListener('keyboardWillHide', () => {
      setIsKeyboardVisible(false);
    });

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
    setIsCreating(false);
    setEditingCategoryId(null);
    setCategoryName('');
    setCategoryLabel('');
    setSelectedIcon(categoryIcons?.[0] || 'cube-outline');
    setSelectedColor(categoryColors?.[0] || '#4A90E2');
  }, [bottomSheetRef]);

  const handleStartCreate = useCallback(() => {
    setIsCreating(true);
    setEditingCategoryId(null);
    setCategoryName('');
    setCategoryLabel('');
    setSelectedIcon(categoryIcons?.[0] || 'cube-outline');
    setSelectedColor(categoryColors?.[0] || '#4A90E2');
  }, []);

  const handleStartEdit = useCallback((category: Category) => {
    setIsCreating(false);
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryLabel(category.label);
    setSelectedIcon(category.icon || categoryIcons[0]);
    setSelectedColor(category.iconColor || categoryColors[0]);
  }, []);

  const handleCancel = useCallback(() => {
    setIsCreating(false);
    setEditingCategoryId(null);
    setCategoryName('');
    setCategoryLabel('');
    setSelectedIcon(categoryIcons?.[0] || 'cube-outline');
    setSelectedColor(categoryColors?.[0] || '#4A90E2');
  }, []);

  const handleSave = useCallback(async () => {
    if (!categoryName.trim() || !categoryLabel.trim()) {
      Alert.alert(t('categoryManager.errors.title'), t('categoryManager.errors.enterName'));
      return;
    }

    setIsLoading(true);
    try {
      let result: Category | null = null;

      if (editingCategoryId) {
        // Update existing category
        result = await updateCategory(editingCategoryId, {
          name: categoryName.trim(),
          label: categoryLabel.trim(),
          icon: selectedIcon,
          iconColor: selectedColor,
        });
      } else {
        // Create new category
        result = await createCategory({
          name: categoryName.trim(),
          label: categoryLabel.trim(),
          icon: selectedIcon,
          iconColor: selectedColor,
        });
      }

      if (result) {
        // Reload categories
        const allCategories = await getAllCategories();
        setCategories(allCategories);
        const custom = allCategories.filter((cat) => cat.isCustom);
        setCustomCategories(custom);

        // Reset form
        setIsCreating(false);
        setEditingCategoryId(null);
        setCategoryName('');
        setCategoryLabel('');
        setSelectedIcon(categoryIcons[0]);
        setSelectedColor(categoryColors[0]);

        // Refresh categories globally
        refreshCategories();

        // Notify parent
        if (onCategoriesChanged) {
          onCategoriesChanged();
        }
      } else {
        Alert.alert(
          t('categoryManager.errors.title'),
          editingCategoryId ? t('categoryManager.errors.updateFailed') : t('categoryManager.errors.createFailed')
        );
      }
    } catch (error: unknown) {
      console.error('Error saving category:', error);
      const errorMessage = error instanceof Error ? error.message : undefined;
      Alert.alert(
        t('categoryManager.errors.title'),
        errorMessage || (editingCategoryId ? t('categoryManager.errors.updateFailed') : t('categoryManager.errors.createFailed'))
      );
    } finally {
      setIsLoading(false);
    }
  }, [categoryName, categoryLabel, selectedIcon, selectedColor, editingCategoryId, onCategoriesChanged, refreshCategories, t]);

  const handleDelete = useCallback(async (categoryId: string) => {
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
              const inUse = await isCategoryInUse(categoryId);
              if (inUse) {
                Alert.alert(t('categoryManager.errors.title'), t('categoryManager.errors.deleteInUse'));
                return;
              }

              const success = await deleteCategory(categoryId);
              if (success) {
                // Reload categories
                const allCategories = await getAllCategories();
                setCategories(allCategories);
                const custom = allCategories.filter((cat) => cat.isCustom);
                setCustomCategories(custom);

                // Refresh categories globally
                refreshCategories();

                // Notify parent
                if (onCategoriesChanged) {
                  onCategoriesChanged();
                }
              } else {
                Alert.alert(t('categoryManager.errors.title'), t('categoryManager.errors.deleteFailed'));
              }
            } catch (error: unknown) {
              console.error('Error deleting category:', error);
              const errorMessage = error instanceof Error ? error.message : undefined;
              Alert.alert(t('categoryManager.errors.title'), errorMessage || t('categoryManager.errors.deleteFailed'));
            }
          },
        },
      ]
    );
  }, [onCategoriesChanged, refreshCategories, t]);

  const renderBackdrop = useCallback(
    (props: Parameters<typeof BottomSheetBackdrop>[0]) => <Backdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  const showForm = isCreating || editingCategoryId !== null;

  const renderFooter = useCallback(
    () => {
      if (showForm) {
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
                icon: <Ionicons name="checkmark" size={18} color={theme.colors.surface} />,
                disabled: isLoading,
              },
            ]}
            safeArea={!isKeyboardVisible}
            inBottomSheet={true}
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
              icon: <Ionicons name="add" size={18} color={theme.colors.surface} />,
            },
          ]}
          safeArea={!isKeyboardVisible}
          inBottomSheet={true}
        />
      );
    },
    [showForm, handleCancel, handleSave, handleStartCreate, isLoading, theme, t, isKeyboardVisible]
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
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
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.lg }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnPanDownToDismiss={false}
        >
          <Header>
            <HeaderLeft>
              <Title>
                {showForm
                  ? (editingCategoryId ? t('categoryManager.editTitle') : t('categoryManager.createTitle'))
                  : t('categoryManager.title')}
              </Title>
              <Subtitle>
                {showForm
                  ? t('categoryManager.formSubtitle')
                  : t('categoryManager.subtitle')}
              </Subtitle>
            </HeaderLeft>
            <CloseButton onPress={handleClose}>
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </CloseButton>
          </Header>

        {!showForm ? (
          <>
            <FormSection>
              <Label>{t('categoryManager.customCategories')}</Label>
              {customCategories.length === 0 ? (
                <EmptyState>
                  <EmptyStateText>{t('categoryManager.emptyState')}</EmptyStateText>
                </EmptyState>
              ) : (
                <CategoriesList>
                  {customCategories.map((category) => (
                    <CategoryPreviewCard
                      key={category.id}
                      category={category}
                      onEdit={handleStartEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </CategoriesList>
              )}
            </FormSection>
          </>
        ) : (
          <>
            <FormSection>
              <Label>{t('categoryManager.nameEn')}</Label>
              <Input
                placeholder={t('categoryManager.placeholderEn')}
                value={categoryName}
                onChangeText={setCategoryName}
                placeholderTextColor={theme.colors.textLight}
              />
            </FormSection>

            <FormSection>
              <Label>{t('categoryManager.nameZh')}</Label>
              <Input
                placeholder={t('categoryManager.placeholderZh')}
                value={categoryLabel}
                onChangeText={setCategoryLabel}
                placeholderTextColor={theme.colors.textLight}
              />
            </FormSection>

            <FormSection style={{ marginBottom: theme.spacing.md }}>
              <IconSelector
                selectedIcon={selectedIcon}
                iconColor={selectedColor}
                onIconSelect={setSelectedIcon}
              />
            </FormSection>

            <FormSection>
              <ColorPalette
                selectedColor={selectedColor}
                onColorSelect={setSelectedColor}
              />
            </FormSection>
          </>
        )}
        </BottomSheetScrollView>
      </ContentContainer>
    </BottomSheetModal>
  );
};

