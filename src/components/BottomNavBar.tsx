import React, { useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '../theme/ThemeProvider';
import type { StyledProps } from '../utils/styledComponents';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { CreateItemBottomSheet } from './CreateItemBottomSheet';
import { useInventory } from '../contexts/InventoryContext';

const NavBarContainer = styled(View)<{ bottomInset: number }>`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: transparent;
  padding-bottom: ${({ bottomInset }: { bottomInset: number }) => bottomInset + 16}px;
  align-items: center;
  justify-content: center;
  pointer-events: box-none;
`;

const NavBar = styled(View)`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  margin: 0 ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.1;
  shadow-radius: 12px;
  elevation: 8;
  border-width: 1px;
  border-color: rgba(0, 0, 0, 0.05);
`;

const TabButtonsContainer = styled(View)`
  flex-direction: row;
  align-items: center;
  padding-left: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const TabButton = styled(TouchableOpacity)<{ isActive: boolean }>`
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const Separator = styled(View)`
  width: 1px;
  height: 24px;
  background-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  margin: 0 ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const ActionButtonsContainer = styled(View)`
  flex-direction: row;
  align-items: center;
  padding-right: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const ActionButton = styled(TouchableOpacity)`
  width: 56px;
  height: 56px;
  border-radius: 28px;
  align-items: center;
  justify-content: center;
`;

const AddButton = styled(ActionButton)`
  background-color: ${({ theme }: StyledProps) => theme.colors.primary};
`;

const AIButton = styled(ActionButton)`
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryLightest};
  width: 48px;
  height: 48px;
  border-radius: 24px;
`;

const NotificationBadge = styled(View)`
  position: absolute;
  top: 0px;
  right: 0px;
  width: 12px;
  height: 12px;
  border-radius: 6px;
  background-color: ${({ theme }: StyledProps) => theme.colors.notification};
  border-width: 2px;
  border-color: ${({ theme }: StyledProps) => theme.colors.surface};
`;

export const BottomNavBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const { refreshItems } = useInventory();

  const handleTabPress = (routeName: keyof TabParamList, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeName,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const handleAddPress = () => {
    bottomSheetRef.current?.present();
  };

  const handleAIPress = () => {
    console.log('AI button pressed');
  };

  return (
    <>
      <NavBarContainer bottomInset={insets.bottom}>
        <NavBar>
          <TabButtonsContainer>
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;
              const routeName = route.name as keyof TabParamList;

              let iconName: string = 'home-outline';
              let IconComponent: typeof Ionicons | typeof MaterialCommunityIcons = Ionicons;

              if (routeName === 'InventoryTab') {
                iconName = 'list-outline';
                IconComponent = Ionicons;
              } else if (routeName === 'NotesTab') {
                iconName = 'notebook-edit-outline';
                IconComponent = MaterialCommunityIcons;
              }

              return (
                <TabButton
                  key={route.key}
                  isActive={isFocused}
                  onPress={() => handleTabPress(routeName, isFocused)}
                >
                  <IconComponent
                    name={iconName}
                    size={24}
                    color={isFocused ? theme.colors.text : theme.colors.textLight}
                  />
                </TabButton>
              );
            })}
          </TabButtonsContainer>

          <Separator />

          <ActionButtonsContainer>
            <AddButton onPress={handleAddPress}>
              <Ionicons name="add" size={32} color={theme.colors.surface} />
            </AddButton>

            <AIButton onPress={handleAIPress}>
              <MaterialCommunityIcons name="auto-fix" size={24} color={theme.colors.primary} />
              <NotificationBadge />
            </AIButton>
          </ActionButtonsContainer>
        </NavBar>
      </NavBarContainer>
      <CreateItemBottomSheet 
        bottomSheetRef={bottomSheetRef} 
        onItemCreated={refreshItems}
        activeTab={state.routes[state.index]?.name as keyof TabParamList}
      />
    </>
  );
};

