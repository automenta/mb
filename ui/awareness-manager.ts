import { Awareness } from 'y-protocols/awareness';
import { UserInfo } from './me.view';
import $ from 'jquery';

export class AwarenessManager {
  constructor(
    private readonly awareness: Awareness,
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

  private updateLocalCursor() {
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
    // Remove existing cursor elements for this user
    this.editor.find(`.remote-cursor-${user.userId}`).remove();

    // Create a new cursor element
    const cursorEle = $('<span>', {
      class: `remote-cursor remote-cursor-${user.userId}`,
      css: {
        position: 'absolute',
        backgroundColor: user.color,
        width: '2px',
        height: '1em',
      },
    });

    // Position the cursor in the editor
    const position = this.getPositionFromOffset(cursorData.anchor);
    cursorEle.css({ left: position.left, top: position.top });

    this.editor.append(cursorEle);
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