import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabParamList } from './types';
import { HomeStack } from './HomeStack';
import { InventoryStack } from './InventoryStack';
import { NotesStack } from './NotesStack';
import { BottomNavBar } from '../components/BottomNavBar';

const Tab = createBottomTabNavigator<TabParamList>();

export const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNavBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} />
      <Tab.Screen name="InventoryTab" component={InventoryStack} />
      <Tab.Screen name="NotesTab" component={NotesStack} />
    </Tab.Navigator>
  );
};

