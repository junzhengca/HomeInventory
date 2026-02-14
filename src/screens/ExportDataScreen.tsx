import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StyledProps } from '../utils/styledComponents';
import { PageHeader } from '../components';
import { fileSystemService } from '../services/FileSystemService';
import { calculateBottomPadding } from '../utils/layout';
import type { RootStackParamList } from '../navigation/types';
import { uiLogger } from '../utils/Logger';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExportData'>;

const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: StyledProps) => theme.colors.background};
`;

const Content = styled(ScrollView)`
  flex: 1;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const FileList = styled(View)`
  gap: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

const FileItem = styled(TouchableOpacity)`
  background-color: ${({ theme }: StyledProps) => theme.colors.surface};
  border-radius: ${({ theme }: StyledProps) => theme.borderRadius.md}px;
  padding: ${({ theme }: StyledProps) => theme.spacing.md}px;
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${({ theme }: StyledProps) => theme.colors.border};
  elevation: 1;
  shadow-color: #000;
  shadow-offset: 0px 1px;
  shadow-opacity: 0.05;
  shadow-radius: 2px;
`;

const FileIcon = styled(Ionicons)`
  color: ${({ theme }: StyledProps) => theme.colors.primary};
  margin-right: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const FileInfo = styled(View)`
  flex: 1;
`;

const FileName = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) => theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.text};
`;

const ChevronIcon = styled(Ionicons)`
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
`;

const EmptyState = styled(View)`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }: StyledProps) => theme.spacing.xl}px;
  min-height: 200px;
`;

const EmptyStateText = styled(Text)`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  text-align: center;
  margin-top: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

const LoadingContainer = styled(View)`
  flex: 1;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

export const ExportDataScreen: React.FC = () => {
  const [jsonFiles, setJsonFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const loadJsonFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const files = await fileSystemService.listJsonFiles();
      setJsonFiles(files.sort());
    } catch (error) {
      uiLogger.error('Error loading JSON files', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJsonFiles();
  }, [loadJsonFiles]);

  const handleFilePress = (filename: string) => {
    navigation.navigate('ExportDataDetail', { filename });
  };

  const bottomPadding = calculateBottomPadding(insets.bottom);

  return (
    <Container>
      <PageHeader
        icon="document-text"
        title="Export Data"
        subtitle="View and share your application data"
        showBackButton={true}
        showRightButtons={false}
      />
      <Content
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        {isLoading ? (
          <LoadingContainer>
            <ActivityIndicator size="large" />
          </LoadingContainer>
        ) : jsonFiles.length === 0 ? (
          <EmptyState>
            <Ionicons name="document-outline" size={64} color="#999" />
            <EmptyStateText>No JSON files found</EmptyStateText>
          </EmptyState>
        ) : (
          <FileList>
            {jsonFiles.map((filename) => (
              <FileItem
                key={filename}
                onPress={() => handleFilePress(filename)}
                activeOpacity={0.7}
              >
                <FileIcon name="document-text-outline" size={24} />
                <FileInfo>
                  <FileName>{filename}</FileName>
                </FileInfo>
                <ChevronIcon name="chevron-forward" size={20} />
              </FileItem>
            ))}
          </FileList>
        )}
      </Content>
    </Container>
  );
};

