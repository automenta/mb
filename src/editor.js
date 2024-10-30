import $ from "jquery";

import {debounce} from "./util.js";

import '/css/editor.css';

export default class Editor {
    constructor(ele, db, getAwareness, app) {
        this.db = db;
        this.app = app;
        this.getAwareness = getAwareness;
        this.currentPageId = null;
        this.ydoc = null;
        this.provider = null;
        this.ytext = null;
        this.updatePeriodMS = 100;
        this.$ele = ele;
    }

    bindYjs() {
        if (!this.$editor || !this.ytext) return;

        new MutationObserver(() => {
            const content = this.$editor.html();
            this.ytext.doc.transact(() => {
                this.ytext.delete(0, this.ytext.length);
                this.ytext.insert(0, content);
            });
        }).observe(this.$editor[0], {
            characterData: true,
            childList: true,
            subtree: true,
            attributes: true
        });

        this.ytext.observe(event => {
            const currentContent = this.$editor.html();
            const yContent = this.ytext.toString();
            if (currentContent !== yContent)
                this.$editor.html(yContent);
        });
    }

    saveContent() {
        if (!this.currentPageId || !this.ytext) return;
        const content = this.$editor.html();
        this.db.doc.transact(() => {
            const page = this.db.page(this.currentPageId);
            if (page) {
                const ytext = this.db.pageContent(this.currentPageId);
                ytext.delete(0, ytext.length);
                ytext.insert(0, content);
            }
        });
    }

    viewPage(pageId) {
        if (this.currentPageId === pageId) return;
        this.editorStop();

        this.currentPageId = pageId;
        const page = this.db.page(pageId);
        if (!page) return;

        const $controls = this.controlSection(pageId);
        this.$ele.append($controls);

        this.ydoc = this.db.doc;
        this.ytext = this.db.pageContent(pageId);

        this.editorStart(this.ytext ? this.ytext.toString() : '');

        const awareness = this.getAwareness();
        awareness.setLocalStateField('cursor', null);

        this.$editor.on('select', () => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                awareness.setLocalStateField('cursor', {
                    anchor: range.startOffset,
                    head: range.endOffset
                });
            }
        });
    }

    editorStop() {
        if (this.provider) {
            this.provider.destroy();
            this.provider = null;
        }
        this.ydoc = null;
        this.ytext = null;
        this.$ele.empty();
    }

    editorStart(content) {
        const $container = $('<div>', { class: 'editor-wrapper' });
        $container.append(this.renderToolbar());

        this.$editor = $('<div>', {
            class: 'editor',
            contenteditable: true,
            spellcheck: true,
            html: content
        });

        this.$editor.on('input', debounce(() => this.saveContent(), this.updatePeriodMS));
        this.$editor.on('keydown', e => {
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

        $container.append(this.$editor);
        this.$ele.append($container);
        this.bindYjs();
    }

    renderToolbar() {
        const $toolbar = $('<div>', { class: 'toolbar' });

        const buttons = [
            { command: 'bold', icon: '𝐁', title: 'Bold' },
            { command: 'italic', icon: '𝐼', title: 'Italic' },
            { command: 'underline', icon: 'U', title: 'Underline' },
            { command: 'strikeThrough', icon: 'S', title: 'Strikethrough' },
            { command: 'insertOrderedList', icon: '1.', title: 'Ordered List' },
            { command: 'insertUnorderedList', icon: '•', title: 'Unordered List' },
            { command: 'insertLink', icon: '🔗', title: 'Insert Link' },
            { command: 'insertImage', icon: '🖼️', title: 'Insert Image' },
            { command: 'undo', icon: '↩️', title: 'Undo' },
            { command: 'redo', icon: '↪️', title: 'Redo' },
        ];

        buttons.forEach(({ command, icon, title }) => {
            $('<button>', {
                html: icon,
                title: title
            }).on('click', e => {
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
            }).appendTo($toolbar);
        });

        return $toolbar;
    }

    controlSection(pageId) {
        const page = this.db.page(pageId);

        const $titleInput = $('<input>', {
            type: 'text',
            class: 'title-input',
            value: page.title,
            placeholder: 'Page Title'
        }).on('change', () => this.db.pageTitle(pageId, $titleInput.val()));

        const $privacyToggle = $('<div>', { class: 'privacy-toggle' }).append(
            $('<span>').text('Public'),
            $('<label>', { class: 'toggle-switch' }).append(
                $('<input>', {
                    type: 'checkbox',
                    checked: page.isPublic
                }).on('change', e => {
                    this.db.pagePrivacy(pageId, e.target.checked);
                    e.target.checked ?
                        this.app.net.shareDocument(pageId) :
                        this.app.net.unshareDocument(pageId);
                }),
                $('<span>', { class: 'toggle-slider' })
            )
        );

        const $templateButtons = $('<div>', { class: 'template-buttons' });
        [
            { icon: '📝', title: 'Note Template', template: 'note' },
            { icon: '📅', title: 'Meeting Template', template: 'meeting' },
            { icon: '✅', title: 'Todo Template', template: 'todo' },
            { icon: '📊', title: 'Report Template', template: 'report' }
        ].forEach(({ icon, title, template }) => {
            $('<button>', {
                class: 'template-button',
                text: icon,
                title: title
            }).on('click', () => this.insertTemplate(template))
                .appendTo($templateButtons);
        });

        return $('<div>', { class: 'editor-controls' }).append($titleInput, $privacyToggle, $templateButtons);
    }

    insertTemplate(template) {
        let html = '<TEMPLATE>';
        document.execCommand('insertHTML', false, html);
    }


}
