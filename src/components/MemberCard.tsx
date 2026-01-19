import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import styled from 'styled-components/native';
import { Swipeable } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import type { StyledProps } from '../utils/styledComponents';
import { BaseCard } from './BaseCard';
import { Member } from '../types/api';

const CardWrapper = styled(View)`
  margin-bottom: 0;
`;

const CardContent = styled(View)`
  flex-direction: row;
  align-items: center;
  width: 100%;
`;

const AvatarContainer = styled(View)`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  overflow: hidden;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryLight};
  align-items: center;
  justify-content: center;
`;

const AvatarImage = styled(Image)`
  width: 100%;
  height: 100%;
`;

const AvatarPlaceholder = styled(View)`
  width: 100%;
  height: 100%;
  background-color: ${({ theme }: StyledProps) => theme.colors.primaryLight};
  align-items: center;
  justify-content: center;
`;

const InfoContainer = styled(View)`
  flex: 1;
`;

const NameRow = styled(View)`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const MemberName = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.bold};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const OwnerBadge = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

const SwipeActionsContainer = styled(View)`
  flex-direction: row;
  border-top-right-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  border-bottom-right-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  overflow: hidden;
  margin-left: ${({ theme }: StyledProps) => theme.spacing.xs}px;
`;

const ActionButton = styled(TouchableOpacity)`
  justify-content: center;
  align-items: center;
  width: 80px;
  align-self: stretch;
  position: relative;
`;

const DeleteAction = styled(ActionButton)`
  background-color: ${({ theme }: StyledProps) => theme.colors.error};
  border-top-left-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  border-bottom-left-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  border-top-right-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;
  border-bottom-right-radius: ${({ theme }: StyledProps) => theme.borderRadius.xxl}px;

  shadow-color: ${({ theme }: StyledProps) => theme.colors.error};
  shadow-offset: 0px 2px;
  shadow-opacity: 0.2;
  shadow-radius: 4px;
  elevation: 3;
`;

interface MemberCardProps {
  member: Member;
  isOwner?: boolean;
  onRemove?: (memberId: string) => void;
  swipeableRef?: React.RefObject<Swipeable>;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  isOwner = false,
  onRemove,
  swipeableRef,
}) => {
  const { t } = useTranslation();
  const displayName = member.nickname || member.email;

  const renderSwipeActions = () => {
    if (isOwner || !onRemove) {
      return null;
    }

    return (
      <SwipeActionsContainer>
        <DeleteAction
          onPress={() => {
            onRemove(member.id);
            swipeableRef?.current?.close();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="trash" size={22} color="white" />
        </DeleteAction>
      </SwipeActionsContainer>
    );
  };

  const cardContent = (
    <BaseCard>
      <CardContent>
        <AvatarContainer>
          {member.avatarUrl ? (
            <AvatarImage
              source={{ uri: member.avatarUrl }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <AvatarPlaceholder>
              <Ionicons name="person" size={24} color="white" />
            </AvatarPlaceholder>
          )}
        </AvatarContainer>
        <InfoContainer>
          <NameRow>
            <MemberName>{displayName}</MemberName>
            {isOwner && <OwnerBadge>{t('share.members.ownerBadge')}</OwnerBadge>}
          </NameRow>
        </InfoContainer>
      </CardContent>
    </BaseCard>
  );

  // If owner or no remove handler, return non-swipeable card
  if (isOwner || !onRemove) {
    return <CardWrapper>{cardContent}</CardWrapper>;
  }

  // Return swipeable card for members
  return (
    <CardWrapper>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderSwipeActions}
        rightThreshold={40}
        friction={2}
        enableTrackpadTwoFingerGesture
      >
        {cardContent}
      </Swipeable>
    </CardWrapper>
  );
};
