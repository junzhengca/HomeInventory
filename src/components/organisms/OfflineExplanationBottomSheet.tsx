import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import styled, { useTheme } from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../atoms/Button';
import { Text as RNText } from 'react-native';

// Styled components
const Container = styled(BottomSheetView)`
  flex: 1;
  padding: ${({ theme }: { theme: any }) => theme.spacing.xl}px;
  align-items: center;
`;

const IconContainer = styled.View`
  width: 80px;
  height: 80px;
  border-radius: 40px;
  background-color: ${({ theme }: { theme: any }) => theme.colors.surfaceVariant};
  justify-content: center;
  align-items: center;
  margin-bottom: ${({ theme }: { theme: any }) => theme.spacing.lg}px;
`;

const ContentContainer = styled.View`
  width: 100%;
  align-items: center;
  margin-bottom: ${({ theme }: { theme: any }) => theme.spacing.xxl}px;
`;

const Title = styled(RNText)`
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  margin-bottom: ${({ theme }: { theme: any }) => theme.spacing.md}px;
  color: ${({ theme }: { theme: any }) => theme.colors.text};
`;

const Description = styled(RNText)`
  font-size: 16px;
  text-align: center;
  color: ${({ theme }: { theme: any }) => theme.colors.textSecondary};
  line-height: 24px;
`;

interface OfflineExplanationBottomSheetProps {
    bottomSheetRef: React.RefObject<BottomSheetModal | null>;
    onDismiss?: () => void;
}

export const OfflineExplanationBottomSheet = forwardRef<BottomSheetModal, OfflineExplanationBottomSheetProps>(
    ({ bottomSheetRef, onDismiss }, ref) => {
        const theme = useTheme();
        const { t } = useTranslation();
        const snapPoints = useMemo(() => ['45%'], []);

        const handleClose = () => {
            bottomSheetRef.current?.dismiss();
            onDismiss?.();
        };

        return (
            <BottomSheetModal
                ref={bottomSheetRef}
                snapPoints={snapPoints}
                enablePanDownToClose
                backgroundStyle={{ backgroundColor: theme.colors.surface }}
                handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
            >
                <Container>
                    <IconContainer>
                        <MaterialCommunityIcons
                            name="cloud-off-outline"
                            size={40}
                            color={theme.colors.error}
                        />
                    </IconContainer>

                    <ContentContainer>
                        <Title>{t('offline.title', 'You are Offline')}</Title>
                        <Description>
                            {t('offline.description', 'Changes you make will be saved locally on your device and automatically synced when you are back online.')}
                        </Description>
                    </ContentContainer>

                    <Button
                        onPress={handleClose}
                        variant="primary"
                        label={t('common.gotIt', 'Got it')}
                        fullWidth
                    />
                </Container>
            </BottomSheetModal>
        );
    }
);
