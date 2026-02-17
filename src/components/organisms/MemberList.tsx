import React, { useRef, useCallback } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import styled from 'styled-components/native';
import { useTranslation } from 'react-i18next';
import type { StyledProps } from '../../utils/styledComponents';
import { useTheme } from '../../theme/ThemeProvider';
import { MemberCard } from '../molecules';
import { EmptyState, AddEntityButton, SectionTitle } from '../atoms';
import { Member } from '../../types/api';

interface OwnerInfo {
  userId: string;
  email: string;
  nickname?: string;
  avatarUrl?: string;
  createdAt?: string;
}

const Container = styled(View)`
  flex: 1;
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

const InviteButtonWrapper = styled(View)`
  margin-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
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
      const member = members.find((m) => m.userId === memberId);
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
      <SectionTitle title={t('share.members.title')} icon="people-outline" />

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
                userId: owner.userId,
                email: owner.email,
                nickname: owner.nickname,
                avatarUrl: owner.avatarUrl,
                joinedAt: owner.createdAt || '',
                isOwner: true,
              }}
              isOwner={true}
              noMarginBottom={members.length === 0}
            />
          )}

          {/* Members List */}
          {members.map((member, index) => (
            <MemberCard
              key={member.userId}
              member={member}
              isOwner={false}
              onRemove={onRemoveMember ? handleRemoveMember : undefined}
              swipeableRef={getSwipeableRef(member.userId)}
              noMarginBottom={index === members.length - 1}
            />
          ))}

          {/* Invite Button */}
          {showInviteButton && (
            <InviteButtonWrapper>
              <AddEntityButton
                onPress={onInvitePress}
                label={t('share.members.invite')}
              />
            </InviteButtonWrapper>
          )}
        </>
      )}
    </Container>
  );
};
