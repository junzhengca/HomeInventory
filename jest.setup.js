/**
 * Jest setup file for TodoService tests
 *
 * This file runs before each test suite to set up global mocks and configurations.
 */

// Set test environment variables
process.env.EXPO_PUBLIC_API_BASE_URL = 'https://test-api.example.com';

// Mock React Native modules that jest-expo doesn't handle automatically
jest.mock('expo-file-system', () => ({
  FileSystem: {
    documentDirectory: '/tmp/test/',
    getInfoAsync: jest.fn(),
    readAsStringAsync: jest.fn(),
    writeAsStringAsync: jest.fn(),
    makeDirectoryAsync: jest.fn(),
    deleteAsync: jest.fn(),
    readDirectoryAsync: jest.fn(),
  },
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    multiGet: jest.fn(),
    multiSet: jest.fn(),
    multiRemove: jest.fn(),
    clear: jest.fn(),
    getAllKeys: jest.fn(),
  },
}));

// Mock Expo SecureStore
jest.mock('expo-secure-store', () => ({
  SecureStore: {
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
  },
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
