import { promises as fs } from 'fs';
import path from 'path';
import { IStorage } from './IStorage.js';

export class FileSystemStorage implements IStorage {
  private baseDir: string;

  constructor(baseDir: string = '.') {
    this.baseDir = baseDir;
  }

  private getFullPath(key: string): string {
    return path.join(this.baseDir, key);
  }

  async save(key: string, data: any): Promise<void> {
    const fullPath = this.getFullPath(key);
    const dir = path.dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async load<T>(key: string): Promise<T | null> {
    try {
      const fullPath = this.getFullPath(key);
      const content = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async list(prefix: string): Promise<string[]> {
    try {
      const fullPath = this.getFullPath(prefix);
      const entries = await fs.readdir(fullPath);
      return entries;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const fullPath = this.getFullPath(key);
      await fs.unlink(fullPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return;
      }
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(key);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
