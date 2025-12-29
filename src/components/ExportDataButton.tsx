import React from 'react';
import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';

interface ExportDataButtonProps {
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
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
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
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const ButtonText = styled.Text`
  font-size: ${({ theme }) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text};
  flex: 1;
`;

export const ExportDataButton: React.FC<ExportDataButtonProps> = ({
  onPress,
}) => {
  return (
    <Button onPress={onPress}>
      <IconContainer>
        <Icon name="download-outline" size={20} />
      </IconContainer>
      <ButtonText>Export asset report (CSV)</ButtonText>
    </Button>
  );
};

