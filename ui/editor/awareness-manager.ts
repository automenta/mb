import { Awareness } from 'y-protocols/awareness';
import UserInfo from '../me.view';
import $ from 'jquery';

export class AwarenessManager {
  constructor(
    readonly awareness: Awareness,
    private readonly editor: JQuery
  ) {
    this.setupAwareness();
  }

  private setupAwareness() {
    // Listen for local cursor changes
    this.editor.on('mouseup keyup', () => this.updateLocalCursor());

    // Listen for awareness updates
    this.awareness.on('change', () => this.renderRemoteCursors());
  }

  updateLocalCursor() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      this.awareness.setLocalStateField('cursor', {
        anchor: range.startOffset,
        head: range.endOffset,
      });
    }
  }

  private renderRemoteCursors() {
    const states = this.awareness.getStates();
    states.forEach((state, clientId) => {
      if (clientId === this.awareness.clientID) return;
      if (state.cursor) {
        this.renderCursor(state.cursor, state.user);
      }
    });
  }

  private renderCursor(cursorData: { anchor: number; head: number }, user: UserInfo) {
    // Try to reuse existing cursor element
    let cursorEle = this.editor.find(`.remote-cursor-${user?.getUser().userId}`);
    
    const u = user?.getUser();

    if (cursorEle.length === 0) {
      // Create a new cursor element if it doesn't exist
      cursorEle = $('<span>', {
        class: `remote-cursor remote-cursor-${u.userId}`,
        css: {
          position: 'absolute',
          backgroundColor: u.color,
          width: '2px',
          height: '1em',
        },
      });
      this.editor.append(cursorEle);
    }

    // Position the cursor in the editor
    const position = this.getPositionFromOffset(cursorData.anchor);
    cursorEle.css({ left: position.left, top: position.top, backgroundColor: u.color });
  }

  private getPositionFromOffset(offset: number): { left: number; top: number } {
    const range = document.createRange();
    if (this.editor[0].childNodes[0]) {
      range.setStart(this.editor[0].childNodes[0], offset);
    }
    const rect = range.getBoundingClientRect();
    return { left: rect.left, top: rect.top };
  }
}