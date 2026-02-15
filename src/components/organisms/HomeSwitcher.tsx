import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, Modal, FlatList, TouchableWithoutFeedback, StyleSheet, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolate,
  Extrapolate,
  runOnJS,
  useAnimatedRef,
  measure,
  runOnUI
} from 'react-native-reanimated';
import { useHome } from '../../hooks/useHome';
import { StyledProps } from '../../utils/styledComponents';
import { useTheme } from '../../theme/ThemeProvider';
import { AddHomeBottomSheet } from './AddHomeBottomSheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuContainer: {
    position: 'absolute',
    width: 280,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
});

const Container = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
`;

const HomeNameString = styled(Text)`
  font-size: 22px;
  font-weight: bold;
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const IconWrapper = styled(View)`
  margin-left: 4px;
`;

const ContentWrapper = styled(View)`
  flex-direction: column;
`;

const ManagedLabel = styled(Text)`
  font-size: 12px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  letter-spacing: 0.5px;
  margin-bottom: 2px;
`;

const HeaderText = styled(Text)`
  font-size: 12px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-bottom: 8px;
`;

const HomeItem = styled(TouchableOpacity) <{ isSelected: boolean }>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-vertical: 12px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }: StyledProps) => theme.colors.border};
`;

const HomeItemInfo = styled(View)`
  flex: 1;
`;

const HomeItemName = styled(Text)`
  font-size: 16px;
  font-weight: bold;
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const HomeItemAddress = styled(Text)`
  font-size: 12px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-top: 2px;
`;

const AddButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  margin-top: 16px;
`;

const AddIconContainer = styled(View)`
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.primary};
  border-style: dashed;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
`;

const AddButtonText = styled(Text)`
  color: ${({ theme }: StyledProps) => theme.colors.primary};
  font-weight: bold;
  font-size: 14px;
`;

export const HomeSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const { currentHome, homes, switchHome, loadingState } = useHome();
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const addHomeSheetRef = useRef<BottomSheetModal>(null);

  // Animation related
  const triggerRef = useAnimatedRef<View>();
  const [menuLayout, setMenuLayout] = useState<{ x: number, y: number, width: number, height: number, pageX: number, pageY: number } | null>(null);
  const animation = useSharedValue(0);

  const SPRING_CONFIG = {
    damping: 25,
    stiffness: 300,
    mass: 0.8,
  };

  useEffect(() => {
    if (modalVisible) {
      animation.value = withSpring(1, SPRING_CONFIG);
    } else {
      animation.value = withSpring(0, SPRING_CONFIG);
    }
  }, [modalVisible]);

  const handleOpenStart = () => {
    runOnUI(() => {
      const measured = measure(triggerRef);
      if (measured) {
        runOnJS(setMenuLayout)({
          x: measured.x,
          y: measured.y,
          width: measured.width,
          height: measured.height,
          pageX: measured.pageX,
          pageY: measured.pageY,
        });
        runOnJS(setModalVisible)(true);
      }
    })();
  };

  const handleClose = () => {
    setModalVisible(false);
  };

  const handleSwitch = (id: string) => {
    switchHome(id);
    handleClose();
  };

  const handleOpenAdd = () => {
    handleClose();
    // Small delay to allow modal to close first
    setTimeout(() => {
      addHomeSheetRef.current?.present();
    }, 300);
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: animation.value * 0.5,
  }));

  const menuStyle = useAnimatedStyle(() => {
    if (!menuLayout) return { opacity: 0 };

    const scale = interpolate(animation.value, [0, 1], [0.8, 1], Extrapolate.CLAMP);
    const opacity = animation.value;

    // Position logic
    let top = menuLayout.pageY + menuLayout.height + 10;
    // Always align to left of screen with padding
    const left = 20;

    // Ensure it doesn't go off top on open
    if (top < 0) top = 10;

    return {
      top,
      left,
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <Container onPress={handleOpenStart} activeOpacity={0.7}>
          <ContentWrapper>
            <ManagedLabel>{t('home.switcher.currentlyManaging')}</ManagedLabel>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <HomeNameString>{currentHome?.name || t('home.switcher.defaultName')}</HomeNameString>
              <IconWrapper>
                <Ionicons name="chevron-down" size={20} color={theme.colors.text} />
              </IconWrapper>
            </View>
          </ContentWrapper>
        </Container>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={handleClose}
      >
        <View style={StyleSheet.absoluteFill}>
          <TouchableWithoutFeedback onPress={handleClose}>
            <Animated.View style={[styles.backdrop, backdropStyle, { backgroundColor: '#000' }]} />
          </TouchableWithoutFeedback>

          {menuLayout && (
            <Animated.View style={[
              styles.menuContainer,
              menuStyle,
              { backgroundColor: theme.colors.surface }
            ]}>
              <TouchableWithoutFeedback>
                <View>
                  <HeaderText>{t('home.switcher.title')}</HeaderText>
                  {loadingState.isLoading && loadingState.operation === 'list' ? (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    </View>
                  ) : (
                    <FlatList
                      data={homes}
                      keyExtractor={item => item.id}
                      scrollEnabled={false}
                      renderItem={({ item }) => (
                        <HomeItem
                          isSelected={item.id === currentHome?.id}
                          onPress={() => handleSwitch(item.id)}
                        >
                          <HomeItemInfo>
                            <HomeItemName>
                              {item.name}
                            </HomeItemName>
                            <HomeItemAddress>{item.address || t('home.switcher.noAddress')}</HomeItemAddress>
                          </HomeItemInfo>
                          {item.id === currentHome?.id && (
                            <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                          )}
                        </HomeItem>
                      )}
                    />
                  )}
                  <AddButton onPress={handleOpenAdd}>
                    <AddIconContainer>
                      <Ionicons name="add" size={20} color={theme.colors.primary} />
                    </AddIconContainer>
                    <AddButtonText>{t('home.switcher.addProperty')}</AddButtonText>
                  </AddButton>
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>
          )}
        </View>
      </Modal>

      <AddHomeBottomSheet bottomSheetRef={addHomeSheetRef} />
    </>
  );
};
