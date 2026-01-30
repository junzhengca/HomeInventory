import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import styled from 'styled-components/native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { ValidateInvitationResponse } from '../../types/api';
import { Button, BottomSheetHeader, HEADER_HEIGHT } from '../atoms';
import { useAppSelector, useAppDispatch, useSync } from '../../store/hooks';
import { useToast } from '../../hooks/useToast';
import type { StyledProps } from '../../utils/styledComponents';
import Ionicons from '@expo/vector-icons/Ionicons';
import { setActiveHomeId, setAccessibleAccounts } from '../../store/slices/authSlice';
import { loadItems } from '../../store/sagas/inventorySaga';
import { loadTodos } from '../../store/sagas/todoSaga';
import { loadSettings } from '../../store/sagas/settingsSaga';


const ErrorRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const ErrorText = styled(Text)`
  color: ${({ theme }: StyledProps) => theme.colors.error};
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const ContentContainer = styled(View)`
  flex: 1;
  border-top-left-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  border-top-right-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  overflow: hidden;
`;

// Styled components for the new layout
const AvatarContainer = styled(View)`
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  position: relative;
`;

const AvatarImage = styled.Image`
  width: 80px;
  height: 80px;
  border-radius: 40px;
  background-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
`;

const EnvelopeIcon = styled(View)`
  position: absolute;
  bottom: -4px;
  right: -4px;
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: 20px;
  padding: 4px;
  border-width: 2px;
  border-color: ${({ theme }: StyledProps) => theme.colors.surface};
`;

const Subtitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  text-align: center;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const InviteTitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  text-align: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const InviterEmail = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  text-align: center;
  margin-top: -${({ theme }: StyledProps) => theme.spacing.lg}px;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const ScopeSection = styled(View)`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xl}px;
`;

const ScopeTitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const ScopeRow = styled(View)`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const ScopeText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-left: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const LoadingContainer = styled(View)`
  padding: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  align-items: center;
  justify-content: center;
`;

interface InvitationBottomSheetProps {
    bottomSheetRef: React.RefObject<BottomSheetModal | null>;
    inviteCode: string | null;
    onDismiss?: () => void;
}

export const InvitationBottomSheet: React.FC<InvitationBottomSheetProps> = ({
    bottomSheetRef,
    inviteCode,
    onDismiss,
}) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const apiClient = useAppSelector((state) => state.auth.apiClient);
    const currentUser = useAppSelector((state) => state.auth.user);

    const dispatch = useAppDispatch();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [invitationData, setInvitationData] = useState<ValidateInvitationResponse | null>(null);

    // Use dynamic sizing or a calculated snap point
    const isOwnHome = useMemo(() => {
        if (!invitationData || !currentUser?.email) return false;
        return invitationData.accountEmail?.toLowerCase() === currentUser.email.toLowerCase();
    }, [invitationData, currentUser]);



    useEffect(() => {
        if (inviteCode && apiClient) {
            fetchInvitationDetails(inviteCode);
        }
    }, [inviteCode, apiClient]);

    const fetchInvitationDetails = async (code: string) => {
        if (!apiClient) return;

        setLoading(true);
        setError(null);
        setInvitationData(null);

        try {
            const data = await apiClient.validateInvitation(code);
            if (data.valid) {
                setInvitationData(data);
            } else {
                setError(data.message || 'Invalid invitation code');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to validate invitation');
            console.error('Validate invitation error:', err);
        } finally {
            setLoading(false);
        }
    };

    const { enabled: syncEnabled, enableSync } = useSync();

    const handleAccept = async () => {
        if (!apiClient || !inviteCode) return;

        if (!syncEnabled) {
            Alert.alert(
                t('share.invite.syncRequired.title'),
                t('share.invite.syncRequired.acceptMessage'),
                [
                    {
                        text: t('common.cancel'),
                        style: 'cancel',
                    },
                    {
                        text: t('common.confirmation'),
                        onPress: async () => {
                            enableSync();
                            await processAccept();
                        },
                    },
                ]
            );
            return;
        }

        await processAccept();
    };

    const processAccept = async () => {
        if (!apiClient || !inviteCode) return;
        setLoading(true);
        console.log('[Invitation] Accepting invite:', inviteCode);
        try {
            await apiClient.acceptInvitation(inviteCode);

            // Fetch updated accessible accounts
            const response = await apiClient.listAccessibleAccounts();
            console.log('[Invitation] Fetched accounts:', response.accounts.length);

            // Find the new account we just joined
            // We use the accountEmail from the invitation data to match
            const targetEmail = invitationData?.accountEmail?.toLowerCase();
            console.log('[Invitation] Target email:', targetEmail);

            const newAccount = response.accounts.find(
                acc => acc.email.toLowerCase() === targetEmail
            );
            console.log('[Invitation] Matched account:', newAccount?.userId);

            if (newAccount) {
                // Switch to the new home
                console.log('[Invitation] Switching to new home:', newAccount.userId);
                dispatch(setActiveHomeId(newAccount.userId));
                dispatch(setAccessibleAccounts(response.accounts));

                // Reload data for the new home context
                // We need to wait a brief moment for the state to update
                setTimeout(() => {
                    console.log('[Invitation] Reloading data for new context');
                    dispatch(loadItems());
                    dispatch(loadTodos());
                    dispatch(loadSettings());
                }, 100);

                showToast(t('share.invite.acceptSuccess'), 'success');
            } else {
                // Fallback if we can't find the account (shouldn't happen)
                console.warn('[Invitation] Could not find matched account for email:', targetEmail);
                dispatch(setAccessibleAccounts(response.accounts));
                showToast(t('share.invite.acceptSuccess'), 'success');
            }

            // Dismiss and clear state
            onDismiss?.();
            bottomSheetRef.current?.dismiss();

        } catch (err: any) {
            console.error('Accept invitation error:', err);
            showToast(err.message || t('share.invite.acceptError'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = useCallback(() => {
        bottomSheetRef.current?.dismiss();
        onDismiss?.();
    }, [bottomSheetRef, onDismiss]);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        []
    );

    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            enableDynamicSizing={true}
            enablePanDownToClose={true}
            backdropComponent={renderBackdrop}
            onDismiss={onDismiss}
            handleComponent={null}
            backgroundStyle={{
                backgroundColor: theme.colors.surface,
            }}
        >
            <ContentContainer>
                <BottomSheetView style={{ paddingBottom: insets.bottom + theme.spacing.xl }}>
                    <BottomSheetHeader
                        title=""
                        subtitle=""
                        onClose={handleClose}
                    />

                    <View style={{ paddingHorizontal: theme.spacing.lg }}>
                        {loading ? (
                            <LoadingContainer>
                                <ActivityIndicator size="large" color={theme.colors.primary} />
                            </LoadingContainer>
                        ) : error ? (
                            <>
                                <ErrorText>{error}</ErrorText>
                                <Button
                                    label={t('common.close')}
                                    onPress={handleClose}
                                    variant="secondary"
                                />
                            </>
                        ) : invitationData ? (
                            <View>
                                <View style={{ alignItems: 'center' }}>
                                    <AvatarContainer>
                                        {invitationData.avatarUrl ? (
                                            <AvatarImage
                                                source={{ uri: invitationData.avatarUrl }}
                                            />
                                        ) : (
                                            <View style={{
                                                width: 80, height: 80,
                                                backgroundColor: theme.colors.primaryLight, borderRadius: 40,
                                                alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <Text style={{ fontSize: 32, color: theme.colors.primary, fontWeight: 'bold' }}>
                                                    {(invitationData.nickname || invitationData.accountEmail || '?').charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                        <EnvelopeIcon>
                                            <Ionicons name="mail" size={16} color={theme.colors.text} />
                                        </EnvelopeIcon>
                                    </AvatarContainer>
                                </View>

                                <Subtitle>{t('share.invite.receivedSubtitle')}</Subtitle>
                                <InviteTitle>
                                    {t('share.invite.receivedTitle', { name: invitationData.nickname || invitationData.accountEmail })}
                                </InviteTitle>
                                {invitationData.nickname && invitationData.accountEmail && (
                                    <InviterEmail>({invitationData.accountEmail})</InviterEmail>
                                )}
                                {isOwnHome && (
                                    <ErrorRow>
                                        <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
                                        <ErrorText>{t('share.invite.errors.ownHome')}</ErrorText>
                                    </ErrorRow>
                                )}

                                <ScopeSection>
                                    <ScopeTitle>{t('share.invite.receivedScope')}</ScopeTitle>
                                    <ScopeRow>
                                        <Ionicons
                                            name={invitationData.permissions?.canShareInventory ? "checkmark-circle" : "lock-closed"}
                                            size={20}
                                            color={invitationData.permissions?.canShareInventory ? theme.colors.success : theme.colors.textSecondary}
                                        />
                                        <ScopeText>
                                            {t('share.invite.inventory')} ({invitationData.permissions?.canShareInventory ? t('share.invite.visibleToAll') : t('share.invite.private')})
                                        </ScopeText>
                                    </ScopeRow>
                                    <ScopeRow>
                                        <Ionicons
                                            name={invitationData.permissions?.canShareTodos ? "checkmark-circle" : "lock-closed"}
                                            size={20}
                                            color={invitationData.permissions?.canShareTodos ? theme.colors.success : theme.colors.textSecondary}
                                        />
                                        <ScopeText>
                                            {t('share.invite.shoppingList')} ({invitationData.permissions?.canShareTodos ? t('share.invite.visibleToAll') : t('share.invite.private')})
                                        </ScopeText>
                                    </ScopeRow>
                                </ScopeSection>

                                <Button
                                    label={t('share.invite.accept')}
                                    onPress={handleAccept}
                                    variant="primary"
                                    disabled={loading || isOwnHome}
                                />
                            </View>
                        ) : null}
                    </View>
                </BottomSheetView>
            </ContentContainer>
        </BottomSheetModal>
    );
};
