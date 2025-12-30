import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TouchableOpacity, Alert, View, Text } from 'react-native';
import styled from 'styled-components/native';
// Note: View and Text are imported above and will be used in styled components
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import type { StyledProps } from '../utils/styledComponents';
import { Category } from '../types/inventory';
import { getAllCategories, createCategory, updateCategory, deleteCategory, isCategoryInUse } from '../services/CategoryService';
import { useCategory } from '../contexts/CategoryContext';
import { IconSelector } from './IconSelector';
import { ColorPalette } from './ColorPalette';
import { CategoryPreviewCard } from './CategoryPreviewCard';
import { categoryIcons } from '../data/categoryIcons';
import { categoryColors } from '../data/categoryColors';

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

  const snapPoints = useMemo(() => ['90%'], []);

  const keyboardBehavior = useMemo(() => 'interactive', []);
  const keyboardBlurBehavior = useMemo(() => 'restore', []);

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
      Alert.alert('错误', '请输入分类名称');
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
        Alert.alert('错误', editingCategoryId ? '更新分类失败，请重试' : '创建分类失败，请重试');
      }
    } catch (error: unknown) {
      console.error('Error saving category:', error);
      const errorMessage = error instanceof Error ? error.message : undefined;
      Alert.alert('错误', errorMessage || (editingCategoryId ? '更新分类失败' : '创建分类失败'));
    } finally {
      setIsLoading(false);
    }
  }, [categoryName, categoryLabel, selectedIcon, selectedColor, editingCategoryId, onCategoriesChanged, refreshCategories]);

  const handleDelete = useCallback(async (categoryId: string) => {
    Alert.alert(
      '确认删除',
      '确定要删除这个分类吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const inUse = await isCategoryInUse(categoryId);
              if (inUse) {
                Alert.alert('错误', '无法删除正在使用的分类');
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
                Alert.alert('错误', '删除分类失败，请重试');
              }
            } catch (error: unknown) {
              console.error('Error deleting category:', error);
              const errorMessage = error instanceof Error ? error.message : undefined;
              Alert.alert('错误', errorMessage || '删除分类失败');
            }
          },
        },
      ]
    );
  }, [onCategoriesChanged, refreshCategories]);

  const renderBackdrop = useCallback(
    (props: Parameters<typeof BottomSheetBackdrop>[0]) => <Backdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  const showForm = isCreating || editingCategoryId !== null;

  const renderFooter = useCallback(
    () => {
      if (showForm) {
        return (
          <View style={{ 
            backgroundColor: theme.colors.surface,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            paddingBottom: insets.bottom + theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: theme.colors.borderLight,
            flexDirection: 'row',
            gap: theme.spacing.md,
          }}>
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.7}
              style={{
                flex: 1,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.sm + 2,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: theme.colors.border,
                minHeight: 44,
              }}
            >
              <Text style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.text,
              }}>
                取消
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading}
              activeOpacity={0.7}
              style={{
                flex: 1,
                backgroundColor: theme.colors.primary,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.sm + 2,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                minHeight: 44,
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              <Ionicons name="checkmark" size={18} color={theme.colors.surface} />
              <Text style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.surface,
                marginLeft: theme.spacing.xs,
              }}>
                保存
              </Text>
            </TouchableOpacity>
          </View>
        );
      }
      return (
        <View style={{ 
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          paddingBottom: insets.bottom + theme.spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.colors.borderLight,
        }}>
          <TouchableOpacity
            onPress={handleStartCreate}
            activeOpacity={0.7}
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.sm + 2,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              minHeight: 44,
            }}
          >
            <Ionicons name="add" size={18} color={theme.colors.surface} />
            <Text style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.surface,
              marginLeft: theme.spacing.xs,
            }}>
              新建分类
            </Text>
          </TouchableOpacity>
        </View>
      );
    },
    [showForm, handleCancel, handleSave, handleStartCreate, isLoading, theme, insets.bottom]
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
              <Title>{showForm ? (editingCategoryId ? '编辑分类' : '新建分类') : '管理分类'}</Title>
              <Subtitle>
                {showForm
                  ? '设置分类名称、图标和颜色'
                  : '创建和编辑自定义分类'}
              </Subtitle>
            </HeaderLeft>
            <CloseButton onPress={handleClose}>
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </CloseButton>
          </Header>

        {!showForm ? (
          <>
            <FormSection>
              <Label>自定义分类</Label>
              {customCategories.length === 0 ? (
                <EmptyState>
                  <EmptyStateText>还没有自定义分类</EmptyStateText>
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
              <Label>分类名称（英文）</Label>
              <Input
                placeholder="例如: electronics"
                value={categoryName}
                onChangeText={setCategoryName}
                placeholderTextColor={theme.colors.textLight}
              />
            </FormSection>

            <FormSection>
              <Label>分类名称（中文）</Label>
              <Input
                placeholder="例如: 电子产品"
                value={categoryLabel}
                onChangeText={setCategoryLabel}
                placeholderTextColor={theme.colors.textLight}
              />
            </FormSection>

            <FormSection>
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

