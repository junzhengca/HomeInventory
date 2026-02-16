import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import type { StyledProps, StyledPropsWith } from '../../utils/styledComponents';

export interface AddEntityButtonProps {
  onPress: () => void;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

const ButtonWrapper = styled(View)<{ fullWidth?: boolean }>`
  ${({ fullWidth }: { fullWidth?: boolean }) => (fullWidth ? 'width: 100%;' : 'flex: 1;')}
`;

const StyledButton = styled(TouchableOpacity).attrs({ activeOpacity: 0.7 })<{
  disabled?: boolean;
}>`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-width: 1px;
  border-style: dotted;
  border-color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.full}px;
  padding-horizontal: ${({ theme }: StyledProps) => theme.spacing.md}px;
  padding-vertical: 12px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  opacity: ${({ disabled }: { disabled?: boolean }) => (disabled ? 0.5 : 1)};
`;

const IconContainer = styled(View)`
  margin-right: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  align-items: center;
  justify-content: center;
`;

const StyledIcon = styled(Ionicons)<{ iconColor?: string }>`
  color: ${({ theme, iconColor }: StyledPropsWith<{ iconColor?: string }>) =>
    iconColor || theme.colors.textSecondary};
`;

const ButtonText = styled(Text)<{ disabled?: boolean }>`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

/**
 * AddEntityButton - A reusable button component for "add entity" actions
 * Features a dotted border, white background, and pill-shaped styling
 * Used for inviting members, adding items, and other entity creation actions
 */
export const AddEntityButton: React.FC<AddEntityButtonProps> = ({
  onPress,
  label,
  icon = 'person-add-outline',
  iconColor,
  fullWidth = true,
  disabled = false,
}) => {
  const theme = useTheme();

  return (
    <ButtonWrapper fullWidth={fullWidth}>
      <StyledButton onPress={onPress} disabled={disabled}>
        <IconContainer>
          <StyledIcon
            name={icon}
            size={18}
            iconColor={iconColor || theme.colors.textSecondary}
          />
        </IconContainer>
        <ButtonText disabled={disabled}>{label}</ButtonText>
      </StyledButton>
    </ButtonWrapper>
  );
};
