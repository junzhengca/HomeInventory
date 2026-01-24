import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '../theme/ThemeProvider';
import type { StyledProps } from '../utils/styledComponents';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

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

const VerticalDivider = styled(View)`
  width: 1px;
  height: 32px;
  background-color: ${({ theme }: StyledProps) => theme.colors.border};
  margin: 0 ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

export const BottomNavBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

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

  return (
    <NavBarContainer bottomInset={insets.bottom}>
      <NavBar>
        <TabButtonsContainer>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const routeName = route.name as keyof TabParamList;

            let iconName: string = 'home-outline';
            let IconComponent: typeof Ionicons | typeof MaterialCommunityIcons = Ionicons;

            if (routeName === 'NotesTab') {
              iconName = 'notebook-edit-outline';
              IconComponent = MaterialCommunityIcons;
            } else if (routeName === 'ShareTab') {
              iconName = 'share-outline';
            } else if (routeName === 'SettingsTab') {
              iconName = 'settings-outline';
            }

            return (
              <React.Fragment key={route.key}>
                <TabButton
                  isActive={isFocused}
                  onPress={() => handleTabPress(routeName, isFocused)}
                >
                  <IconComponent
                    name={iconName}
                    size={24}
                    color={isFocused ? theme.colors.text : theme.colors.textLight}
                  />
                </TabButton>
                {index === 1 && <VerticalDivider />}
              </React.Fragment>
            );
          })}
        </TabButtonsContainer>
      </NavBar>
    </NavBarContainer>
  );
};

