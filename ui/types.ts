import type { DB, Awareness, NObject, App } from './imports';
import type { Doc as YDoc, Map as YMap } from 'yjs';

export interface UserInfo {
  userId: string;
  name: string;
  color: string;
  avatar?: string;
  bio?: string;
  social?: {
    twitter?: string;
    github?: string;
    website?: string;
  };
  status?: 'online' | 'away' | 'busy';
}

export interface ToolbarItem {
  command: string;
  icon: string;
  title: string;
  handler?: () => void;
}

export interface EditorConfig {
  ele: JQuery;
  db: DB;
  getAwareness: () => Awareness;
  app: App;
  networkStatusCallback: (status: boolean) => void;
  currentObject?: NObject | YMap<any>;
  isReadOnly?: boolean;
  net?: {
    bindDocument: (doc: YDoc) => void;
    syncAwareness: (state: Awareness) => void;
  };
}

export interface DocumentMetadata {
  created: number;
  updated: number;
  author: string;
  tags: string[];
  public: boolean;
}

export interface CursorState {
  anchor: number;
  head: number;
  user: UserInfo;
}