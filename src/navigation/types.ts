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
  ItemDetails: { itemId: string };
  ExportData: undefined;
  ExportDataDetail: { filename: string };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}

