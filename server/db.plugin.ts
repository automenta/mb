export interface DatastorePlugin {
  name: string;
  init(config: any): Promise<void>;
  put(key: string, value: any): Promise<void>;
  get(key: string): Promise<any>;
  del(key: string): Promise<void>;
  close(): Promise<void>;
}