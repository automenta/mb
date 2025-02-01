export interface NetworkPlugin {
  name: string;
  init(config: any): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  broadcast(message: any): Promise<void>;
  onReceive(callback: (message: any) => void): void;
}