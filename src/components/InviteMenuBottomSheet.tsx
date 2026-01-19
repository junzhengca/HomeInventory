import React, { useCallback, useMemo } from 'react';
import { View, TouchableOpacity, Share } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import styled from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import type { StyledProps } from '../utils/styledComponents';
import { useTheme } from '../theme/ThemeProvider';
import { BottomSheetHeader } from './ui/BottomSheetHeader';
import { QRCodeDisplay } from './QRCodeDisplay';

const ContentContainer = styled(View)`
  flex: 1;
`;

const OptionContainer = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  padding: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.xl}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const IconContainer = styled(View)`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryLight};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const OptionTextContainer = styled(View)`
  flex: 1;
`;

const OptionTitle = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const OptionDescription = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

const QRCodeViewContainer = styled(View)`
  padding: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

interface InviteMenuBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal>;
  invitationCode: string;
  invitationLink: string;
  onQRCodeShown?: () => void;
}

export const InviteMenuBottomSheet: React.FC<InviteMenuBottomSheetProps> = ({
  bottomSheetRef,
  invitationCode,
  invitationLink,
  onQRCodeShown,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [showQRCode, setShowQRCode] = React.useState(false);

  const snapPoints = useMemo(() => {
    if (showQRCode) {
      return ['75%'];
    }
    return ['40%'];
  }, [showQRCode]);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
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
    setShowQRCode(false);
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef]);

  const handleShowQRCode = useCallback(() => {
    if (!invitationCode || !invitationLink) {
      return;
    }
    setShowQRCode(true);
    onQRCodeShown?.();
  }, [invitationCode, invitationLink, onQRCodeShown]);

  const handleShareLink = useCallback(async () => {
    if (!invitationCode || !invitationLink) {
      return;
    }
    try {
      const result = await Share.share({
        message: invitationLink,
        title: t('share.invite.shareTitle'),
      });

      if (result.action === Share.sharedAction) {
        handleClose();
      }
    } catch (error) {
      console.error('Error sharing invitation link:', error);
    }
  }, [invitationCode, invitationLink, handleClose, t]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      enableContentPanningGesture={false}
      enableHandlePanningGesture={false}
      topInset={insets.top}
      index={0}
      enableDynamicSizing={false}
    >
      <ContentContainer>
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: theme.spacing.lg,
            paddingBottom: theme.spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          {!showQRCode ? (
            <>
              <BottomSheetHeader
                title={t('share.invite.title')}
                subtitle={t('share.invite.subtitle')}
                onClose={handleClose}
              />

              <OptionContainer onPress={handleShowQRCode} activeOpacity={0.8}>
                <IconContainer>
                  <Ionicons name="qr-code-outline" size={24} color={theme.colors.primary} />
                </IconContainer>
                <OptionTextContainer>
                  <OptionTitle>{t('share.invite.showQRCode')}</OptionTitle>
                  <OptionDescription>{t('share.invite.showQRCodeDescription')}</OptionDescription>
                </OptionTextContainer>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </OptionContainer>

              <OptionContainer onPress={handleShareLink} activeOpacity={0.8}>
                <IconContainer>
                  <Ionicons name="share-outline" size={24} color={theme.colors.primary} />
                </IconContainer>
                <OptionTextContainer>
                  <OptionTitle>{t('share.invite.shareLink')}</OptionTitle>
                  <OptionDescription>{t('share.invite.shareLinkDescription')}</OptionDescription>
                </OptionTextContainer>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </OptionContainer>
            </>
          ) : (
            <>
              <BottomSheetHeader
                title={t('share.invite.qrCode.title')}
                subtitle={t('share.invite.qrCode.subtitle')}
                onClose={handleClose}
              />
              <QRCodeViewContainer>
                <QRCodeDisplay invitationCode={invitationCode} invitationLink={invitationLink} />
              </QRCodeViewContainer>
            </>
          )}
        </BottomSheetScrollView>
      </ContentContainer>
    </BottomSheetModal>
  );
};
