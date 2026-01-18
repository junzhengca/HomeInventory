import React from 'react';
import styled from 'styled-components/native';
import type { StyledProps } from '../../utils/styledComponents';
import type { StyleProp, ViewStyle } from 'react-native';

const Container = styled.View`
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.lg}px;
`;

const Label = styled.Text`
  font-size: ${({ theme }: StyledProps) => theme.typography.fontSize.md}px;
  font-weight: ${({ theme }: StyledProps) =>
    theme.typography.fontWeight.medium};
  color: ${({ theme }: StyledProps) => theme.colors.text};
  margin-bottom: ${({ theme }: StyledProps) => theme.spacing.sm}px;
`;

export interface FormSectionProps {
  label?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
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
}) => {
  return (
    <Container style={style}>
      {label && <Label>{label}</Label>}
      {children}
    </Container>
  );
};
