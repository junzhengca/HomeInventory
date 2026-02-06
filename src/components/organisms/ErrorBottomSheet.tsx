import React, { useState, useCallback, useMemo } from 'react';
import { TouchableOpacity, View, Text, Alert } from 'react-native';
import styled from 'styled-components/native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../theme/ThemeProvider';
import type { StyledProps } from '../../utils/styledComponents';
import { ErrorDetails } from '../../types/api';
import { BottomActionBar } from '../molecules';
import { uiLogger } from '../../utils/Logger';

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

const ErrorSection = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.errorLight || theme.colors.primaryLightest};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.error || theme.colors.primary};
`;

const ErrorHeader = styled(View)`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const ErrorIconContainer = styled(View)`
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  background-color: ${({ theme }: StyledProps) => theme.colors.error || theme.colors.primary};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
  flex-shrink: 0;
`;

const ErrorTitle = styled(Text)`
  flex: 1;
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const ErrorMessage = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  line-height: ${({ theme }: StyledProps) => theme.typography.fontSize.sm * 1.4}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const Section = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const SectionTitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const DetailContainer = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
`;

const DetailText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  font-family: monospace;
  line-height: ${({ theme }: StyledProps) => theme.typography.fontSize.sm * 1.5}px;
`;

const DetailLabel = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const DetailRow = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const DetailRowLast = styled(View)`
  margin-bottom: 0px;
`;

const RetryAttemptItem = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.xs}px;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.sm}px;
`;

const RetryAttemptText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.xs}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  font-family: monospace;
`;

export interface ErrorBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  errorDetails: ErrorDetails | null;
  onDismiss?: () => void;
}

export const ErrorBottomSheet: React.FC<ErrorBottomSheetProps> = ({
  bottomSheetRef,
  errorDetails,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);

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
    setCopied(false);
    if (onDismiss) {
      onDismiss();
    }
  }, [bottomSheetRef, onDismiss]);

  const formatErrorLog = useCallback((): string => {
    if (!errorDetails) {
      return '';
    }

    return JSON.stringify(errorDetails, null, 2);
  }, [errorDetails]);

  const handleCopyErrorLog = useCallback(async () => {
    if (!errorDetails) {
      return;
    }

    try {
      const errorLog = formatErrorLog();
      await Clipboard.setStringAsync(errorLog);
      setCopied(true);
      Alert.alert(
        t('errorBottomSheet.copied.title'),
        t('errorBottomSheet.copied.message')
      );
      // Reset copied state after 3 seconds
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      uiLogger.error('Error copying to clipboard', error);
      Alert.alert(
        t('errorBottomSheet.copyError.title'),
        t('errorBottomSheet.copyError.message')
      );
    }
  }, [errorDetails, formatErrorLog, t]);

  const renderFooter = useCallback(
    () => (
      <BottomActionBar
        actions={[
          {
            label: t('errorBottomSheet.buttons.close'),
            onPress: handleClose,
            variant: 'outlined',
          },
          {
            label: copied
              ? t('errorBottomSheet.buttons.copied')
              : t('errorBottomSheet.buttons.copy'),
            onPress: handleCopyErrorLog,
            variant: 'filled',
            icon: <Ionicons name="copy-outline" size={18} color={theme.colors.surface} />,
          },
        ]}
        safeArea={true}
        inBottomSheet={true}
      />
    ),
    [handleClose, handleCopyErrorLog, copied, theme, t]
  );

  if (!errorDetails) {
    return null;
  }

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={false}
      onDismiss={handleClose}
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
              <Title>{t('errorBottomSheet.title')}</Title>
              <Subtitle>{t('errorBottomSheet.subtitle')}</Subtitle>
            </HeaderLeft>
            <CloseButton onPress={handleClose}>
              <Ionicons name="close" size={20} color={theme.colors.text} />
            </CloseButton>
          </Header>

          <ErrorSection>
            <ErrorHeader>
              <ErrorIconContainer>
                <Ionicons name="alert-circle" size={20} color="white" />
              </ErrorIconContainer>
              <ErrorTitle>{t('errorBottomSheet.errorTitle')}</ErrorTitle>
            </ErrorHeader>
            <ErrorMessage>{errorDetails.errorMessage}</ErrorMessage>
            <DetailText>
              {t('errorBottomSheet.errorType')}: {errorDetails.errorType === 'network' ? t('errorBottomSheet.errorTypes.network') : t('errorBottomSheet.errorTypes.server')}
            </DetailText>
          </ErrorSection>

          <Section>
            <SectionTitle>{t('errorBottomSheet.sections.request')}</SectionTitle>
            <DetailContainer>
              <DetailRow>
                <DetailLabel>{t('errorBottomSheet.fields.endpoint')}</DetailLabel>
                <DetailText>{errorDetails.endpoint}</DetailText>
              </DetailRow>
              <DetailRow>
                <DetailLabel>{t('errorBottomSheet.fields.method')}</DetailLabel>
                <DetailText>{errorDetails.method}</DetailText>
              </DetailRow>
              {errorDetails.requestHeaders && (
                <DetailRow>
                  <DetailLabel>{t('errorBottomSheet.fields.headers')}</DetailLabel>
                  <DetailText>{JSON.stringify(errorDetails.requestHeaders, null, 2)}</DetailText>
                </DetailRow>
              )}
              {errorDetails.requestBody && (
                <DetailRowLast>
                  <DetailLabel>{t('errorBottomSheet.fields.body')}</DetailLabel>
                  <DetailText>{JSON.stringify(errorDetails.requestBody, null, 2)}</DetailText>
                </DetailRowLast>
              )}
            </DetailContainer>
          </Section>

          {(errorDetails.status != null || errorDetails.responseBody != null) && (
            <Section>
              <SectionTitle>{t('errorBottomSheet.sections.response')}</SectionTitle>
              <DetailContainer>
                {errorDetails.status && (
                  <DetailRow>
                    <DetailLabel>{t('errorBottomSheet.fields.status')}</DetailLabel>
                    <DetailText>
                      {errorDetails.status} {errorDetails.statusText || ''}
                    </DetailText>
                  </DetailRow>
                )}
                {errorDetails.responseBody && (
                  <DetailRowLast>
                    <DetailLabel>{t('errorBottomSheet.fields.responseBody')}</DetailLabel>
                    <DetailText>{JSON.stringify(errorDetails.responseBody, null, 2) as React.ReactNode}</DetailText>
                  </DetailRowLast>
                )}
              </DetailContainer>
            </Section>
          )}

          {errorDetails.retryAttempts.length > 0 && (
            <Section>
              <SectionTitle>{t('errorBottomSheet.sections.retryHistory')}</SectionTitle>
              <DetailContainer>
                {errorDetails.retryAttempts.map((attempt, index) => (
                  <RetryAttemptItem key={index}>
                    <RetryAttemptText>
                      {t('errorBottomSheet.retryAttempt', {
                        attempt: attempt.attempt,
                        delay: Math.round(attempt.delay),
                        timestamp: new Date(attempt.timestamp).toLocaleString(),
                      })}
                      {attempt.error && ` - ${attempt.error}`}
                    </RetryAttemptText>
                  </RetryAttemptItem>
                ))}
              </DetailContainer>
            </Section>
          )}

          <Section>
            <SectionTitle>{t('errorBottomSheet.sections.metadata')}</SectionTitle>
            <DetailContainer>
              <DetailRow>
                <DetailLabel>{t('errorBottomSheet.fields.timestamp')}</DetailLabel>
                <DetailText>{new Date(errorDetails.timestamp).toLocaleString()}</DetailText>
              </DetailRow>
              <DetailRowLast>
                <DetailLabel>{t('errorBottomSheet.fields.totalDuration')}</DetailLabel>
                <DetailText>{errorDetails.totalDuration}ms</DetailText>
              </DetailRowLast>
            </DetailContainer>
          </Section>
        </BottomSheetScrollView>
      </ContentContainer>
    </BottomSheetModal>
  );
};

