import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Keyboard,
} from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLightColor } from '../../utils/colors';
import { IconSelector } from './IconSelector';
import { ColorPalette } from './ColorPalette';
import { BottomSheetHeader, Button } from '../atoms';
import type { StyledProps } from '../../utils/styledComponents';

const PickerTrigger = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const IconContainer = styled(View) <{ backgroundColor: string }>`
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background-color: ${({ backgroundColor }: { backgroundColor: string }) => backgroundColor};
  align-items: center;
  justify-content: center;
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
`;

const Backdrop = styled(BottomSheetBackdrop)`
  background-color: rgba(0, 0, 0, 0.5);
`;

const ContentContainer = styled.View`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
  border-top-left-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  border-top-right-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  overflow: hidden;
`;

const Section = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const SectionLabel = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const FooterContainer = styled.View<{ bottomInset: number }>`
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  padding-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-bottom: ${({ bottomInset, theme }: { bottomInset: number } & StyledProps) => bottomInset + theme.spacing.md}px;
  border-bottom-left-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  border-bottom-right-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  shadow-color: #000;
  shadow-offset: 0px -2px;
  shadow-opacity: 0.03;
  shadow-radius: 4px;
  elevation: 2;
`;

export interface IconColorPickerProps {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onIconSelect: (icon: keyof typeof Ionicons.glyphMap) => void;
  onColorSelect: (color: string) => void;
  onOpeningNestedModal?: (isOpening: boolean) => void;
}

export const IconColorPicker: React.FC<IconColorPickerProps> = ({
  icon,
  color,
  onIconSelect,
  onColorSelect,
  onOpeningNestedModal,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const bottomSheetModalRef = useRef<BottomSheetModal | null>(null);

  // Temporary state for selections (only applied on save)
  const [tempIcon, setTempIcon] = useState<keyof typeof Ionicons.glyphMap>(icon);
  const [tempColor, setTempColor] = useState<string>(color);

  // Sync with props when they change from outside
  useEffect(() => {
    setTempIcon(icon);
    setTempColor(color);
  }, [icon, color]);

  const snapPoints = useMemo(() => ['75%'], []);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <Backdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const handleOpen = useCallback(() => {
    // Dismiss keyboard before opening
    Keyboard.dismiss();

    // Notify parent that we're opening a nested modal (to skip dirty check)
    onOpeningNestedModal?.(true);

    // Reset temp state to current props values
    setTempIcon(icon);
    setTempColor(color);
    bottomSheetModalRef.current?.present();
  }, [icon, color, onOpeningNestedModal]);

  const handleClose = useCallback(() => {
    // Notify parent that nested modal is closing
    onOpeningNestedModal?.(false);
    bottomSheetModalRef.current?.dismiss();
  }, [onOpeningNestedModal]);

  const handleSheetClose = useCallback(() => {
    // Notify parent that nested modal is closing
    onOpeningNestedModal?.(false);

    // Reset temp state when modal closes without saving
    setTempIcon(icon);
    setTempColor(color);
  }, [icon, color, onOpeningNestedModal]);

  const handleSave = useCallback(() => {
    // Apply the changes
    onIconSelect(tempIcon);
    onColorSelect(tempColor);
    // handleClose will notify parent that nested modal is closing
    handleClose();
  }, [tempIcon, tempColor, onIconSelect, onColorSelect, handleClose]);

  const handleIconSelect = useCallback((selectedIcon: keyof typeof Ionicons.glyphMap) => {
    setTempIcon(selectedIcon);
  }, []);

  const handleColorSelect = useCallback((selectedColor: string) => {
    setTempColor(selectedColor);
  }, []);

  const renderFooter = useCallback(
    () => (
      <FooterContainer bottomInset={insets.bottom}>
        <Button
          label={t('iconColorPicker.save')}
          onPress={handleSave}
          variant="primary"
          icon="checkmark"
        />
      </FooterContainer>
    ),
    [handleSave, insets.bottom, t]
  );

  return (
    <>
      <PickerTrigger onPress={handleOpen} activeOpacity={0.7}>
        <IconContainer backgroundColor={getLightColor(color)}>
          <Ionicons name={icon} size={28} color={color} />
        </IconContainer>
      </PickerTrigger>

      <BottomSheetModal
        ref={bottomSheetModalRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose={true}
        enableContentPanningGesture={false}
        android_keyboardInputMode="adjustResize"
        enableHandlePanningGesture={false}
        handleComponent={null}
        topInset={insets.top}
        enableDynamicSizing={false}
        stackBehavior="push"
        footerComponent={renderFooter}
        backgroundStyle={{ backgroundColor: 'transparent' }}
        onChange={(index) => {
          if (index === -1) {
            handleSheetClose();
          }
        }}
      >
        <ContentContainer>
          <BottomSheetHeader
            title={t('iconColorPicker.title')}
            subtitle={t('iconColorPicker.subtitle')}
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
            <Section>
              <SectionLabel>{t('iconColorPicker.colorLabel')}</SectionLabel>
              <ColorPalette
                selectedColor={tempColor}
                onColorSelect={handleColorSelect}
                showLabel={false}
              />
            </Section>

            <Section>
              <SectionLabel>{t('iconColorPicker.iconLabel')}</SectionLabel>
              <IconSelector
                selectedIcon={tempIcon}
                iconColor={tempColor}
                onIconSelect={handleIconSelect}
                showLabel={false}
              />
            </Section>
          </BottomSheetScrollView>
        </ContentContainer>
      </BottomSheetModal>
    </>
  );
};
