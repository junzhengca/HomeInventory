import { NavigatorScreenParams } from '@react-navigation/native';

export type HomeStackParamList = {
  Home: undefined;
};

export type InventoryStackParamList = {
  Inventory: undefined;
};

export type NotesStackParamList = {
  Notes: undefined;
};

export type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  InventoryTab: NavigatorScreenParams<InventoryStackParamList>;
  NotesTab: NavigatorScreenParams<NotesStackParamList>;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList>;
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

