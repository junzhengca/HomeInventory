import React from 'react';
import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';

interface LogoutButtonProps {
  onPress?: () => void;
}

const Button = styled(TouchableOpacity)`
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.md}px;
  padding: ${({ theme }) => theme.spacing.md}px;
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  elevation: 1;
  shadow-color: #000;
  shadow-offset: 0px 1px;
  shadow-opacity: 0.05;
  shadow-radius: 2px;
`;

const IconContainer = styled.View`
  width: 24px;
  height: 24px;
  margin-right: ${({ theme }) => theme.spacing.md}px;
  align-items: center;
  justify-content: center;
`;

const Icon = styled(Ionicons)`
  color: ${({ theme }) => theme.colors.error};
`;

const ButtonText = styled.Text`
  font-size: ${({ theme }) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.error};
  flex: 1;
`;

export const LogoutButton: React.FC<LogoutButtonProps> = ({ onPress }) => {
  return (
    <Button onPress={onPress}>
      <IconContainer>
        <Icon name="log-out-outline" size={20} />
      </IconContainer>
      <ButtonText>Log out</ButtonText>
    </Button>
  );
};

