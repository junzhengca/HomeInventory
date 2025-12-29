import React from 'react';
import { ScrollView } from 'react-native';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PageHeader } from '../components/PageHeader';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Content = styled(ScrollView)`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.lg}px;
`;

export const NotesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  // Calculate bottom padding: nav bar height (60) + margin (16*2) + safe area + extra spacing
  const bottomPadding = 60 + 32 + insets.bottom + 24;

  return (
    <Container>
      <PageHeader
        icon="document-text"
        title="Notes"
        subtitle="Your notes and reminders"
        onSettingsPress={handleSettingsPress}
      />
      <Content 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        {/* Screen content goes here */}
      </Content>
    </Container>
  );
};

