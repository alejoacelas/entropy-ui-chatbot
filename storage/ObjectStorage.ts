import { Storage } from '@google-cloud/storage';
import { IStorage } from './IStorage.js';

const REPLIT_SIDECAR_ENDPOINT = 'http://127.0.0.1:1106';

export class ObjectStorage implements IStorage {
  private storage: Storage;
  private bucketName: string;

  constructor(bucketName: string) {
    this.bucketName = bucketName;
    
    this.storage = new Storage({
      credentials: {
        audience: 'replit',
        subject_token_type: 'access_token',
        token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
        type: 'external_account',
        credential_source: {
          url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
          format: {
            type: 'json',
            subject_token_field_name: 'access_token',
          },
        },
        universe_domain: 'googleapis.com',
      },
      projectId: '',
    });
  }

  async save(key: string, data: any): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(key);
    
    await file.save(JSON.stringify(data, null, 2), {
      contentType: 'application/json',
      metadata: {
        cacheControl: 'no-cache',
      },
    });
  }

  async load<T>(key: string): Promise<T | null> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(key);
      
      const [exists] = await file.exists();
      if (!exists) {
        return null;
      }
      
      const [contents] = await file.download();
      return JSON.parse(contents.toString('utf-8')) as T;
    } catch (error) {
      console.error(`Error loading ${key}:`, error);
      return null;
    }
  }

  async list(prefix: string): Promise<string[]> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const [files] = await bucket.getFiles({ prefix });
      
      return files.map(file => {
        const name = file.name;
        if (name.startsWith(prefix)) {
          return name.substring(prefix.length);
        }
        return name;
      }).filter(name => name.length > 0 && !name.includes('/'));
    } catch (error) {
      console.error(`Error listing ${prefix}:`, error);
      return [];
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(key);
      await file.delete();
    } catch (error) {
      console.error(`Error deleting ${key}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(key);
      const [exists] = await file.exists();
      return exists;
    } catch {
      return false;
    }
  }
}
