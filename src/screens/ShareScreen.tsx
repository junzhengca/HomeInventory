import React from 'react';
import { View } from 'react-native';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { StyledProps } from '../utils/styledComponents';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { calculateBottomPadding } from '../utils/layout';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../store/hooks';

const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const Content = styled(View)`
  flex: 1;
`;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ShareScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const handleAvatarPress = () => {
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('Profile');
    }
  };

  return (
    <Container>
      <PageHeader
        icon="share-outline"
        title={t('share.title')}
        subtitle={t('share.subtitle')}
        showBackButton={false}
        showRightButtons={true}
        avatarUrl={user?.avatarUrl}
        onAvatarPress={handleAvatarPress}
      />
      <Content style={{ paddingBottom: calculateBottomPadding(insets.bottom) }}>
        <EmptyState
          icon="share-social-outline"
          title={t('share.comingSoon.title')}
          description={t('share.comingSoon.description')}
        />
      </Content>
    </Container>
  );
};
