import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import $ from 'jquery';
import { setupAppTest } from './test-utils';
import Editor from '../../ui/editor/editor';
import { Awareness, DB, EditorConfig, Y, App } from '../../ui/imports';
import Network from '../../src/net';
import Matching from '../../src/match';
import Sidebar from '../../ui/sidebar';

describe('Editor', () => {
  let testSetup: Awaited<ReturnType<typeof setupAppTest>>;
  let editor: Editor;
  let rootElement: JQuery;
  const testContent = 'Test document content';

  beforeEach(async () => {
    testSetup = await setupAppTest({
      initialTheme: 'dark',
      initialUser: { userId: 'test-user', name: 'Test User', color: '#ff0000' }
    });

    // Create a test document
    const testDoc = new Y.Doc();
    const yText = testDoc.getText('content');
    yText.insert(0, testContent);

    // Create full editor container with required elements
    const editorContainer = document.createElement('div');
    editorContainer.className = 'editor-root';

    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    editorContainer.appendChild(toolbar);

    // Create content editor
    const contentEditor = document.createElement('div');
    contentEditor.className = 'content-editor';
    contentEditor.setAttribute('contenteditable', 'true');
    editorContainer.appendChild(contentEditor);

    // Create metadata panel
    const metadataPanel = document.createElement('div');
    metadataPanel.className = 'metadata-panel';
    editorContainer.appendChild(metadataPanel);

    testSetup.container.appendChild(editorContainer);

    const editorConfig: EditorConfig = {
      ele: $(editorContainer),
      db: testSetup.db,
      app: testSetup.storeState.app,
      getAwareness: () => testSetup.socket.awareness.getStates(), // Correct way to get awareness states
      currentObject: testDoc.getMap(),
      isReadOnly: false,
      networkStatusCallback: vi.fn()
    };

    editor = new Editor(editorConfig);
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  test('renders core UI elements', () => {
    const toolbar = testSetup.container.querySelector('.toolbar');
    expect(toolbar).toBeDefined();
    expect(toolbar?.children.length).toBeGreaterThan(0);

    const editorArea = testSetup.container.querySelector('.content-editor');
    expect(editorArea).toBeDefined();
    expect(editorArea?.hasAttribute('contenteditable')).toBe(true);
    expect(editorArea?.textContent).toContain(testContent);

    const metadataPanel = testSetup.container.querySelector('.metadata-panel');
    expect(metadataPanel).toBeDefined();
    expect(metadataPanel?.children.length).toBeGreaterThan(0);
  });

  test('toggles dark mode correctly', () => {
    expect(editor.rootElement.hasClass('dark-mode')).toBe(true);
    expect(editor.rootElement.attr('data-theme')).toBe('dark');

    editor.toggleDarkMode();
    expect(editor.rootElement.hasClass('dark-mode')).toBe(false);
    expect(editor.rootElement.attr('data-theme')).toBe('light');
    expect(localStorage.setItem).toHaveBeenCalledWith('themePreference', 'light');

    editor.toggleDarkMode();
    expect(editor.rootElement.hasClass('dark-mode')).toBe(true);
    expect(editor.rootElement.attr('data-theme')).toBe('dark');
    expect(localStorage.setItem).toHaveBeenCalledWith('themePreference', 'dark');
  });

  test('handles text formatting actions', () => {
    const boldButton = testSetup.container.querySelector('button[title="Bold"]');
    const editorArea = testSetup.container.querySelector('.content-editor');

    editorArea!.innerHTML = 'test content';
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editorArea!);
    selection?.removeAllRanges();
    selection?.addRange(range);

    boldButton?.dispatchEvent(new MouseEvent('click'));
    expect(document.execCommand).toHaveBeenCalledWith('bold', false, null);
  });

  test('saves document state', () => {
    const saveButton = testSetup.container.querySelector('button[title="Save"]');
    saveButton?.dispatchEvent(new MouseEvent('click'));

    const config = editor.getTestConfig();
    expect(config.db.doc.transact).toHaveBeenCalled();
    expect(config.db.persistDocument).toHaveBeenCalled();
  });

  test('shows collaborative cursors', () => {
    testSetup.socket.emit('awareness', {
      clientId: 123,
      state: {
        user: { userId: 'collab-user', color: '#00ff00' },
        cursor: { anchor: 5, head: 5 }
      }
    });

    const cursor = testSetup.container.querySelector('.remote-cursor');
    expect(cursor).toBeDefined();
    expect(cursor?.getAttribute('style')).toContain('background-color: #00ff00');
  });

  test('initializes document content correctly', () => {
    const editorArea = testSetup.container.querySelector('.content-editor');
    expect(editorArea?.textContent).toContain(testContent);
  });

  test('handles document updates', () => {
    const newContent = 'Updated content';
    const editorArea = testSetup.container.querySelector('.content-editor');

    editorArea!.innerHTML = newContent;
    editorArea?.dispatchEvent(new Event('input'));

    const config = editor.getTestConfig();
    expect(config.db.doc.transact).toHaveBeenCalled();
    expect(config.db.persistDocument).toHaveBeenCalled();
  });

  test('handles keyboard shortcuts', () => {
    const editorArea = testSetup.container.querySelector('.content-editor');
    editorArea!.innerHTML = 'test content';

    const saveEvent = new KeyboardEvent('keydown', { ctrlKey: true, key: 's' });
    editorArea?.dispatchEvent(saveEvent);

    expect(editor.getTestConfig().db.doc.transact).toHaveBeenCalled();
  });

  test('toggles privacy state', () => {
    const privacyButton = testSetup.container.querySelector('button[title="Toggle Privacy"]');
    const initialPrivacyState = editor.isPublic;

    privacyButton?.dispatchEvent(new MouseEvent('click'));
    expect(editor.isPublic).toBe(!initialPrivacyState);

    expect(editor.getTestConfig().db.objPublic).toHaveBeenCalled();
  });

  test('handles network status changes', () => {
    const networkStatusCallback = editor.getTestConfig().networkStatusCallback;

    networkStatusCallback(true);
    expect(editor.getTestConfig().networkStatusCallback).toHaveBeenCalledWith('connected');

    networkStatusCallback(false);
    expect(editor.getTestConfig().networkStatusCallback).toHaveBeenCalledWith('disconnected');
  });

  test('loads document snapshots', () => {
    const snapshot = new Uint8Array([1, 2, 3]);
    editor.loadSnapshot(snapshot);

    expect(editor.getTestConfig().db.doc.transact).toHaveBeenCalled();
  });

  test('handles read-only mode', () => {
    const editorConfig = editor.getTestConfig();
    const readOnlyConfig = {
      ele: editor.rootElement,
      getAwareness: editorConfig.getAwareness,
      app: editorConfig.app,
      db: editorConfig.db,
      networkStatusCallback: editorConfig.networkStatusCallback,
      currentObject: editorConfig.currentObject,
      isReadOnly: true
    };
    const readOnlyEditor = new Editor(readOnlyConfig);

    const editorArea = readOnlyEditor.rootElement.find('.content-editor');
    expect(editorArea.attr('contenteditable')).toBe('false');

    editorArea.html('new content');
    editorArea.trigger('input');
    expect(readOnlyEditor.getTestConfig().db.doc.transact).not.toHaveBeenCalled();
  });
});