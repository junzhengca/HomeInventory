import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import { getLightColor } from '../utils/colors';
import { IconSelector } from './IconSelector';
import { ColorPalette } from './ColorPalette';
import type { StyledProps } from '../utils/styledComponents';

const PickerTrigger = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const IconContainer = styled(View)<{ backgroundColor: string }>`
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background-color: ${({ backgroundColor }) => backgroundColor};
  align-items: center;
  justify-content: center;
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
`;

const ModalContainer = styled(View)`
  flex: 1;
  justify-content: flex-end;
`;

const ModalOverlay = styled(Animated.View)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: black;
`;

const ModalContent = styled(Animated.View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-top-left-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  border-top-right-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  max-height: 85%;
`;

const ModalHeader = styled(View)`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const ModalTitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const CloseButton = styled(TouchableOpacity)`
  padding: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const ScrollContent = styled(ScrollView)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const Section = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const SectionLabel = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

interface IconColorPickerProps {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onIconSelect: (icon: keyof typeof Ionicons.glyphMap) => void;
  onColorSelect: (color: string) => void;
}

export const IconColorPicker: React.FC<IconColorPickerProps> = ({
  icon,
  color,
  onIconSelect,
  onColorSelect,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation values
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(1)).current;

  // Animate modal in/out
  useEffect(() => {
    if (showModal) {
      setIsAnimating(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsAnimating(false);
      });
    }
  }, [showModal, backdropOpacity, slideY]);

  const handleOpen = useCallback(() => {
    setShowModal(true);
  }, []);

  const handleClose = useCallback(() => {
    if (!isAnimating && showModal) {
      setIsAnimating(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: 1,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowModal(false);
        setIsAnimating(false);
      });
    }
  }, [isAnimating, showModal, backdropOpacity, slideY]);

  return (
    <>
      <PickerTrigger onPress={handleOpen} activeOpacity={0.7}>
        <IconContainer backgroundColor={getLightColor(color)}>
          <Ionicons name={icon} size={28} color={color} />
        </IconContainer>
      </PickerTrigger>

      <Modal
        visible={showModal}
        transparent
        animationType="none"
        onRequestClose={handleClose}
      >
        <ModalContainer>
          <ModalOverlay
            style={{ opacity: backdropOpacity }}
            pointerEvents="box-none"
          >
            <Pressable style={{ flex: 1 }} onPress={handleClose}>
              <View />
            </Pressable>
          </ModalOverlay>
          <ModalContent
            style={{
              transform: [
                {
                  translateY: slideY.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 600],
                  }),
                },
              ],
            }}
          >
            <ModalHeader>
              <ModalTitle>{t('iconColorPicker.title')}</ModalTitle>
              <CloseButton onPress={handleClose}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </CloseButton>
            </ModalHeader>

            <ScrollContent showsVerticalScrollIndicator={false}>
              <Section>
                <SectionLabel>{t('iconColorPicker.colorLabel')}</SectionLabel>
                <ColorPalette
                  selectedColor={color}
                  onColorSelect={onColorSelect}
                  showLabel={false}
                />
              </Section>

              <Section>
                <SectionLabel>{t('iconColorPicker.iconLabel')}</SectionLabel>
                <IconSelector
                  selectedIcon={icon}
                  iconColor={color}
                  onIconSelect={onIconSelect}
                  showLabel={false}
                />
              </Section>
            </ScrollContent>
          </ModalContent>
        </ModalContainer>
      </Modal>
    </>
  );
};
