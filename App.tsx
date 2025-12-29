import React from 'react';
import { StatusBar } from 'expo-status-bar';
import styled from 'styled-components/native';

const Container = styled.View`
  flex: 1;
  background-color: #fff;
  align-items: center;
  justify-content: center;
`;

const Title = styled.Text`
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 16px;
`;

const Subtitle = styled.Text`
  font-size: 16px;
  color: #666;
`;

export default function App() {
  return (
    <Container>
      <Title>Hello World</Title>
      <Subtitle>Welcome to your Expo React Native app!</Subtitle>
      <StatusBar style="auto" />
    </Container>
  );
}

