import React, { useRef, useCallback } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import styled from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import type { StyledProps } from '../../utils/styledComponents';
import { useTheme } from '../../theme/ThemeProvider';
import { MemberCard } from '../molecules';
import { BaseCard, EmptyState } from '../atoms';
import { Member } from '../../types/api';

interface OwnerInfo {
  id: string;
  email: string;
  nickname?: string;
  avatarUrl?: string;
  createdAt?: string;
}

const Container = styled(View)`
  flex: 1;
`;

const SectionTitle = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.lg}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const LoadingContainer = styled(View)`
  padding: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  align-items: center;
  justify-content: center;
  min-height: 200px;
`;

const ErrorContainer = styled(View)`
  padding: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  align-items: center;
  justify-content: center;
  min-height: 200px;
`;

const ErrorText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.error || '#ff4444'};
  text-align: center;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const InviteCard = styled(BaseCard)`
  margin-top: 0;
`;

const InviteCardContent = styled(View)`
  flex-direction: row;
  align-items: center;
  width: 100%;
`;

const InviteIconContainer = styled(View)`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryExtraLight};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const InviteIcon = styled(Ionicons)`
  color: ${({ theme }: StyledProps) => theme.colors.primary};
`;

const InviteText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  flex: 1;
`;

export interface MemberListProps {
  owner: OwnerInfo | null;
  members: Member[];
  isLoading?: boolean;
  error?: string | null;
  onRemoveMember?: (memberId: string) => void;
  onInvitePress: () => void;
  showInviteButton?: boolean;
}

export const MemberList: React.FC<MemberListProps> = ({
  owner,
  members,
  isLoading = false,
  error = null,
  onRemoveMember,
  onInvitePress,
  showInviteButton = true,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const swipeableRefs = useRef<Map<string, React.RefObject<Swipeable | null>>>(new Map());

  const handleRemoveMember = useCallback(
    (memberId: string) => {
      const member = members.find((m) => m.id === memberId);
      const memberName = member?.nickname || member?.email || t('share.members.unknownMember');

      Alert.alert(
        t('share.members.removeConfirm.title'),
        t('share.members.removeConfirm.message', { name: memberName }),
        [
          {
            text: t('share.members.removeConfirm.cancel'),
            style: 'cancel',
          },
          {
            text: t('share.members.removeConfirm.confirm'),
            style: 'destructive',
            onPress: () => {
              onRemoveMember?.(memberId);
            },
          },
        ]
      );
    },
    [members, onRemoveMember, t]
  );

  const getSwipeableRef = useCallback((memberId: string) => {
    if (!swipeableRefs.current.has(memberId)) {
      swipeableRefs.current.set(memberId, React.createRef<Swipeable | null>());
    }
    return swipeableRefs.current.get(memberId)!;
  }, []);

  if (isLoading) {
    return (
      <Container>
        <LoadingContainer>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </LoadingContainer>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorContainer>
          <ErrorText>{error}</ErrorText>
        </ErrorContainer>
      </Container>
    );
  }

  const hasMembers = members.length > 0;
  const showEmptyState = !owner && !hasMembers;

  return (
    <Container>
      <SectionTitle>{t('share.members.title')}</SectionTitle>

      {showEmptyState ? (
        <EmptyState
          icon="people-outline"
          title={t('share.members.empty.title')}
          description={t('share.members.empty.description')}
        />
      ) : (
        <>
          {/* Owner Card */}
          {owner && (
            <MemberCard
              member={{
                id: owner.id,
                email: owner.email,
                nickname: owner.nickname,
                avatarUrl: owner.avatarUrl,
                joinedAt: owner.createdAt || '',
                isOwner: true,
              }}
              isOwner={true}
            />
          )}

          {/* Members List */}
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              isOwner={false}
              onRemove={onRemoveMember ? handleRemoveMember : undefined}
              swipeableRef={getSwipeableRef(member.id)}
            />
          ))}

          {/* Invite Card */}
          {showInviteButton && (
            <InviteCard onPress={onInvitePress} activeOpacity={0.8}>
              <InviteCardContent>
                <InviteIconContainer>
                  <InviteIcon name="person-add-outline" size={24} />
                </InviteIconContainer>
                <InviteText>{t('share.members.invite')}</InviteText>
              </InviteCardContent>
            </InviteCard>
          )}
        </>
      )}
    </Container>
  );
};
