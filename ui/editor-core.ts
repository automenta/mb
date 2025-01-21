import $ from 'jquery';
import { debounce } from '../src/util.js';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { UserInfo } from './me.view.js';
import DB from '../src/db';
import NObject from '../src/obj';

export class EditorCore {
  private ytext: Y.Text | null;
  private editor: JQuery;

  constructor(
    private readonly db: DB,
    private readonly getAwareness: () => Awareness,
    private readonly currentObjId: string,
    private readonly isReadOnly: boolean,
    private readonly currentObject: NObject
  ) {
    this.ytext = this.db.objText(currentObjId);
    this.editor = this.renderEditor();
  }

  private renderEditor(): JQuery {
    const content = this.ytext ? this.ytext.toString() : '';
    return $('<div>', {
      class: 'editor',
      contenteditable: !this.isReadOnly,
      spellcheck: true,
      html: content,
    })
      .on('input', debounce(() => this.saveContent(), 100))
      .on('keydown', e => {
        if (!this.isReadOnly && (e.ctrlKey || e.metaKey)) {
          switch (e.key.toLowerCase()) {
            case 'b':
              e.preventDefault();
              document.execCommand('bold');
              break;
            case 'i':
              e.preventDefault();
              document.execCommand('italic');
              break;
            case 'u':
              e.preventDefault();
              document.execCommand('underline');
              break;
          }
        }
      });
  }

  private saveContent() {
    if (!this.ytext || this.isReadOnly) return;
    const content = this.editor.html();
    this.db.doc.transact(() => {
      if (this.currentObject) {
        const ytext = this.currentObject.text;
        ytext.delete(0, ytext.length);
        ytext.insert(0, content);
      }
    });
  }

  getEditorElement(): JQuery {
      return this.editor;
  }
}