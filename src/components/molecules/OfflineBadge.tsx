import React, { useMemo } from 'react';
import { TouchableOpacity, Platform, StatusBar } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetwork } from '../../hooks/useNetwork';
import { StyledProps } from '../../utils/styledComponents';

const BadgeContainer = styled(TouchableOpacity) <{ safeTop: number }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background-color: ${({ theme }: StyledProps) => theme.colors.error};
  padding: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  padding-top: ${({ safeTop }: { safeTop: number }) => safeTop + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0)}px;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  elevation: 5;
`;

const BadgeText = styled.Text`
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 600;
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

interface OfflineBadgeProps {
    onPress: () => void;
}

export const OfflineBadge: React.FC<OfflineBadgeProps> = ({ onPress }) => {
    const { isConnected, isInternetReachable } = useNetwork();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    const isOffline = useMemo(() => {
        // Treat as offline if explicitly disconnected or not reachable
        // Note: isInternetReachable can be null initially, we might want to check for explicitly false
        return isConnected === false || isInternetReachable === false;
    }, [isConnected, isInternetReachable]);

    if (!isOffline) {
        return null;
    }

    return (
        <BadgeContainer safeTop={insets.top} onPress={onPress} activeOpacity={0.9}>
            <MaterialCommunityIcons name="cloud-off-outline" size={16} color="#FFFFFF" />
            <BadgeText>{t('offline.badge', 'You are offline')}</BadgeText>
        </BadgeContainer>
    );
};
