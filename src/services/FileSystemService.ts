import * as FileSystem from 'expo-file-system/legacy';
import { storageLogger } from '../utils/Logger';

const DATA_DIRECTORY = 'data';

class FileSystemService {
  private documentDirectory: string;

  /* @private */
  constructor() {
    this.documentDirectory = FileSystem.documentDirectory || '';
  }

  /**
   * Get the document directory path for storing app data
   */
  getDocumentDirectory(): string {
    return this.documentDirectory;
  }

  /**
   * Get the full path for a data file
   */
  getDataFilePath(filename: string, userId?: string): string {
    const docDir = this.getDocumentDirectory();

    if (userId) {
      const parts = filename.split('.');
      const ext = parts.pop();
      const name = parts.join('.');
      return `${docDir}${DATA_DIRECTORY}/${name}_${userId}.${ext}`;
    }

    return `${docDir}${DATA_DIRECTORY}/${filename}`;
  }

  /**
   * Ensure the data directory exists
   */
  async ensureDirectoryExists(): Promise<void> {
    const docDir = this.getDocumentDirectory();
    const dataDir = `${docDir}${DATA_DIRECTORY}`;

    const dirInfo = await FileSystem.getInfoAsync(dataDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dataDir, { intermediates: true });
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(filename: string, userId?: string): Promise<boolean> {
    const filePath = this.getDataFilePath(filename, userId);
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    return fileInfo.exists;
  }

  /**
   * Read and parse a JSON file
   */
  async readFile<T>(filename: string, userId?: string): Promise<T | null> {
    try {
      const filePath = this.getDataFilePath(filename, userId);
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (!fileInfo.exists) {
        return null;
      }

      const content = await FileSystem.readAsStringAsync(filePath);
      return JSON.parse(content) as T;
    } catch (error) {
      storageLogger.error(`Error reading file ${filename} (user: ${userId || 'default'}):`, error);
      return null;
    }
  }

  /**
   * Write data to a JSON file
   */
  async writeFile<T>(filename: string, data: T, userId?: string): Promise<boolean> {
    try {
      await this.ensureDirectoryExists();
      const filePath = this.getDataFilePath(filename, userId);
      const content = JSON.stringify(data, null, 2);
      await FileSystem.writeAsStringAsync(filePath, content);
      return true;
    } catch (error) {
      storageLogger.error(`Error writing file ${filename} (user: ${userId || 'default'}):`, error);
      return false;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(filename: string): Promise<boolean> {
    try {
      const filePath = this.getDataFilePath(filename);
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
      }
      return true;
    } catch (error) {
      storageLogger.error(`Error deleting file ${filename}:`, error);
      return false;
    }
  }

  /**
   * List all JSON files in the data directory
   */
  async listJsonFiles(): Promise<string[]> {
    try {
      await this.ensureDirectoryExists();
      const docDir = this.getDocumentDirectory();
      const dataDir = `${docDir}${DATA_DIRECTORY}`;

      const dirInfo = await FileSystem.getInfoAsync(dataDir);
      if (!dirInfo.exists) {
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(dataDir);
      // Filter to only JSON files
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      storageLogger.error('Error listing JSON files:', error);
      return [];
    }
  }

  /**
   * Delete all files associated with a specific home
   */
  async deleteHomeFiles(homeId: string): Promise<void> {
    try {
      const files = await this.listJsonFiles();
      const filesToDelete = files.filter(file => file.endsWith(`_${homeId}.json`));

      storageLogger.info(`Deleting ${filesToDelete.length} files for home ${homeId}`);

      for (const file of filesToDelete) {
        await this.deleteFile(file);
      }
    } catch (error) {
      storageLogger.error(`Error deleting files for home ${homeId}:`, error);
    }
  }
}

export const fileSystemService = new FileSystemService();
export type { FileSystemService };
