import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TouchableOpacity, Alert, Platform, ScrollView, View, Text } from 'react-native';
import styled from 'styled-components/native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import type { StyledProps, StyledPropsWith } from '../utils/styledComponents';
import { Category, InventoryItem } from '../types/inventory';
import { locations } from '../data/locations';
import { getAllCategories } from '../services/CategoryService';
import { getItemById, updateItem } from '../services/InventoryService';
import { useInventory } from '../contexts/InventoryContext';
import { useCategory } from '../contexts/CategoryContext';
import { formatDate } from '../utils/formatters';
import { filterItemCategories } from '../utils/categoryUtils';
import { CategoryManagerBottomSheet } from './CategoryManagerBottomSheet';

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
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
`;

const FormContainer = styled(View)`
  flex-direction: column;
  gap: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const FormSection = styled(View)``;

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

const CategorySection = styled(View)``;

const CategoryHeader = styled(View)`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const ManageCategoriesButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
`;

const ManageCategoriesText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.primary};
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const CategoryGrid = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: -${({ theme }: StyledProps) => theme.spacing.xs}px;
  margin-left: -${({ theme }: StyledProps) => theme.spacing.xs}px;
  margin-right: -${({ theme }: StyledProps) => theme.spacing.xs}px;
  margin-bottom: -70px;
`;

const CategoryButton = styled(TouchableOpacity)<{ isSelected: boolean }>`
  width: 30%;
  aspect-ratio: 1;
  margin: 1.5%;
  background-color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primaryLightest : theme.colors.surface};
  border-width: 1.5px;
  border-color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const AddCategoryButton = styled(CategoryButton)`
  border-style: dashed;
  border-color: ${({ theme }: StyledProps) => theme.colors.border};
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const CategoryIcon = styled(View)<{ color?: string }>`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const CategoryLabel = styled(Text)<{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.text};
  text-align: center;
`;

const LocationScrollView = styled(ScrollView)`
  flex-direction: row;
  margin: 0;
  padding: 0;
`;

const LocationButton = styled(TouchableOpacity)<{ isSelected: boolean }>`
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  background-color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.primary : theme.colors.border};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const LocationText = styled(Text)<{ isSelected: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>
    isSelected ? theme.colors.surface : theme.colors.text};
`;

const Row = styled(View)`
  flex-direction: row;
  gap: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const HalfContainer = styled(View)`
  flex: 1;
`;

const HalfInput = styled(Input)`
  flex: 1;
`;

const DatePickerContainer = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.border};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const DateText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  flex: 1;
`;

const DatePickerButton = styled(TouchableOpacity)`
  padding: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const TagsContainer = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const Tag = styled(View)`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryLightest};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.primary};
`;

const TagText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.primary};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const TagRemoveButton = styled(TouchableOpacity)`
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const TagInputContainer = styled(View)`
  flex-direction: row;
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const TagInput = styled(Input)`
  flex: 1;
`;

const AddTagButton = styled(TouchableOpacity)`
  background-color: ${({ theme }: StyledProps) => theme.colors.primary};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  align-items: center;
  justify-content: center;
`;


interface EditItemBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  itemId: string;
  onItemUpdated?: () => void;
}

export const EditItemBottomSheet: React.FC<EditItemBottomSheetProps> = ({
  bottomSheetRef,
  itemId,
  onItemUpdated,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { refreshItems } = useInventory();
  const { refreshCategories, registerRefreshCallback } = useCategory();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [price, setPrice] = useState('0');
  const [detailedLocation, setDetailedLocation] = useState('');
  const [amount, setAmount] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [showPurchaseDatePicker, setShowPurchaseDatePicker] = useState(false);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const categoryManagerRef = React.useRef<BottomSheetModal>(null);

  // Filter to get only item-type categories (exclude location categories)
  const itemTypeCategories = useMemo(() => {
    return filterItemCategories(categories);
  }, [categories]);

  useEffect(() => {
    const loadItem = async () => {
      try {
        const itemData = await getItemById(itemId);
        if (itemData) {
          setItem(itemData);
          setName(itemData.name);
          setSelectedCategory(itemData.category);
          setSelectedLocation(itemData.location);
          setPrice(itemData.price.toString());
          setDetailedLocation(itemData.detailedLocation || '');
          setAmount(itemData.amount?.toString() || '');
          setTags(itemData.tags || []);
          setPurchaseDate(itemData.purchaseDate ? new Date(itemData.purchaseDate) : null);
          setExpiryDate(itemData.expiryDate ? new Date(itemData.expiryDate) : null);
        }
      } catch (error) {
        console.error('Error loading item:', error);
      }
    };

    const loadCategories = async () => {
      try {
        const allCategories = await getAllCategories();
        setCategories(allCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    if (itemId) {
      loadItem();
      loadCategories();
    }
  }, [itemId]);

  const loadCategoriesCallback = useCallback(async () => {
    try {
      const allCategories = await getAllCategories();
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  const handleCategoriesChanged = useCallback(() => {
    loadCategoriesCallback();
  }, [loadCategoriesCallback]);

  useEffect(() => {
    const unregister = registerRefreshCallback(loadCategoriesCallback);
    return unregister;
  }, [registerRefreshCallback, loadCategoriesCallback]);

  const snapPoints = useMemo(() => ['100%'], []);

  const keyboardBehavior = useMemo(() => 'interactive', []);
  const keyboardBlurBehavior = useMemo(() => 'restore', []);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef]);

  const handleAddTag = useCallback(() => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag('');
    }
  }, [newTag, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  }, [tags]);

  const handlePurchaseDateChange = useCallback((_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPurchaseDatePicker(false);
    }
    if (selectedDate) {
      setPurchaseDate(selectedDate);
    }
    if (Platform.OS === 'ios') {
      setShowPurchaseDatePicker(false);
    }
  }, []);

  const handleExpiryDateChange = useCallback((_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowExpiryDatePicker(false);
    }
    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
    if (Platform.OS === 'ios') {
      setShowExpiryDatePicker(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('错误', '请输入物品名称');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('错误', '请选择分类');
      return;
    }
    if (!selectedLocation) {
      Alert.alert('错误', '请选择位置');
      return;
    }

    setIsLoading(true);
    try {
      const category = categories.find((cat) => cat.id === selectedCategory);
      const priceNum = parseFloat(price) || 0;
      const amountNum = amount ? parseInt(amount, 10) : undefined;

      const updates = {
        name: name.trim(),
        category: selectedCategory,
        location: selectedLocation,
        detailedLocation: detailedLocation.trim(),
        price: priceNum,
        amount: amountNum,
        tags: tags,
        purchaseDate: purchaseDate ? purchaseDate.toISOString() : undefined,
        expiryDate: expiryDate ? expiryDate.toISOString() : undefined,
        icon: category?.icon || item?.icon || 'cube-outline',
        iconColor: category?.iconColor || item?.iconColor || theme.colors.textSecondary,
      };

      const updatedItem = await updateItem(itemId, updates);

      if (updatedItem) {
        handleClose();
        refreshItems();
        // Refresh categories if category was changed
        if (selectedCategory !== item?.category) {
          refreshCategories();
        }
        if (onItemUpdated) {
          onItemUpdated();
        }
      } else {
        Alert.alert('错误', '更新物品失败，请重试');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert('错误', '更新物品失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [
    name,
    selectedCategory,
    selectedLocation,
    price,
    detailedLocation,
    amount,
    tags,
    purchaseDate,
    expiryDate,
    categories,
    itemId,
    item,
    theme,
    handleClose,
    onItemUpdated,
    refreshItems,
    refreshCategories,
  ]);

  const renderBackdrop = useCallback(
    (props: Parameters<typeof BottomSheetBackdrop>[0]) => <Backdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  const renderFooter = useCallback(
    () => (
      <View style={{ 
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        paddingBottom: insets.bottom + theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderLight,
      }}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.7}
          style={{
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
            保存修改
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [handleSubmit, isLoading, theme, insets.bottom]
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
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.lg }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnPanDownToDismiss={false}
        >
          <Header>
            <HeaderLeft>
              <Title>修改物品</Title>
              <Subtitle>更新物品信息</Subtitle>
            </HeaderLeft>
            <CloseButton onPress={handleClose}>
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </CloseButton>
          </Header>

          <FormContainer>
          <FormSection>
            <Label>名字</Label>
            <Input
              placeholder="例如:可爱的小杯子"
              value={name}
              onChangeText={setName}
              placeholderTextColor={theme.colors.textLight}
            />
          </FormSection>

          <FormSection>
            <CategorySection>
              <CategoryHeader>
                <Label>分类</Label>
                <ManageCategoriesButton onPress={() => categoryManagerRef.current?.present()} activeOpacity={0.7}>
                  <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
                  <ManageCategoriesText>管理分类</ManageCategoriesText>
                </ManageCategoriesButton>
              </CategoryHeader>
              <CategoryGrid>
                {itemTypeCategories.map((category) => (
                  <CategoryButton
                    key={category.id}
                    isSelected={selectedCategory === category.id}
                    onPress={() => setSelectedCategory(category.id)}
                    activeOpacity={0.7}
                  >
                    {category.icon && (
                      <CategoryIcon color={category.iconColor}>
                        <Ionicons
                          name={category.icon}
                          size={24}
                          color={category.iconColor || theme.colors.primary}
                        />
                      </CategoryIcon>
                    )}
                    <CategoryLabel isSelected={selectedCategory === category.id}>
                      {category.label}
                    </CategoryLabel>
                  </CategoryButton>
                ))}
                <AddCategoryButton onPress={() => categoryManagerRef.current?.present()} activeOpacity={0.7}>
                  <Ionicons name="add" size={32} color={theme.colors.textLight} />
                  <CategoryLabel isSelected={false}>添加</CategoryLabel>
                </AddCategoryButton>
              </CategoryGrid>
            </CategorySection>
          </FormSection>

          <FormSection>
            <Label>位置</Label>
            <LocationScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 0 }}
            >
              {locations.map((location) => (
                <LocationButton
                  key={location.id}
                  isSelected={selectedLocation === location.id}
                  onPress={() => setSelectedLocation(location.id)}
                  activeOpacity={0.7}
                >
                  <LocationText isSelected={selectedLocation === location.id}>
                    {location.name}
                  </LocationText>
                </LocationButton>
              ))}
            </LocationScrollView>
          </FormSection>

          <FormSection>
            <Row>
              <HalfContainer>
                <Label>价格</Label>
                <HalfInput
                  placeholder="0"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholderTextColor={theme.colors.textLight}
                />
              </HalfContainer>
              <HalfContainer>
                <Label>具体位置</Label>
                <HalfInput
                  placeholder="比如:门口鞋柜"
                  value={detailedLocation}
                  onChangeText={setDetailedLocation}
                  placeholderTextColor={theme.colors.textLight}
                />
              </HalfContainer>
            </Row>
          </FormSection>

          <FormSection>
            <Label>数量</Label>
            <Input
              placeholder="1"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholderTextColor={theme.colors.textLight}
            />
          </FormSection>

          <FormSection>
            <Label>标签</Label>
            {tags.length > 0 && (
              <TagsContainer>
                {tags.map((tag, index) => (
                  <Tag key={index}>
                    <TagText>#{tag}</TagText>
                    <TagRemoveButton onPress={() => handleRemoveTag(tag)}>
                      <Ionicons name="close-circle" size={16} color={theme.colors.primary} />
                    </TagRemoveButton>
                  </Tag>
                ))}
              </TagsContainer>
            )}
            <TagInputContainer>
              <TagInput
                placeholder="添加标签"
                value={newTag}
                onChangeText={setNewTag}
                placeholderTextColor={theme.colors.textLight}
                onSubmitEditing={handleAddTag}
              />
              <AddTagButton onPress={handleAddTag} activeOpacity={0.8}>
                <Ionicons name="add" size={20} color={theme.colors.surface} />
              </AddTagButton>
            </TagInputContainer>
          </FormSection>

          <FormSection>
            <Label>购买时间</Label>
            <DatePickerContainer>
              <DateText>{formatDate(purchaseDate)}</DateText>
              <DatePickerButton onPress={() => setShowPurchaseDatePicker(true)}>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
              </DatePickerButton>
            </DatePickerContainer>
            {showPurchaseDatePicker && (
              <DateTimePicker
                value={purchaseDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handlePurchaseDateChange}
                maximumDate={new Date()}
              />
            )}
          </FormSection>

          <FormSection>
            <Label>过期时间</Label>
            <DatePickerContainer>
              <DateText>{formatDate(expiryDate)}</DateText>
              <DatePickerButton onPress={() => setShowExpiryDatePicker(true)}>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
              </DatePickerButton>
            </DatePickerContainer>
            {showExpiryDatePicker && (
              <DateTimePicker
                value={expiryDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleExpiryDateChange}
                minimumDate={new Date()}
              />
            )}
          </FormSection>
        </FormContainer>
        </BottomSheetScrollView>
      </ContentContainer>

      <CategoryManagerBottomSheet
        bottomSheetRef={categoryManagerRef}
        onCategoriesChanged={handleCategoriesChanged}
      />
    </BottomSheetModal>
  );
};

