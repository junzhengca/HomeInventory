import React from 'react';
import { TouchableOpacity, View, Text, Alert } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { dataInitializationService } from '../../services/DataInitializationService';
import { useInventory, useCategory, useTodos, useSettings } from '../../store/hooks';
import type { StyledProps } from '../../utils/styledComponents';

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

export interface ClearDataButtonProps {
  onPress?: () => void;
}

export const ClearDataButton: React.FC<ClearDataButtonProps> = ({
  onPress,
}) => {
  const { t } = useTranslation();
  const { loadItems } = useInventory();
  const { refreshCategories } = useCategory();
  const { refreshTodos } = useTodos();
  const { updateSettings: refreshSettings } = useSettings();

  const handlePress = () => {
    Alert.alert(
      t('settings.clearData.confirm.title'),
      t('settings.clearData.confirm.message'),
      [
        {
          text: t('settings.clearData.confirm.cancel'),
          style: 'cancel',
        },
        {
          text: t('settings.clearData.confirm.confirm'),
          style: 'destructive',
          onPress: async () => {
            const success = await dataInitializationService.clearAllDataFiles();
            
            if (success) {
              // Refresh all contexts
              loadItems();
              refreshCategories();
              refreshTodos();
              
              // Refresh settings by triggering an update
              await refreshSettings({});
              
              Alert.alert(
                t('settings.clearData.success.title'),
                t('settings.clearData.success.message')
              );
            } else {
              Alert.alert(
                t('settings.clearData.error.title'),
                t('settings.clearData.error.message')
              );
            }
            
            // Call custom onPress if provided
            if (onPress) {
              onPress();
            }
          },
        },
      ]
    );
  };

  return (
    <Button onPress={handlePress}>
      <IconContainer>
        <Icon name="trash-outline" size={20} />
      </IconContainer>
      <ButtonText>{t('settings.clearData.button')}</ButtonText>
    </Button>
  );
};

