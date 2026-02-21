import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TouchableOpacity, View, Text, Modal, Platform, Pressable, Animated, Easing } from 'react-native';
import styled from 'styled-components/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import type { StyledProps } from '../../utils/styledComponents';
import { formatDate } from '../../utils/formatters';
import { GlassButton } from '../atoms/GlassButton';

const DatePickerContainer = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.border};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => `${theme.spacing.sm}px ${theme.spacing.xl}px ${theme.spacing.sm}px ${theme.spacing.md}px`};
  height: 48px;
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
  padding-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
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

const ButtonContainer = styled(View)`
  flex-direction: row;
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

export interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder,
  minimumDate,
  maximumDate,
}) => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(value || new Date());
  const [showNativePicker, setShowNativePicker] = useState(false);

  // Animation values
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(1)).current;

  // Animate modal in/out
  useEffect(() => {
    if (showModal) {
      setIsAnimating(true);
      // Fade in backdrop and slide up content
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

  // Update tempDate when value changes externally
  useEffect(() => {
    if (value) {
      setTempDate(value);
    }
  }, [value]);

  const handleOpen = useCallback(() => {
    setTempDate(value || new Date());
    if (Platform.OS === 'android') {
      setShowNativePicker(true);
    } else {
      setShowModal(true);
    }
  }, [value]);

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

  const handleConfirm = useCallback(() => {
    onChange(tempDate);
    handleClose();
  }, [tempDate, onChange, handleClose]);

  const handleClear = useCallback(() => {
    onChange(null);
    handleClose();
  }, [onChange, handleClose]);

  const handleNativeDateChange = useCallback(
    (_event: unknown, selectedDate?: Date) => {
      if (selectedDate) {
        onChange(selectedDate);
      }
      setShowNativePicker(false);
    },
    [onChange]
  );

  const getPlaceholderText = useCallback(() => {
    if (placeholder) return placeholder;
    return t('datePicker.placeholder');
  }, [placeholder, t]);

  const getLocale = useCallback(() => {
    return i18n.language === 'zh' ? 'zh-CN' : 'en-US';
  }, [i18n.language]);

  return (
    <>
      <DatePickerContainer>
        <DateText>{value ? formatDate(value, getLocale(), t) : getPlaceholderText()}</DateText>
        <DatePickerButton onPress={handleOpen} activeOpacity={0.7}>
          <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
        </DatePickerButton>
      </DatePickerContainer>

      {/* iOS Modal with confirm/cancel */}
      {Platform.OS === 'ios' && (
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
                      outputRange: [0, 500],
                    }),
                  },
                ],
              }}
            >
              <ModalHeader>
                <ModalTitle>{t('datePicker.selectDate')}</ModalTitle>
                <GlassButton onPress={handleClose} icon="close" />
              </ModalHeader>

              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={(_event, selectedDate) => {
                  if (selectedDate) {
                    setTempDate(selectedDate);
                  }
                }}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                style={{ width: '100%' }}
              />

              <ButtonContainer>
                <GlassButton
                  text={t('datePicker.clear')}
                  onPress={handleClear}
                  style={{ flex: 1 }}
                />
                <GlassButton
                  text={t('datePicker.confirm')}
                  icon="checkmark"
                  onPress={handleConfirm}
                  tintColor={theme.colors.primary}
                  textColor={theme.colors.surface}
                  style={{ flex: 1 }}
                />
              </ButtonContainer>
            </ModalContent>
          </ModalContainer>
        </Modal>
      )}

      {/* Android native picker */}
      {Platform.OS === 'android' && showNativePicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display="default"
          onChange={handleNativeDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </>
  );
};

