import { EditorConfig, Y } from '../../ui/imports';
import { TestSetupResult } from './test-utils';

export const createEditorConfig = (testDoc: Y.Doc, setupResult: TestSetupResult, overrides: Partial<EditorConfig> = {}): EditorConfig => ({
  ele: null,
  db: setupResult.db,
  app: setupResult.app,
  getAwareness: () => setupResult.awareness.getStates(),
  currentObject: testDoc.getMap(),
  isReadOnly: false,
  networkStatusCallback: () => {}, 
  ...overrides
});