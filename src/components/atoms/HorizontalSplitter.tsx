import React from 'react';
import { View } from 'react-native';
import styled from 'styled-components/native';
import type { StyledProps } from '../../utils/styledComponents';

const Splitter = styled(View)`
  height: 1px;
  background-color: ${({ theme }: StyledProps) => theme.colors.borderLight};
  margin-vertical: ${({ theme }: StyledProps) => theme.spacing.md}px;
`;

export interface HorizontalSplitterProps {
  marginTop?: number;
  marginBottom?: number;
}

export const HorizontalSplitter: React.FC<HorizontalSplitterProps> = ({
  marginTop,
  marginBottom,
}) => {
  return (
    <Splitter
      style={{
        marginTop: marginTop,
        marginBottom: marginBottom,
      }}
    />
  );
};
