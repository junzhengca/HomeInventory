import React, { useState, useCallback, useMemo } from 'react';
import { TouchableOpacity, View, Text, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import type { StyledProps } from '../../utils/styledComponents';
import { useSync, useAuth } from '../../store/hooks';
import { BottomActionBar } from '../molecules';
import { getAllItems } from '../../services/InventoryService';
import { getAllTodos } from '../../services/TodoService';

const Header = styled(View)`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const HeaderLeft = styled(View)`
  flex: 1;
`;

const Title = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.xxl}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const Subtitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

const CloseButton = styled(TouchableOpacity)`
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  align-items: center;
  justify-content: center;
`;

const ContentContainer = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
`;

const LoadingContainer = styled(View)`
  align-items: center;
  justify-content: center;
  padding: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const LoadingText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const WarningSection = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryLightest};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.primary};
`;

const WarningHeader = styled(View)`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const WarningIconContainer = styled(View)`
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  background-color: ${({ theme }: StyledProps) => theme.colors.warning || theme.colors.primary};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
  flex-shrink: 0;
`;

const WarningTitle = styled(Text)`
  flex: 1;
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const WarningText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  line-height: ${({ theme }: StyledProps) => theme.typography.fontSize.sm * 1.4}px;
`;

const BenefitsSection = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryLightest};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const BenefitItem = styled(View)`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const BenefitItemLast = styled(View)`
  flex-direction: row;
  align-items: center;
  margin-bottom: 0px;
`;

const BenefitIconContainer = styled(View)`
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  background-color: ${({ theme }: StyledProps) => theme.colors.primary};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
  flex-shrink: 0;
`;

const BenefitText = styled(Text)`
  flex: 1;
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  line-height: ${({ theme }: StyledProps) => theme.typography.fontSize.sm * 1.4}px;
`;

export interface EnableSyncBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  onEnableSync?: () => void;
  onSkip?: () => void;
}

export const EnableSyncBottomSheet: React.FC<EnableSyncBottomSheetProps> = ({
  bottomSheetRef,
  onEnableSync,
  onSkip,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { enableSync } = useSync();
  const { getApiClient, activeHomeId, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingData, setIsCheckingData] = useState(true);
  const [hasLocalData, setHasLocalData] = useState(false);
  const [hasCloudData, setHasCloudData] = useState(false);

  const snapPoints = useMemo(() => ['100%'], []);

  const renderBackdrop = useCallback(
    (props: Parameters<typeof BottomSheetBackdrop>[0]) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
    // Reset state when modal closes
    setIsCheckingData(false);
    setHasLocalData(false);
    setHasCloudData(false);
  }, [bottomSheetRef]);

  // Check for local data and pull cloud data when modal is presented
  const checkData = useCallback(async () => {
    setIsCheckingData(true);

    try {
      // Check local data
      const localItems = await getAllItems();
      const localTodos = await getAllTodos();
      const hasLocal = localItems.length > 0 || localTodos.length > 0;
      setHasLocalData(hasLocal);

      // Pull cloud data directly from API to check if there's cloud data
      const apiClient = getApiClient();
      if (apiClient) {
        try {
          // Get device ID
          let deviceId = await import('expo-secure-store').then(Store => Store.getItemAsync('device_id'));
          if (!deviceId) deviceId = 'temp-check-device';

          const homeId = activeHomeId || user?.id;

          if (homeId) {
            const itemsRequest = {
              entityType: 'inventoryItems' as const,
              homeId,
              deviceId,
              checkpoint: { lastPulledVersion: 0 },
              includeDeleted: true
            };
            const itemsResponse = await apiClient.pullEntities(itemsRequest);

            const todosRequest = {
              entityType: 'todoItems' as const,
              homeId,
              deviceId,
              checkpoint: { lastPulledVersion: 0 },
              includeDeleted: true
            };
            const todosResponse = await apiClient.pullEntities(todosRequest);

            const hasCloudItems = itemsResponse.changes.some(change => change.changeType !== 'deleted');
            const hasCloudTodos = todosResponse.changes.some(change => change.changeType !== 'deleted');
            setHasCloudData(hasCloudItems || hasCloudTodos);
          } else {
            setHasCloudData(false);
          }
        } catch (error) {
          console.error('Error pulling cloud data:', error);
          setHasCloudData(false);
        }
      }
    } catch (error) {
      console.error('Error checking data:', error);
    } finally {
      setIsCheckingData(false);
    }
  }, [getApiClient, activeHomeId, user]);

  // Handle modal presentation - only check data when modal is actually shown
  const handleSheetChange = useCallback((index: number) => {
    // Index 0 means modal is presented, -1 means dismissed
    if (index === 0) {
      checkData();
    }
  }, [checkData]);

  const handleEnableSync = useCallback(async () => {
    setIsLoading(true);
    try {
      await enableSync();
      handleClose();
      if (onEnableSync) {
        onEnableSync();
      }
    } catch (error) {
      console.error('Error enabling sync:', error);
      // Error handling is done by the sync service
    } finally {
      setIsLoading(false);
    }
  }, [enableSync, handleClose, onEnableSync]);

  const handleSkip = useCallback(() => {
    handleClose();
    if (onSkip) {
      onSkip();
    }
  }, [handleClose, onSkip]);

  const renderFooter = useCallback(
    () => (
      <BottomActionBar
        actions={[
          {
            label: t('enableSync.buttons.skip'),
            onPress: handleSkip,
            variant: 'outlined',
            disabled: isLoading || isCheckingData,
          },
          {
            label: isLoading ? t('enableSync.buttons.enabling') : t('enableSync.buttons.enable'),
            onPress: handleEnableSync,
            variant: 'filled',
            icon: <Ionicons name="cloud-upload" size={18} color={theme.colors.surface} />,
            disabled: isLoading || isCheckingData,
          },
        ]}
        safeArea={true}
        inBottomSheet={true}
      />
    ),
    [handleEnableSync, handleSkip, isLoading, isCheckingData, theme, t]
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={false}
      onDismiss={handleClose}
      onChange={handleSheetChange}
      backdropComponent={renderBackdrop}
      android_keyboardInputMode="adjustResize"
      topInset={insets.top}
      enableDynamicSizing={false}
      footerComponent={renderFooter}
    >
      <ContentContainer>
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.lg }}
          showsVerticalScrollIndicator={false}
          enableOnPanDownToDismiss={false}
        >
          <Header>
            <HeaderLeft>
              <Title>{t('enableSync.title')}</Title>
              <Subtitle>{t('enableSync.subtitle')}</Subtitle>
            </HeaderLeft>
            <CloseButton onPress={handleClose}>
              <Ionicons name="close" size={20} color={theme.colors.text} />
            </CloseButton>
          </Header>

          {isCheckingData ? (
            <LoadingContainer>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <LoadingText>{t('enableSync.checkingData')}</LoadingText>
            </LoadingContainer>
          ) : (
            <>
              {hasLocalData && hasCloudData && (
                <WarningSection>
                  <WarningHeader>
                    <WarningIconContainer>
                      <Ionicons name="warning" size={20} color="white" />
                    </WarningIconContainer>
                    <WarningTitle>{t('enableSync.warning.title')}</WarningTitle>
                  </WarningHeader>
                  <WarningText>{t('enableSync.warning.message')}</WarningText>
                </WarningSection>
              )}

              <BenefitsSection>
                <BenefitItem>
                  <BenefitIconContainer>
                    <Ionicons name="cloud-upload" size={20} color="white" />
                  </BenefitIconContainer>
                  <BenefitText>{t('enableSync.benefits.sync')}</BenefitText>
                </BenefitItem>
                <BenefitItem>
                  <BenefitIconContainer>
                    <Ionicons name="phone-portrait" size={20} color="white" />
                  </BenefitIconContainer>
                  <BenefitText>{t('enableSync.benefits.devices')}</BenefitText>
                </BenefitItem>
                <BenefitItemLast>
                  <BenefitIconContainer>
                    <Ionicons name="shield-checkmark" size={20} color="white" />
                  </BenefitIconContainer>
                  <BenefitText>{t('enableSync.benefits.backup')}</BenefitText>
                </BenefitItemLast>
              </BenefitsSection>
            </>
          )}
        </BottomSheetScrollView>
      </ContentContainer>
    </BottomSheetModal>
  );
};
