import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, ActivityIndicator, Share, Alert } from 'react-native';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { StyledProps } from '../utils/styledComponents';
import { uiLogger } from '../utils/Logger';
import { PageHeader, BottomActionBar } from '../components';
import { fileSystemService } from '../services/FileSystemService';
import { calculateBottomActionBarPadding } from '../utils/layout';
import { useTheme } from '../theme/ThemeProvider';
import type { RootStackParamList } from '../navigation/types';

type RoutePropType = RouteProp<RootStackParamList, 'ExportDataDetail'>;

const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const Content = styled(ScrollView)`
  flex: 1;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const JsonContainer = styled(View)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.border};
`;

const JsonText = styled(Text)`
  font-family: monospace;
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.sm}px;
  color: ${({ theme }: StyledProps) => theme.colors.text};
  line-height: 20px;
`;

const LoadingContainer = styled(View)`
  flex: 1;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

const ErrorContainer = styled(View)`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  min-height: 200px;
`;

const ErrorText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.error || '#ff4444'};
  text-align: center;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

export const ExportDataDetailScreen: React.FC = () => {
  const route = useRoute<RoutePropType>();
  const { filename } = route.params;
  const [jsonContent, setJsonContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const loadJsonContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fileSystemService.readFile<unknown>(filename);
      if (data === null) {
        setError('File not found or could not be read');
      } else {
        // Format JSON with proper indentation
        const formatted = JSON.stringify(data, null, 2);
        setJsonContent(formatted);
      }
    } catch (err) {
      uiLogger.error('Error loading JSON content', err);
      setError('Failed to load file content');
    } finally {
      setIsLoading(false);
    }
  }, [filename]);

  useEffect(() => {
    loadJsonContent();
  }, [loadJsonContent]);

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: jsonContent,
        title: filename,
      });

      if (result.action === Share.sharedAction) {
        // User shared successfully
        uiLogger.info('Content shared successfully');
      }
    } catch (error) {
      uiLogger.error('Error sharing', error);
      Alert.alert('Error', 'Failed to share content');
    }
  };

  const bottomPadding = calculateBottomActionBarPadding(insets.bottom);

  return (
    <Container>
      <PageHeader
        icon="document-text"
        title={filename}
        subtitle="Raw JSON content"
        showBackButton={true}
        showRightButtons={false}
      />
      <Content
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        {isLoading ? (
          <LoadingContainer>
            <ActivityIndicator size="large" />
          </LoadingContainer>
        ) : error ? (
          <ErrorContainer>
            <Ionicons name="alert-circle-outline" size={64} color="#ff4444" />
            <ErrorText>{error}</ErrorText>
          </ErrorContainer>
        ) : (
          <JsonContainer>
            <JsonText selectable>{jsonContent}</JsonText>
          </JsonContainer>
        )}
      </Content>
      {!isLoading && !error && (
        <BottomActionBar
          actions={[
            {
              label: 'Share JSON',
              onPress: handleShare,
              variant: 'filled',
              icon: <Ionicons name="share-outline" size={18} color={theme.colors.surface} />,
            },
          ]}
        />
      )}
    </Container>
  );
};

