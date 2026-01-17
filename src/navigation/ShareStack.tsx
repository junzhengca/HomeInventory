import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ShareStackParamList } from './types';
import { ShareScreen } from '../screens/ShareScreen';

const Stack = createNativeStackNavigator<ShareStackParamList>();

export const ShareStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Share" component={ShareScreen} />
    </Stack.Navigator>
  );
};
