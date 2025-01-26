import { Awareness } from 'y-protocols/awareness';
import UserInfo from '../me.view';
import $ from 'jquery';

export class AwarenessManager {
  constructor(
    readonly awareness: Awareness,
    private readonly editor: HTMLElement
  ) {
    setTimeout(() => {
      this.setupAwareness();
    }, 0);
  }

  private setupAwareness() {
    // Listen for local cursor changes
    this.editor.addEventListener('mouseup', () => this.updateLocalCursor());
    this.editor.addEventListener('keyup', () => this.updateLocalCursor());

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
    let cursorEle = this.editor.querySelector(`.remote-cursor-${user?.getUser().userId}`);
    
    const u = user?.getUser();

    if (!cursorEle) {
      // Create a new cursor element if it doesn't exist
      cursorEle = document.createElement('span') as HTMLElement;
      cursorEle.className = `remote-cursor remote-cursor-${u.userId}`;
      (cursorEle as HTMLElement).style.position = 'absolute';
      (cursorEle as HTMLElement).style.backgroundColor = u.color;
      (cursorEle as HTMLElement).style.width = '2px';
      (cursorEle as HTMLElement).style.height = '1em';

      this.editor.append(cursorEle);
    }

    // Position the cursor in the editor
    const position = this.getPositionFromOffset(cursorData.anchor);
    (cursorEle as HTMLElement).style.left = `${position.left}px`;
    (cursorEle as HTMLElement).style.top = `${position.top}px`;
    (cursorEle as HTMLElement).style.backgroundColor = u.color;
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