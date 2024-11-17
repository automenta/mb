import $ from "jquery";

import DB from '../src/db'
import App from './app'

import {debounce} from "../src/util.js";

import '/ui/css/editor.css';
import {YText} from "yjs/dist/src/types/YText";

export default class Editor {
    private readonly db: DB;
    private readonly app: App;
    private readonly getAwareness: Function;
    private currentPageId: string;
    private provider: any;
    private ele: JQuery;
    private ytext: YText;
    private updatePeriodMS: number;
    private editor: JQuery;
    
    constructor(ele:JQuery, db:DB, getAwareness:Function, app:App) {
        this.db = db;
        this.app = app;
        this.getAwareness = getAwareness;
        this.currentPageId = null;
        this.provider = null;
        this.ytext = null;
        this.updatePeriodMS = 100;
        this.ele = ele;
    }

    saveContent() {
        if (!this.currentPageId || !this.ytext) return;
        const content = this.editor.html();
        this.db.doc.transact(() => {
            const page = this.db.page(this.currentPageId);
            if (page) {
                const ytext = this.db.pageContent(this.currentPageId);
                ytext.delete(0, ytext.length);
                ytext.insert(0, content);
            }
        });
    }

    viewPage(pageId:string) {
        if (this.currentPageId === pageId) return;
        this.editorStop();

        const page = this.db.page(pageId);
        if (!page) return;

        this.currentPageId = pageId;

        this.editorStart(pageId);

        const awareness = this.getAwareness();
        awareness.setLocalStateField('cursor', null);

        this.editor.on('select', () => {
            const sel = window.getSelection();
            if (sel!==null && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                awareness.setLocalStateField('cursor', {
                    anchor: range.startOffset,
                    head: range.endOffset
                });
            }
        });
    }

    editorStart(pageId:string):void {
        this.ytext = this.db.pageContent(pageId);

        this.ele.append(
            this.renderControls(pageId),
            this.renderToolbar(),
            this.editor = this.renderEditor()
        );

        if (!this.editor || !this.ytext) {
            new MutationObserver(() => {
                const content = this.editor.html();
                this.ytext.doc.transact(() => {
                    this.ytext.delete(0, this.ytext.length);
                    this.ytext.insert(0, content);
                });
            }).observe(this.editor[0], {
                characterData: true,
                childList: true,
                subtree: true,
                attributes: true
            });
        }

        this.ytext.observe(event => {
            const currentContent = this.editor.html();
            const yContent = this.ytext.toString();
            if (currentContent !== yContent)
                this.editor.html(yContent);
        });
    }

    editorStop() {
        if (this.provider) {
            this.provider.destroy();
            this.provider = null;
        }
        this.ytext = null;
        this.ele.empty();
    }

    renderEditor():JQuery {
        const content = this.ytext ? this.ytext.toString() : '';
        return $('<div>', {
            class: 'editor',
            contenteditable: true,
            spellcheck: true,
            html: content
        })
            .on('input', debounce(() => this.saveContent(), this.updatePeriodMS))
            .on('keydown', e => {
                if (e.ctrlKey || e.metaKey) {
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

    renderToolbar():JQuery {
        const toolbar = $('<div>', { class: 'toolbar' });
        [
            {command: 'bold', icon: '𝐁', title: 'Bold'},
            {command: 'italic', icon: '𝐼', title: 'Italic'},
            {command: 'underline', icon: 'U', title: 'Underline'},
            {command: 'strikeThrough', icon: 'S', title: 'Strikethrough'},
            {command: 'insertOrderedList', icon: '1.', title: 'Ordered List'},
            {command: 'insertUnorderedList', icon: '•', title: 'Unordered List'},
            {command: 'insertLink', icon: '🔗', title: 'Insert Link'},
            {command: 'insertImage', icon: '🖼️', title: 'Insert Image'},
            {command: 'undo', icon: '↩️', title: 'Undo'},
            {command: 'redo', icon: '↪️', title: 'Redo'},
        ].forEach(({ command, icon, title }) => {
            $('<button>', {
                html: icon,
                title: title
            }).click(e => {
                e.preventDefault();
                if (command === 'insertLink') {
                    const url = prompt('Enter the URL');
                    if (url) document.execCommand(command, false, url);
                } else if (command === 'insertImage') {
                    const url = prompt('Enter the image URL');
                    if (url) document.execCommand(command, false, url);
                } else {
                    document.execCommand(command, false, null);
                }
            }).appendTo(toolbar);
        });
        return toolbar;
    }

    renderControls(pageId:string):JQuery {
        const page = this.db.page(pageId);
        return $('<div>').addClass('editor-controls').append(
            this.renderTitleInput(page, pageId),
            this.renderPrivacyToggle(page, pageId),
            this.renderTemplateButtons()
        );
    }

    renderTitleInput(page, pageId:string):JQuery {
        const titleInput = $('<input>', {
            type: 'text',
            class: 'title-input',
            value: page.title,
            placeholder: 'Page Title'
        }).on('change', () => this.db.pageTitle(pageId, titleInput.val()));
        return titleInput;
    }

    renderPrivacyToggle(page, pageId:string) {
        return $('<div>', {class: 'privacy-toggle'}).append(
            $('<span>').text('Public'),
            $('<label>', {class: 'toggle-switch'}).append(
                $('<input>', {
                    type: 'checkbox',
                    checked: page.isPublic
                }).on('change', e => {
                    this.db.pagePrivacy(pageId, e.target.checked);
                    e.target.checked ?
                        this.app.net.shareDocument(pageId) :
                        this.app.net.unshareDocument(pageId);
                }),
                $('<span>', {class: 'toggle-slider'})
            )
        );
    }

    renderTemplateButtons():JQuery {
        const templateButtons = $('<div>', {class: 'template-buttons'});
        [
            {icon: '📝', title: 'Note Template', template: 'note'},
            {icon: '📅', title: 'Meeting Template', template: 'meeting'},
            {icon: '✅', title: 'Todo Template', template: 'todo'},
            {icon: '📊', title: 'Report Template', template: 'report'}
        ].forEach(({icon, title, template}) => {
            $('<button>', {
                class: 'template-button',
                text: icon,
                title: title
            }).click(() => this.insertTemplate(template))
                .appendTo(templateButtons);
        });
        return templateButtons;
    }

    insertTemplate(template:string):void {
        let html = '<TEMPLATE>';
        document.execCommand('insertHTML', false, html);
    }


}
/*
TODO

import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';

export default class Editor {
    // ... existing code ...

    private awareness: Awareness;

    constructor(ele: JQuery, db: DB, getAwareness: Function, app: App) {
        // ... existing code ...
        this.awareness = getAwareness();
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

    private renderCursor(cursorData, user) {
        // Remove existing cursor elements for this user
        this.editor.find(`.remote-cursor-${user.id}`).remove();

        // Create a new cursor element
        const cursorEle = $('<span>', {
            class: `remote-cursor remote-cursor-${user.id}`,
            css: {
                position: 'absolute',
                backgroundColor: user.color,
                width: '2px',
                height: '1em',
            },
        });

        // Position the cursor in the editor
        // (You'll need to map cursorData.anchor to a position in the DOM)
        // For simplicity, here's a placeholder implementation:
        const position = this.getPositionFromOffset(cursorData.anchor);
        cursorEle.css({ left: position.left, top: position.top });

        this.editor.append(cursorEle);
    }

    private getPositionFromOffset(offset: number) {
        // Implement a method to convert text offset to x,y coordinates
        // This can be complex depending on your editor's implementation
        return { left: 0, top: 0 }; // Placeholder
    }

    // ... existing code ...
}

// In editor.css

.remote-cursor {
    pointer-events: none;
    z-index: 10;
}
 */
