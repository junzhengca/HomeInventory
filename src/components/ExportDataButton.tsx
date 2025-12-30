import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StyledProps } from '../utils/styledComponents';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ExportDataButtonProps {
  onPress?: () => void;
}

const Button = styled(TouchableOpacity)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.border};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
  elevation: 1;
  shadow-color: #000;
  shadow-offset: 0px 1px;
  shadow-opacity: 0.05;
  shadow-radius: 2px;
`;

const IconContainer = styled(View)`
  width: 24px;
  height: 24px;
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
  align-items: center;
  justify-content: center;
`;

const Icon = styled(Ionicons)`
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

const ButtonText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  flex: 1;
`;

export const ExportDataButton: React.FC<ExportDataButtonProps> = ({
  onPress,
}) => {
  const navigation = useNavigation<NavigationProp>();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('ExportData');
    }
  };

  return (
    <Button onPress={handlePress}>
      <IconContainer>
        <Icon name="download-outline" size={20} />
      </IconContainer>
      <ButtonText>Export data (JSON)</ButtonText>
    </Button>
  );
};

