import { createServer } from '../../server/server';
import { io } from 'socket.io-client';
import App from '../../ui/app';
//import type { Server } from 'http';
import DB from '../../core/db';
import { Y, Awareness } from '../../ui/imports';
import type { AppState } from '../../ui/store';

export interface TestSetup {
  container: HTMLElement;
  socket: ReturnType<typeof io>;
  cleanup: () => Promise<void>;
  db: DB;
  awareness: Awareness;
  app: App & {
    pluginStatus: Record<string, boolean>;
  };
  storeState: Partial<AppState>;
  crdtFactory: {
    conflictDocs: () => [Y.Doc, Y.Doc];
    sync: (a: Y.Doc, b: Y.Doc) => void;
  };
  netSim: {
    latency: number;
    wrap: (socket: any) => any;
  };
  objFactory: {
    def: () => any;
    indef: () => any;
  };
  semanticMatch: (query: any, target: any) => boolean;
}

export type TestSetupResult = TestSetup;

export async function setupAppTest(): Promise<TestSetup> {
  const serverInstance = await createServer();
  const serverClosePromise = new Promise<void>(resolve => serverInstance.server.once('close', resolve));
  await new Promise<void>(resolve => serverInstance.server.listen(0, resolve));
  const addr = serverInstance.server.address();
  const port = typeof addr === 'string' ? parseInt(addr.split(':').pop() || '3000') : addr.port;

  const socket = io(`http://localhost:${port}`);

  const container = document.createElement('div');
  document.body.appendChild(container);

  const app = new App('test-user', 'test-channel') as App & {
    pluginStatus: Record<string, boolean>;
  };
  app.pluginStatus = {};
  app.mount(container);

  const db = new DB('test-user');
  const awareness = new Awareness(db.doc);

  return {
    container,
    server: serverInstance.server,
    socket,
    cleanup: async () => {
      socket.disconnect();
      serverInstance.server.close();
      await serverClosePromise;
      document.body.removeChild(container);
    },
    db,
    crdtFactory: {
      conflictDocs: () => [new Y.Doc(), new Y.Doc()],
      sync: (a: Y.Doc, b: Y.Doc) => {
        Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
        Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
      }
    },
    awareness,
    app,
    storeState: {} as Partial<AppState>,
    netSim: {
      latency: 50,
      wrap: (s: any) => ({ emit: (e: string, d: any) => setTimeout(() => s.emit(e, d), 50) })
    },
    objFactory: {
      def: () => ({ id: `d${Math.random().toString(36).slice(2)}`, type: 'fact', verified: true, ts: Date.now() }),
      indef: () => ({ id: `i${Math.random().toString(36).slice(2)}`, type: 'query', conditions: { $match: { type: 'fact', verified: true } } })
    },
    semanticMatch: (q: any, t: any) => Object.entries(q.conditions?.$match || {}).every(([k, v]) => t[k] === v)
  };
}

export const waitFor = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export const simulateUserInteraction = async (element: HTMLElement, eventType: string): Promise<void> => {
  const event = new Event(eventType, { bubbles: true });
  element.dispatchEvent(event);
  await waitFor(0);
};
