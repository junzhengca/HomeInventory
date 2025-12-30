import * as FileSystem from 'expo-file-system/legacy';

const DATA_DIRECTORY = 'data';

/**
 * Get the document directory path for storing app data
 */
export const getDocumentDirectory = (): string => {
  return FileSystem.documentDirectory || '';
};

/**
 * Get the full path for a data file
 */
export const getDataFilePath = (filename: string): string => {
  const docDir = getDocumentDirectory();
  return `${docDir}${DATA_DIRECTORY}/${filename}`;
};

/**
 * Ensure the data directory exists
 */
export const ensureDirectoryExists = async (): Promise<void> => {
  const docDir = getDocumentDirectory();
  const dataDir = `${docDir}${DATA_DIRECTORY}`;
  
  const dirInfo = await FileSystem.getInfoAsync(dataDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dataDir, { intermediates: true });
  }
};

/**
 * Check if a file exists
 */
export const fileExists = async (filename: string): Promise<boolean> => {
  const filePath = getDataFilePath(filename);
  const fileInfo = await FileSystem.getInfoAsync(filePath);
  return fileInfo.exists;
};

/**
 * Read and parse a JSON file
 */
export const readFile = async <T>(filename: string): Promise<T | null> => {
  try {
    const filePath = getDataFilePath(filename);
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    
    if (!fileInfo.exists) {
      return null;
    }
    
    const content = await FileSystem.readAsStringAsync(filePath);
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`Error reading file ${filename}:`, error);
    return null;
  }
};

/**
 * Write data to a JSON file
 */
export const writeFile = async <T>(filename: string, data: T): Promise<boolean> => {
  try {
    await ensureDirectoryExists();
    const filePath = getDataFilePath(filename);
    const content = JSON.stringify(data, null, 2);
    await FileSystem.writeAsStringAsync(filePath, content);
    return true;
  } catch (error) {
    console.error(`Error writing file ${filename}:`, error);
    return false;
  }
};

/**
 * Delete a file
 */
export const deleteFile = async (filename: string): Promise<boolean> => {
  try {
    const filePath = getDataFilePath(filename);
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(filePath);
    }
    return true;
  } catch (error) {
    console.error(`Error deleting file ${filename}:`, error);
    return false;
  }
};

/**
 * List all JSON files in the data directory
 */
export const listJsonFiles = async (): Promise<string[]> => {
  try {
    await ensureDirectoryExists();
    const docDir = getDocumentDirectory();
    const dataDir = `${docDir}${DATA_DIRECTORY}`;
    
    const dirInfo = await FileSystem.getInfoAsync(dataDir);
    if (!dirInfo.exists) {
      return [];
    }
    
    const files = await FileSystem.readDirectoryAsync(dataDir);
    // Filter to only JSON files
    return files.filter(file => file.endsWith('.json'));
  } catch (error) {
    console.error('Error listing JSON files:', error);
    return [];
  }
};

