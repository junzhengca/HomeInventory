import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import styled from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import type { StyledProps } from '../utils/styledComponents';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from '../hooks/useToast';

const Container = styled(View)`
  align-items: center;
  padding: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const QRCodeContainer = styled(View)`
  background-color: white;
  padding: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.lg}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  align-items: center;
  justify-content: center;
`;

const CodeText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
  text-align: center;
  font-family: monospace;
`;

const CopyButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: StyledProps) => theme.colors.primary};
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.lg}px;
  padding-vertical: ${({ theme }: StyledProps) => theme.spacing.md}px;
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
`;

const CopyButtonText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: white;
  margin-left: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

interface QRCodeDisplayProps {
  invitationCode: string;
  invitationLink: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  invitationCode,
  invitationLink,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(invitationLink);
      setCopied(true);
      showToast(t('share.invite.qrCode.copied'), 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      showToast(t('share.invite.qrCode.copyError'), 'error');
    }
  }, [invitationLink, showToast, t]);

  return (
    <Container>
      <QRCodeContainer>
        <QRCode
          value={invitationLink}
          size={200}
          color={theme.colors.text}
          backgroundColor="white"
        />
      </QRCodeContainer>
      <CodeText>{invitationCode}</CodeText>
      <CopyButton onPress={handleCopy} activeOpacity={0.8}>
        <Ionicons
          name={copied ? 'checkmark' : 'copy-outline'}
          size={20}
          color="white"
        />
        <CopyButtonText>
          {copied ? t('share.invite.qrCode.copied') : t('share.invite.qrCode.copy')}
        </CopyButtonText>
      </CopyButton>
    </Container>
  );
};
