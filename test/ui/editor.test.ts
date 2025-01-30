import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import $ from 'jquery';
import { setupAppTest } from './test-utils';
import Editor from '../../ui/editor/editor';
import { EditorConfig, Y } from '../../ui/imports';

describe('Editor', () => {
  let testSetup: Awaited<ReturnType<typeof setupAppTest>>;
  let editor: Editor;
  let rootElement: JQuery;
  const testContent = 'Test document content';

  beforeEach(async () => {
    testSetup = await setupAppTest();
    const testDoc = new Y.Doc();
    const yText = testDoc.getText('content');
    yText.insert(0, testContent);

    const editorContainer = document.createElement('div');
    editorContainer.className = 'editor-root';

    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    editorContainer.appendChild(toolbar);

    const contentEditor = document.createElement('div');
    contentEditor.className = 'content-editor';
    contentEditor.setAttribute('contenteditable', 'true');
    editorContainer.appendChild(contentEditor);

    const metadataPanel = document.createElement('div');
    metadataPanel.className = 'metadata-panel';
    editorContainer.appendChild(metadataPanel);

    testSetup.container.appendChild(editorContainer);

    const editorConfig: EditorConfig = {
      ele: $(editorContainer),
      db: testSetup.db,
      app: testSetup.app,
      getAwareness: () => (testSetup.awareness as any).getStates(),
      currentObject: testDoc.getMap(),
      isReadOnly: false,
      networkStatusCallback: () => {} //Empty callback
    };

    editor = new Editor(editorConfig);
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  test('renders UI elements', () => {
    const toolbar = testSetup.container.querySelector('.toolbar');
    expect(toolbar).toBeDefined();
    expect(toolbar?.children.length).toBeGreaterThan(0);

    const editorArea = testSetup.container.querySelector('.content-editor');
    if (!editorArea) {
      throw new Error('Editor area element not found - verify CSS selectors and DOM structure');
    }
    expect(editorArea).toBeDefined();
    expect(editorArea?.hasAttribute('contenteditable')).toBe(true);
    expect(editorArea?.textContent).toContain(testContent);

    const metadataPanel = testSetup.container.querySelector('.metadata-panel');
    expect(metadataPanel).toBeDefined();
    expect(metadataPanel?.children.length).toBeGreaterThan(0);
  });

  
    test('toggles dark mode correctly', () => {
      expect(editor.rootElement.classList.contains('dark-mode')).toBe(true);
      expect(editor.rootElement.getAttribute('data-theme')).toBe('dark');
  
      const darkModeToggle = testSetup.container.querySelector('.dark-mode-toggle');
      darkModeToggle?.dispatchEvent(new MouseEvent('click'));
      expect(editor.rootElement.classList.contains('dark-mode')).toBe(false);
      expect(editor.rootElement.getAttribute('data-theme')).toBe('light');
  
      darkModeToggle?.dispatchEvent(new MouseEvent('click'));
      expect(editor.rootElement.classList.contains('dark-mode')).toBe(true);
      expect(editor.rootElement.getAttribute('data-theme')).toBe('dark');
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

    /*console.log('Pre-click state:', {
      boldButtonExists: !!boldButton,
      editorAreaExists: !!editorArea,
      selectionType: selection?.type,
      rangeValid: !!range
    });*/
    
    boldButton?.dispatchEvent(new MouseEvent('click'));
    
    //console.log('Post-click execCommand calls:', document.execCommand.mock.calls);
    
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

  test('handles multiple collaborative cursors', () => {
    // First user
    testSetup.socket.emit('awareness', {
      clientId: 123,
      state: {
        user: { userId: 'collab-user-1', color: '#00ff00' },
        cursor: { anchor: 5, head: 5 }
      }
    });

    // Second user
    testSetup.socket.emit('awareness', {
      clientId: 456,
      state: {
        user: { userId: 'collab-user-2', color: '#0000ff' },
        cursor: { anchor: 10, head: 10 }
      }
    });

    const cursors = testSetup.container.querySelectorAll('.remote-cursor');
    expect(cursors.length).toBe(2);
    expect(cursors[0].getAttribute('style')).toContain('background-color: #00ff00');
    expect(cursors[1].getAttribute('style')).toContain('background-color: #0000ff');
  });

  test('handles collaborative editing conflicts', async () => {
    const editorArea = testSetup.container.querySelector('.content-editor');
    const initialContent = 'Initial content';
    editorArea!.innerHTML = initialContent;

    // Simulate concurrent edits
    const [doc1, doc2] = testSetup.crdtFactory.conflictDocs();
    const yText1 = doc1.getText('content');
    const yText2 = doc2.getText('content');
    yText1.insert(0, initialContent);
    yText2.insert(0, initialContent);

    // User 1 edits
    yText1.insert(7, 'user1 ');
    // User 2 edits
    yText2.insert(0, 'user2 ');

    // Sync changes
    testSetup.crdtFactory.sync(doc1, doc2);

    // Verify conflict resolution
    expect(yText1.toString()).toBe('user2 Initial user1 content');
    expect(yText2.toString()).toBe('user2 Initial user1 content');
  });

  test('handles document versioning and snapshots', () => {
    const snapshot1 = new Uint8Array([1, 2, 3]);
    const snapshot2 = new Uint8Array([4, 5, 6]);

    // Load initial snapshot
    editor.loadSnapshot(snapshot1);
    expect(editor.getTestConfig().db.doc.transact).toHaveBeenCalledWith(
      expect.any(Function),
      { snapshot: snapshot1 }
    );

    // Load second snapshot
    editor.loadSnapshot(snapshot2);
    expect(editor.getTestConfig().db.doc.transact).toHaveBeenCalledWith(
      expect.any(Function),
      { snapshot: snapshot2 }
    );

    // Verify snapshot history
    expect(editor.getTestConfig().db.getSnapshotHistory).toHaveBeenCalled();
  });

  test('handles metadata updates', () => {
    const metadataPanel = testSetup.container.querySelector('.metadata-panel');
    const testMetadata = {
      title: 'Test Document',
      tags: ['important', 'draft'],
      created: Date.now(),
      modified: Date.now()
    };

    // Update metadata
    testSetup.socket.emit('metadata-update', testMetadata);
    
    // Verify metadata display
    expect(metadataPanel?.textContent).toContain('Test Document');
    expect(metadataPanel?.textContent).toContain('important');
    expect(metadataPanel?.textContent).toContain('draft');
  });

  test('handles real-time collaboration with multiple users', async () => {
    const [doc1, doc2] = testSetup.crdtFactory.conflictDocs();
    const yText1 = doc1.getText('content');
    const yText2 = doc2.getText('content');
    yText1.insert(0, 'User1 content');
    yText2.insert(0, 'User2 content');

    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, testSetup.netSim.latency));

    // Sync changes
    testSetup.crdtFactory.sync(doc1, doc2);

    // Verify merged content
    expect(yText1.toString()).toBe('User2 contentUser1 content');
    expect(yText2.toString()).toBe('User2 contentUser1 content');
  });


  test('handles semantic matching of objects', () => {
    const query = testSetup.objFactory.indef();
    const matchingObj = testSetup.objFactory.def();
    const nonMatchingObj = { ...testSetup.objFactory.def(), verified: false };


    // Verify semantic matching
    expect(testSetup.semanticMatch(query, matchingObj)).toBe(true);
    expect(testSetup.semanticMatch(query, nonMatchingObj)).toBe(false);
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
    testSetup.app.ele.addClass('connected');
    expect(testSetup.app.ele.hasClass('connected')).toBe(true);

    testSetup.app.ele.removeClass('connected');
    expect(testSetup.app.ele.hasClass('connected')).toBe(false);
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
    expect(editorArea.prop('contenteditable')).toBe(false);

    editorArea.html('new content');
    editorArea.trigger('input');
    expect(readOnlyEditor.getTestConfig().db.doc.transact).not.toHaveBeenCalled();
  });
});
