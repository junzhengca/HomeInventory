import React from 'react';
import styled from 'styled-components/native';
import type { StyledProps } from '../../utils/styledComponents';
import type { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

const Container = styled.View`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const Label = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) =>
    theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

export interface FormSectionProps {
  label?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Use smaller vertical spacing (e.g. for add-item bottom sheet) */
  compact?: boolean;
}

/**
 * Reusable form section component with optional label.
 * Wraps form controls with consistent spacing and labeling.
 *
 * @example
 * <FormSection label="Item Name">
 *   <TextInput value={name} onChangeText={setName} />
 * </FormSection>
 */
export const FormSection: React.FC<FormSectionProps> = ({
  label,
  children,
  style,
  compact = false,
}) => {
  const theme = useTheme();
  const containerStyle = compact
    ? [{ marginBottom: theme.spacing.md }, style]
    : style;
  return (
    <Container style={containerStyle}>
      {label && <Label>{label}</Label>}
      {children}
    </Container>
  );
};
