export interface IStorage {
  save(key: string, data: any): Promise<void>;
  
  load<T>(key: string): Promise<T | null>;
  
  list(prefix: string): Promise<string[]>;
  
  delete(key: string): Promise<void>;
  
  exists(key: string): Promise<boolean>;
}
