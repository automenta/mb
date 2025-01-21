import $ from 'jquery';
import DB from '../src/db';
import NObject from '../src/obj';
import App from './app';
import { debounce } from '../src/util.js';
import '/ui/css/editor.css';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { UserInfo } from './me.view.js';
import { EditorCore } from './editor-core';
import { ToolbarManager } from './toolbar-manager';
import { TemplateManager } from './template-manager';
import { AwarenessManager } from './awareness-manager';
import { MetadataManager } from './metadata-manager';

// Interfaces
interface EditorConfig {
  ele: JQuery;
  db: DB;
  getAwareness: () => Awareness;
  app: App;
}

interface TemplateDefinition {
  name: string;
  icon: string;
  content: string;
  variables?: Record<string, string>;
}

export interface ToolbarItem {
  command: string;
  icon: string;
  title: string;
  handler?: () => void;
}

interface CursorState {
  anchor: number;
  head: number;
  user: UserInfo;
}

interface DocumentMetadata {
  created: number;
  updated: number;
  author: string;
  tags: string[];
  public: boolean;
}

export default class Editor {
  private currentObjId: string;
  private ytext: Y.Text | null;
  private updatePeriodMS: number;
  private editor: JQuery;
  private isReadOnly: boolean;
  private currentObject: NObject;
  private awareness: Awareness;
  private editorCore: EditorCore;
  private toolbarManager: ToolbarManager;
  private templateManager: TemplateManager;
  private awarenessManager: AwarenessManager;
  private metadataManager: MetadataManager;

  constructor(
    private readonly ele: JQuery,
    private readonly db: DB,
    private readonly getAwareness: () => Awareness,
    private readonly app: App
  ) {
    this.currentObjId = '';
    this.ytext = null;
    this.updatePeriodMS = 100;
    this.awareness = getAwareness();
    this.editorCore = new EditorCore(
      this.db,
      this.getAwareness,
      this.currentObjId,
      this.isReadOnly,
      this.currentObject
    );
    this.toolbarManager = new ToolbarManager(this.isReadOnly, this.app);
    this.templateManager = new TemplateManager(this.isReadOnly);
    this.awarenessManager = new AwarenessManager(this.awareness, this.editor);
    this.metadataManager = new MetadataManager(this.isReadOnly);
  }

  view(obj: NObject) {
    const objID = obj.id;
    if (this.currentObjId === objID) return;
    this.editorStop();

    this.currentObject = obj;

    // Check if current user is the author
    this.isReadOnly = this.currentObject.author !== this.app.db.userID;
    this.currentObjId = objID;

    this.editorStart(objID);

    const awareness = this.getAwareness();
    awareness.setLocalStateField('cursor', null);

    if (!this.isReadOnly) {
      this.editor.on('select', () => {
        const sel = window.getSelection();
        if (sel !== null && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          awareness.setLocalStateField('cursor', {
            anchor: range.startOffset,
            head: range.endOffset,
          });
        }
      });
    }
  }

  editorStart(pageId: string): void {
    this.ytext = this.db.objText(pageId);

    this.ele.append(
      this.renderControls(pageId),
      this.metadataManager.renderMetadataPanel(this.currentObject),
      this.toolbarManager.getToolbarElement(), // Use toolbar from ToolbarManager
      this.editorCore.getEditorElement() // Use editor element from EditorCore
    );

    this.editor = this.editorCore.getEditorElement(); // Get the editor element from EditorCore

    if (!this.isReadOnly && !this.editor.data('observer')) {
      const observer = new MutationObserver(() => {
        const content = this.editor.html();
        this.ytext.doc.transact(() => {
          this.ytext.delete(0, this.ytext.length);
          this.ytext.insert(0, content);
        });
      });

      observer.observe(this.editor[0], {
        characterData: true,
        childList: true,
        subtree: true,
        attributes: true,
      });

      this.editor.data('observer', observer);
    }

    this.ytext.observe(() => {
      const currentContent = this.editor.html();
      const yContent = this.ytext.toString();
      if (currentContent !== yContent) this.editor.html(yContent);
    });

    // this.setupAwareness();
  }

  editorStop() {
    this.editor?.data('observer')?.disconnect();

    this.ytext = null;
    this.ele.empty();
    this.currentObject = null;
    this.isReadOnly = false;
  }

  renderControls(pageId: string): JQuery {
    const page = this.db.get(pageId);
    if (!page) return $('<div>');

    const controls = $('<div>').addClass('editor-controls');

    // Title input
    controls.append(this.renderTitleInput(page));

    // Only show privacy toggle and template buttons if not read-only
    if (!this.isReadOnly)
      controls.append(
        this.renderPrivacyToggle(page, pageId),
        this.renderTemplateButtons()
      );

    // Add read-only indicator if applicable
    if (this.isReadOnly)
      controls.append(
        $('<div>', {
          class: 'readonly-indicator',
          text: 'Read Only',
        })
      );

    return controls;
  }

  renderTitleInput(page: NObject): JQuery<HTMLElement> {
    return $('<input>', {
      type: 'text',
      class: 'title-input',
      value: page.name,
      placeholder: 'Page Title',
      readonly: this.isReadOnly,
    }).on('change', e => {
      if (!this.isReadOnly) {
        this.currentObject.name = $(e.target).val() as string;
      }
    });
  }

  renderPrivacyToggle(page: NObject, pageId: string) {
    return $('<div>', { class: 'privacy-toggle' }).append(
      $('<span>').text('Public'),
      $('<label>', { class: 'toggle-switch' }).append(
        $('<input>', {
          type: 'checkbox',
          checked: page.public,
          disabled: this.isReadOnly,
        }).on('change', e => {
          const checked = (e.target as HTMLInputElement).checked;
          this.db.objPublic(pageId, checked);
          checked
            ? this.app.net.shareDocument(pageId)
            : this.app.net.unshareDocument(pageId);
        }),
        $('<span>', { class: 'toggle-slider' })
      )
    );
  }

  renderTemplateButtons(): JQuery {
    if (this.isReadOnly) return $('<div>');

    const templateButtons = $('<div>', { class: 'template-buttons' });
    [
      { icon: '📝', title: 'Note Template', template: 'note' },
      { icon: '📅', title: 'Meeting Template', template: 'meeting' },
      { icon: '✅', title: 'Todo Template', template: 'todo' },
      { icon: '📊', title: 'Report Template', template: 'report' },
    ].forEach(({ icon, title, template }) => {
      $('<button>', {
        class: 'template-button',
        text: icon,
        title: title,
        disabled: this.isReadOnly,
      })
        .click(() => this.templateManager.insertTemplate(template))
        .appendTo(templateButtons);
    });
    return templateButtons;
  }

  private getPositionFromOffset(offset: number): { left: number; top: number } {
    const range = document.createRange();
    if (this.editor[0].childNodes[0]) {
      //Added check
      range.selectNodeContents(this.editor[0]);
      range.setStart(this.editor[0].childNodes[0], offset);
    }
    const rect = range.getBoundingClientRect();
    return { left: rect.left, top: rect.top };
  }
}
