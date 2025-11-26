import { IStorage } from './IStorage.js';
import { FileSystemStorage } from './FileSystemStorage.js';
import { ObjectStorage } from './ObjectStorage.js';

export class StorageFactory {
  private static instance: IStorage | null = null;

  static getStorage(): IStorage {
    if (this.instance) {
      return this.instance;
    }

    const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
    
    if (isProduction) {
      const bucketName = process.env.STORAGE_BUCKET_NAME;
      
      if (!bucketName) {
        throw new Error(
          'STORAGE_BUCKET_NAME environment variable is required for production deployment. ' +
          'Please create a bucket in the Object Storage tool and set this variable.'
        );
      }
      
      console.log(`Using Replit Object Storage (bucket: ${bucketName})`);
      this.instance = new ObjectStorage(bucketName);
    } else {
      console.log('Using local file system storage');
      this.instance = new FileSystemStorage('.');
    }

    return this.instance;
  }

  static resetInstance(): void {
    this.instance = null;
  }
}
