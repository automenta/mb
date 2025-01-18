import $ from "jquery";
import { debounce } from "../src/util.js";
import '/ui/css/editor.css';
export default class Editor {
    db;
    app;
    getAwareness;
    currentObjId;
    provider;
    ele;
    ytext;
    updatePeriodMS;
    editor;
    isReadOnly;
    currentObject;
    constructor(ele, db, getAwareness, app) {
        this.db = db;
        this.app = app;
        this.getAwareness = getAwareness;
        this.currentObjId = '';
        this.provider = null;
        this.ytext = null;
        this.updatePeriodMS = 100;
        this.ele = ele;
    }
    saveContent() {
        if (!this.currentObjId || !this.ytext || this.isReadOnly)
            return;
        const content = this.editor.html();
        this.db.doc.transact(() => {
            if (this.currentObject) {
                const ytext = this.currentObject.text;
                ytext.delete(0, ytext.length);
                ytext.insert(0, content);
            }
        });
    }
    view(obj) {
        const objID = obj.id;
        if (this.currentObjId === objID)
            return;
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
                        head: range.endOffset
                    });
                }
            });
        }
    }
    editorStart(pageId) {
        this.ytext = this.db.objText(pageId);
        this.ele.append(this.renderControls(pageId), this.renderMetadataPanel(), this.renderToolbar(), this.editor = this.renderEditor());
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
                attributes: true
            });
            this.editor.data('observer', observer);
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
        if (this.editor) {
            const observer = this.editor.data('observer');
            if (observer)
                observer.disconnect();
        }
        this.ytext = null;
        this.ele.empty();
        this.currentObject = null;
        this.isReadOnly = false;
    }
    renderMetadataPanel() {
        if (!this.currentObject)
            return $('<div>');
        return $('<div>', {
            class: 'metadata-panel'
        }).append($('<div>', { class: 'metadata-row' }).append($('<span>', { text: 'Created: ' }), $('<span>', { text: new Date(this.currentObject.created).toLocaleString() })), $('<div>', { class: 'metadata-row' }).append($('<span>', { text: 'Last Updated: ' }), $('<span>', { text: new Date(this.currentObject.updated).toLocaleString() })), $('<div>', { class: 'metadata-row' }).append($('<span>', { text: 'Author: ' }), $('<span>', { text: this.currentObject.author })), $('<div>', { class: 'metadata-tags' }).append($('<span>', { text: 'Tags: ' }), this.renderTagsEditor()));
    }
    renderTagsEditor() {
        const tagsContainer = $('<div>', { class: 'tags-container' });
        if (!this.isReadOnly) {
            const addTagInput = $('<input>', {
                type: 'text',
                class: 'tag-input',
                placeholder: 'Add tag...'
            }).keypress(e => {
                if (e.key === 'Enter') {
                    const tag = $(e.target).val().toString().trim();
                    if (tag) {
                        this.currentObject.addTag(tag);
                        $(e.target).val('');
                        this.updateTagsDisplay(tagsContainer);
                    }
                }
            });
            tagsContainer.append(addTagInput);
        }
        this.updateTagsDisplay(tagsContainer);
        return tagsContainer;
    }
    updateTagsDisplay(container) {
        const tagsDiv = container.find('.tags-list') || $('<div>', { class: 'tags-list' });
        tagsDiv.empty();
        this.currentObject.tags.forEach(tag => {
            const tagElement = $('<span>', {
                class: 'tag',
                text: tag
            });
            if (!this.isReadOnly) {
                tagElement.append($('<button>', {
                    class: 'remove-tag',
                    text: '×'
                }).click(() => {
                    this.currentObject.removeTag(tag);
                    this.updateTagsDisplay(container);
                }));
            }
            tagsDiv.append(tagElement);
        });
        if (!container.find('.tags-list').length) {
            container.append(tagsDiv);
        }
    }
    renderEditor() {
        const content = this.ytext ? this.ytext.toString() : '';
        return $('<div>', {
            class: 'editor',
            contenteditable: !this.isReadOnly,
            spellcheck: true,
            html: content
        })
            .on('input', debounce(() => this.saveContent(), this.updatePeriodMS))
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
    renderToolbar() {
        if (this.isReadOnly)
            return $('<div>');
        const toolbar = $('<div>', { class: 'toolbar' });
        [
            { command: 'bold', icon: '𝐁', title: 'Bold' },
            { command: 'italic', icon: '𝐼', title: 'Italic' },
            { command: 'underline', icon: 'U', title: 'Underline' },
            { command: 'strikeThrough', icon: 'S', title: 'Strikethrough' },
            { command: 'insertOrderedList', icon: '1.', title: 'Ordered List' },
            { command: 'insertUnorderedList', icon: '•', title: 'Unordered List' },
            { command: 'insertLink', icon: '🔗', title: 'Insert Link' },
            { command: 'undo', icon: '↩️', title: 'Undo' },
            { command: 'redo', icon: '↪️', title: 'Redo' },
        ].forEach(({ command, icon, title }) => {
            $('<button>', {
                html: icon,
                title: title,
                disabled: this.isReadOnly
            }).click(e => {
                e.preventDefault();
                if (command === 'insertLink') {
                    const url = prompt('Enter the URL');
                    if (url)
                        document.execCommand(command, false, url);
                }
                else {
                    document.execCommand(command, false, null);
                }
            }).appendTo(toolbar);
        });
        return toolbar;
    }
    renderControls(pageId) {
        const page = this.db.get(pageId);
        if (!page)
            return $('<div>');
        const controls = $('<div>').addClass('editor-controls');
        // Title input
        controls.append(this.renderTitleInput(page, pageId));
        // Only show privacy toggle and template buttons if not read-only
        if (!this.isReadOnly) {
            controls.append(this.renderPrivacyToggle(page, pageId), this.renderTemplateButtons());
        }
        // Add read-only indicator if applicable
        if (this.isReadOnly) {
            controls.append($('<div>', {
                class: 'readonly-indicator',
                text: 'Read Only'
            }));
        }
        return controls;
    }
    renderTitleInput(page, pageId) {
        return $('<input>', {
            type: 'text',
            class: 'title-input',
            value: page.name,
            placeholder: 'Page Title',
            readonly: this.isReadOnly
        }).on('change', (e) => {
            if (!this.isReadOnly) {
                this.currentObject.name = $(e.target).val();
            }
        });
    }
    renderPrivacyToggle(page, pageId) {
        return $('<div>', { class: 'privacy-toggle' }).append($('<span>').text('Public'), $('<label>', { class: 'toggle-switch' }).append($('<input>', {
            type: 'checkbox',
            checked: page.public,
            disabled: this.isReadOnly
        }).on('change', e => {
            this.db.objPublic(pageId, e.target.checked);
            e.target.checked ?
                this.app.net.shareDocument(pageId) :
                this.app.net.unshareDocument(pageId);
        }), $('<span>', { class: 'toggle-slider' })));
    }
    renderTemplateButtons() {
        if (this.isReadOnly)
            return $('<div>');
        const templateButtons = $('<div>', { class: 'template-buttons' });
        [
            { icon: '📝', title: 'Note Template', template: 'note' },
            { icon: '📅', title: 'Meeting Template', template: 'meeting' },
            { icon: '✅', title: 'Todo Template', template: 'todo' },
            { icon: '📊', title: 'Report Template', template: 'report' }
        ].forEach(({ icon, title, template }) => {
            $('<button>', {
                class: 'template-button',
                text: icon,
                title: title,
                disabled: this.isReadOnly
            }).click(() => this.insertTemplate(template))
                .appendTo(templateButtons);
        });
        return templateButtons;
    }
    insertTemplate(template) {
        if (this.isReadOnly)
            return;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sQ0FBQyxNQUFNLFFBQVEsQ0FBQztBQUl2QixPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxvQkFBb0IsQ0FBQztBQUc1QixNQUFNLENBQUMsT0FBTyxPQUFPLE1BQU07SUFDTixFQUFFLENBQUs7SUFDUCxHQUFHLENBQU07SUFDVCxZQUFZLENBQVc7SUFDaEMsWUFBWSxDQUFTO0lBQ3JCLFFBQVEsQ0FBTTtJQUNkLEdBQUcsQ0FBUztJQUNaLEtBQUssQ0FBUTtJQUNiLGNBQWMsQ0FBUztJQUN2QixNQUFNLENBQVM7SUFDZixVQUFVLENBQVU7SUFDcEIsYUFBYSxDQUFTO0lBRTlCLFlBQVksR0FBVSxFQUFFLEVBQUssRUFBRSxZQUFxQixFQUFFLEdBQU87UUFDekQsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDYixJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztRQUNmLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxjQUFjLEdBQUcsR0FBRyxDQUFDO1FBQzFCLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO0lBQ25CLENBQUM7SUFFRCxXQUFXO1FBQ1AsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxVQUFVO1lBQUUsT0FBTztRQUNqRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ25DLElBQUksQ0FB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QUUsTUFBTSxFQUFDO1lBQ3JELEVBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBQztTQUM3RCxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUMsRUFBRSxFQUFFO1lBQ2xDLENBQUMsQ0FBQyxVQUFVLEVBQUU7Z0JBQ1YsS0FBSyxFQUFFLGlCQUFpQjtnQkFDeEIsSUFBSSxFQUFFLElBQUk7Z0JBQ1YsS0FBSyxFQUFFLEtBQUs7Z0JBQ1osUUFBUSxFQUFFLElBQUksQ0FBQyxVQUFVO2FBQzVCLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztpQkFDeEMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ25DLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxlQUFlLENBQUM7SUFDM0IsQ0FBQztJQUVELGNBQWMsQ0FBQyxRQUFlO1FBQzFCLElBQUksSUFBSSxDQUFDLFVBQVU7WUFBRSxPQUFPO1FBQzVCLElBQUksSUFBSSxHQUFHLFlBQVksQ0FBQztRQUN4QixRQUFRLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDcEQsQ0FBQztDQUNKO0FBQ0Q7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FxRkciLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJCBmcm9tIFwianF1ZXJ5XCI7XG5pbXBvcnQgREIgZnJvbSAnLi4vc3JjL2RiJ1xuaW1wb3J0IE5PYmplY3QgZnJvbSAnLi4vc3JjL29iaidcbmltcG9ydCBBcHAgZnJvbSAnLi9hcHAnXG5pbXBvcnQge2RlYm91bmNlfSBmcm9tIFwiLi4vc3JjL3V0aWwuanNcIjtcbmltcG9ydCAnL3VpL2Nzcy9lZGl0b3IuY3NzJztcbmltcG9ydCB7WVRleHR9IGZyb20gXCJ5anMvZGlzdC9zcmMvdHlwZXMvWVRleHRcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRWRpdG9yIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IGRiOiBEQjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFwcDogQXBwO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgZ2V0QXdhcmVuZXNzOiBGdW5jdGlvbjtcbiAgICBwcml2YXRlIGN1cnJlbnRPYmpJZDogc3RyaW5nO1xuICAgIHByaXZhdGUgcHJvdmlkZXI6IGFueTtcbiAgICBwcml2YXRlIGVsZTogSlF1ZXJ5O1xuICAgIHByaXZhdGUgeXRleHQ6IFlUZXh0O1xuICAgIHByaXZhdGUgdXBkYXRlUGVyaW9kTVM6IG51bWJlcjtcbiAgICBwcml2YXRlIGVkaXRvcjogSlF1ZXJ5O1xuICAgIHByaXZhdGUgaXNSZWFkT25seTogYm9vbGVhbjtcbiAgICBwcml2YXRlIGN1cnJlbnRPYmplY3Q6Tk9iamVjdDtcblxuICAgIGNvbnN0cnVjdG9yKGVsZTpKUXVlcnksIGRiOkRCLCBnZXRBd2FyZW5lc3M6RnVuY3Rpb24sIGFwcDpBcHApIHtcbiAgICAgICAgdGhpcy5kYiA9IGRiO1xuICAgICAgICB0aGlzLmFwcCA9IGFwcDtcbiAgICAgICAgdGhpcy5nZXRBd2FyZW5lc3MgPSBnZXRBd2FyZW5lc3M7XG4gICAgICAgIHRoaXMuY3VycmVudE9iaklkID0gJyc7XG4gICAgICAgIHRoaXMucHJvdmlkZXIgPSBudWxsO1xuICAgICAgICB0aGlzLnl0ZXh0ID0gbnVsbDtcbiAgICAgICAgdGhpcy51cGRhdGVQZXJpb2RNUyA9IDEwMDtcbiAgICAgICAgdGhpcy5lbGUgPSBlbGU7XG4gICAgfVxuXG4gICAgc2F2ZUNvbnRlbnQoKSB7XG4gICAgICAgIGlmICghdGhpcy5jdXJyZW50T2JqSWQgfHwgIXRoaXMueXRleHQgfHwgdGhpcy5pc1JlYWRPbmx5KSByZXR1cm47XG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSB0aGlzLmVkaXRvci5odG1sKCk7XG4gICAgICAgIHRoaXMuZGIuZG9jLnRyYW5zYWN0KCgpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRPYmplY3QpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB5dGV4dCA9IHRoaXMuY3VycmVudE9iamVjdC50ZXh0O1xuICAgICAgICAgICAgICAgIHl0ZXh0LmRlbGV0ZSgwLCB5dGV4dC5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIHl0ZXh0Lmluc2VydCgwLCBjb250ZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmlldyhvYmo6Tk9iamVjdCkge1xuICAgICAgICBjb25zdCBvYmpJRCA9IG9iai5pZDtcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudE9iaklkID09PSBvYmpJRCkgcmV0dXJuO1xuICAgICAgICB0aGlzLmVkaXRvclN0b3AoKTtcblxuICAgICAgICB0aGlzLmN1cnJlbnRPYmplY3QgPSBvYmo7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgY3VycmVudCB1c2VyIGlzIHRoZSBhdXRob3JcbiAgICAgICAgdGhpcy5pc1JlYWRPbmx5ID0gdGhpcy5jdXJyZW50T2JqZWN0LmF1dGhvciAhPT0gdGhpcy5hcHAuZGIudXNlcklEO1xuICAgICAgICB0aGlzLmN1cnJlbnRPYmpJZCA9IG9iaklEO1xuXG4gICAgICAgIHRoaXMuZWRpdG9yU3RhcnQob2JqSUQpO1xuXG4gICAgICAgIGNvbnN0IGF3YXJlbmVzcyA9IHRoaXMuZ2V0QXdhcmVuZXNzKCk7XG4gICAgICAgIGF3YXJlbmVzcy5zZXRMb2NhbFN0YXRlRmllbGQoJ2N1cnNvcicsIG51bGwpO1xuXG4gICAgICAgIGlmICghdGhpcy5pc1JlYWRPbmx5KSB7XG4gICAgICAgICAgICB0aGlzLmVkaXRvci5vbignc2VsZWN0JywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlbCA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VsIT09bnVsbCAmJiBzZWwucmFuZ2VDb3VudCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmFuZ2UgPSBzZWwuZ2V0UmFuZ2VBdCgwKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhcmVuZXNzLnNldExvY2FsU3RhdGVGaWVsZCgnY3Vyc29yJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5jaG9yOiByYW5nZS5zdGFydE9mZnNldCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlYWQ6IHJhbmdlLmVuZE9mZnNldFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGVkaXRvclN0YXJ0KHBhZ2VJZDpzdHJpbmcpOnZvaWQge1xuICAgICAgICB0aGlzLnl0ZXh0ID0gdGhpcy5kYi5vYmpUZXh0KHBhZ2VJZCk7XG5cbiAgICAgICAgdGhpcy5lbGUuYXBwZW5kKFxuICAgICAgICAgICAgdGhpcy5yZW5kZXJDb250cm9scyhwYWdlSWQpLFxuICAgICAgICAgICAgdGhpcy5yZW5kZXJNZXRhZGF0YVBhbmVsKCksXG4gICAgICAgICAgICB0aGlzLnJlbmRlclRvb2xiYXIoKSxcbiAgICAgICAgICAgIHRoaXMuZWRpdG9yID0gdGhpcy5yZW5kZXJFZGl0b3IoKVxuICAgICAgICApO1xuXG4gICAgICAgIGlmICghdGhpcy5pc1JlYWRPbmx5ICYmICF0aGlzLmVkaXRvci5kYXRhKCdvYnNlcnZlcicpKSB7XG4gICAgICAgICAgICBjb25zdCBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdGhpcy5lZGl0b3IuaHRtbCgpO1xuICAgICAgICAgICAgICAgIHRoaXMueXRleHQuZG9jLnRyYW5zYWN0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy55dGV4dC5kZWxldGUoMCwgdGhpcy55dGV4dC5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnl0ZXh0Lmluc2VydCgwLCBjb250ZW50KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBvYnNlcnZlci5vYnNlcnZlKHRoaXMuZWRpdG9yWzBdLCB7XG4gICAgICAgICAgICAgICAgY2hhcmFjdGVyRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjaGlsZExpc3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgc3VidHJlZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB0cnVlXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5lZGl0b3IuZGF0YSgnb2JzZXJ2ZXInLCBvYnNlcnZlcik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnl0ZXh0Lm9ic2VydmUoZXZlbnQgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudENvbnRlbnQgPSB0aGlzLmVkaXRvci5odG1sKCk7XG4gICAgICAgICAgICBjb25zdCB5Q29udGVudCA9IHRoaXMueXRleHQudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIGlmIChjdXJyZW50Q29udGVudCAhPT0geUNvbnRlbnQpXG4gICAgICAgICAgICAgICAgdGhpcy5lZGl0b3IuaHRtbCh5Q29udGVudCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGVkaXRvclN0b3AoKSB7XG4gICAgICAgIGlmICh0aGlzLnByb3ZpZGVyKSB7XG4gICAgICAgICAgICB0aGlzLnByb3ZpZGVyLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIHRoaXMucHJvdmlkZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmVkaXRvcikge1xuICAgICAgICAgICAgY29uc3Qgb2JzZXJ2ZXIgPSB0aGlzLmVkaXRvci5kYXRhKCdvYnNlcnZlcicpO1xuICAgICAgICAgICAgaWYgKG9ic2VydmVyKSBvYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy55dGV4dCA9IG51bGw7XG4gICAgICAgIHRoaXMuZWxlLmVtcHR5KCk7XG4gICAgICAgIHRoaXMuY3VycmVudE9iamVjdCA9IG51bGw7XG4gICAgICAgIHRoaXMuaXNSZWFkT25seSA9IGZhbHNlO1xuICAgIH1cblxuICAgIHJlbmRlck1ldGFkYXRhUGFuZWwoKTpKUXVlcnkge1xuICAgICAgICBpZiAoIXRoaXMuY3VycmVudE9iamVjdCkgcmV0dXJuICQoJzxkaXY+Jyk7XG5cbiAgICAgICAgcmV0dXJuICQoJzxkaXY+Jywge1xuICAgICAgICAgICAgY2xhc3M6ICdtZXRhZGF0YS1wYW5lbCdcbiAgICAgICAgfSkuYXBwZW5kKFxuICAgICAgICAgICAgJCgnPGRpdj4nLCB7IGNsYXNzOiAnbWV0YWRhdGEtcm93JyB9KS5hcHBlbmQoXG4gICAgICAgICAgICAgICAgJCgnPHNwYW4+JywgeyB0ZXh0OiAnQ3JlYXRlZDogJyB9KSxcbiAgICAgICAgICAgICAgICAkKCc8c3Bhbj4nLCB7IHRleHQ6IG5ldyBEYXRlKHRoaXMuY3VycmVudE9iamVjdC5jcmVhdGVkKS50b0xvY2FsZVN0cmluZygpIH0pXG4gICAgICAgICAgICApLFxuICAgICAgICAgICAgJCgnPGRpdj4nLCB7IGNsYXNzOiAnbWV0YWRhdGEtcm93JyB9KS5hcHBlbmQoXG4gICAgICAgICAgICAgICAgJCgnPHNwYW4+JywgeyB0ZXh0OiAnTGFzdCBVcGRhdGVkOiAnIH0pLFxuICAgICAgICAgICAgICAgICQoJzxzcGFuPicsIHsgdGV4dDogbmV3IERhdGUodGhpcy5jdXJyZW50T2JqZWN0LnVwZGF0ZWQpLnRvTG9jYWxlU3RyaW5nKCkgfSlcbiAgICAgICAgICAgICksXG4gICAgICAgICAgICAkKCc8ZGl2PicsIHsgY2xhc3M6ICdtZXRhZGF0YS1yb3cnIH0pLmFwcGVuZChcbiAgICAgICAgICAgICAgICAkKCc8c3Bhbj4nLCB7IHRleHQ6ICdBdXRob3I6ICcgfSksXG4gICAgICAgICAgICAgICAgJCgnPHNwYW4+JywgeyB0ZXh0OiB0aGlzLmN1cnJlbnRPYmplY3QuYXV0aG9yIH0pXG4gICAgICAgICAgICApLFxuICAgICAgICAgICAgJCgnPGRpdj4nLCB7IGNsYXNzOiAnbWV0YWRhdGEtdGFncycgfSkuYXBwZW5kKFxuICAgICAgICAgICAgICAgICQoJzxzcGFuPicsIHsgdGV4dDogJ1RhZ3M6ICcgfSksXG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJUYWdzRWRpdG9yKClcbiAgICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICByZW5kZXJUYWdzRWRpdG9yKCk6SlF1ZXJ5IHtcbiAgICAgICAgY29uc3QgdGFnc0NvbnRhaW5lciA9ICQoJzxkaXY+JywgeyBjbGFzczogJ3RhZ3MtY29udGFpbmVyJyB9KTtcblxuICAgICAgICBpZiAoIXRoaXMuaXNSZWFkT25seSkge1xuICAgICAgICAgICAgY29uc3QgYWRkVGFnSW5wdXQgPSAkKCc8aW5wdXQ+Jywge1xuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcbiAgICAgICAgICAgICAgICBjbGFzczogJ3RhZy1pbnB1dCcsXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6ICdBZGQgdGFnLi4uJ1xuICAgICAgICAgICAgfSkua2V5cHJlc3MoZSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGUua2V5ID09PSAnRW50ZXInKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhZyA9ICQoZS50YXJnZXQpLnZhbCgpLnRvU3RyaW5nKCkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGFnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRPYmplY3QuYWRkVGFnKHRhZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGUudGFyZ2V0KS52YWwoJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVUYWdzRGlzcGxheSh0YWdzQ29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGFnc0NvbnRhaW5lci5hcHBlbmQoYWRkVGFnSW5wdXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51cGRhdGVUYWdzRGlzcGxheSh0YWdzQ29udGFpbmVyKTtcbiAgICAgICAgcmV0dXJuIHRhZ3NDb250YWluZXI7XG4gICAgfVxuXG4gICAgdXBkYXRlVGFnc0Rpc3BsYXkoY29udGFpbmVyOkpRdWVyeSkge1xuICAgICAgICBjb25zdCB0YWdzRGl2ID0gY29udGFpbmVyLmZpbmQoJy50YWdzLWxpc3QnKSB8fCAkKCc8ZGl2PicsIHsgY2xhc3M6ICd0YWdzLWxpc3QnIH0pO1xuICAgICAgICB0YWdzRGl2LmVtcHR5KCk7XG5cbiAgICAgICAgdGhpcy5jdXJyZW50T2JqZWN0LnRhZ3MuZm9yRWFjaCh0YWcgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGFnRWxlbWVudCA9ICQoJzxzcGFuPicsIHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ3RhZycsXG4gICAgICAgICAgICAgICAgdGV4dDogdGFnXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLmlzUmVhZE9ubHkpIHtcbiAgICAgICAgICAgICAgICB0YWdFbGVtZW50LmFwcGVuZChcbiAgICAgICAgICAgICAgICAgICAgJCgnPGJ1dHRvbj4nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczogJ3JlbW92ZS10YWcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogJ8OXJ1xuICAgICAgICAgICAgICAgICAgICB9KS5jbGljaygoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRPYmplY3QucmVtb3ZlVGFnKHRhZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVRhZ3NEaXNwbGF5KGNvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGFnc0Rpdi5hcHBlbmQodGFnRWxlbWVudCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghY29udGFpbmVyLmZpbmQoJy50YWdzLWxpc3QnKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lci5hcHBlbmQodGFnc0Rpdik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZW5kZXJFZGl0b3IoKTpKUXVlcnkge1xuICAgICAgICBjb25zdCBjb250ZW50ID0gdGhpcy55dGV4dCA/IHRoaXMueXRleHQudG9TdHJpbmcoKSA6ICcnO1xuICAgICAgICByZXR1cm4gJCgnPGRpdj4nLCB7XG4gICAgICAgICAgICBjbGFzczogJ2VkaXRvcicsXG4gICAgICAgICAgICBjb250ZW50ZWRpdGFibGU6ICF0aGlzLmlzUmVhZE9ubHksXG4gICAgICAgICAgICBzcGVsbGNoZWNrOiB0cnVlLFxuICAgICAgICAgICAgaHRtbDogY29udGVudFxuICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKCdpbnB1dCcsIGRlYm91bmNlKCgpID0+IHRoaXMuc2F2ZUNvbnRlbnQoKSwgdGhpcy51cGRhdGVQZXJpb2RNUykpXG4gICAgICAgICAgICAub24oJ2tleWRvd24nLCBlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaXNSZWFkT25seSAmJiAoZS5jdHJsS2V5IHx8IGUubWV0YUtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChlLmtleS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdiJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2JvbGQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2knOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5leGVjQ29tbWFuZCgnaXRhbGljJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICd1JzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ3VuZGVybGluZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVuZGVyVG9vbGJhcigpOkpRdWVyeSB7XG4gICAgICAgIGlmICh0aGlzLmlzUmVhZE9ubHkpIHJldHVybiAkKCc8ZGl2PicpO1xuXG4gICAgICAgIGNvbnN0IHRvb2xiYXIgPSAkKCc8ZGl2PicsIHsgY2xhc3M6ICd0b29sYmFyJyB9KTtcbiAgICAgICAgW1xuICAgICAgICAgICAge2NvbW1hbmQ6ICdib2xkJywgaWNvbjogJ/CdkIEnLCB0aXRsZTogJ0JvbGQnfSxcbiAgICAgICAgICAgIHtjb21tYW5kOiAnaXRhbGljJywgaWNvbjogJ/CdkLwnLCB0aXRsZTogJ0l0YWxpYyd9LFxuICAgICAgICAgICAge2NvbW1hbmQ6ICd1bmRlcmxpbmUnLCBpY29uOiAnVScsIHRpdGxlOiAnVW5kZXJsaW5lJ30sXG4gICAgICAgICAgICB7Y29tbWFuZDogJ3N0cmlrZVRocm91Z2gnLCBpY29uOiAnUycsIHRpdGxlOiAnU3RyaWtldGhyb3VnaCd9LFxuICAgICAgICAgICAge2NvbW1hbmQ6ICdpbnNlcnRPcmRlcmVkTGlzdCcsIGljb246ICcxLicsIHRpdGxlOiAnT3JkZXJlZCBMaXN0J30sXG4gICAgICAgICAgICB7Y29tbWFuZDogJ2luc2VydFVub3JkZXJlZExpc3QnLCBpY29uOiAn4oCiJywgdGl0bGU6ICdVbm9yZGVyZWQgTGlzdCd9LFxuICAgICAgICAgICAge2NvbW1hbmQ6ICdpbnNlcnRMaW5rJywgaWNvbjogJ/CflJcnLCB0aXRsZTogJ0luc2VydCBMaW5rJ30sXG4gICAgICAgICAgICB7Y29tbWFuZDogJ3VuZG8nLCBpY29uOiAn4oap77iPJywgdGl0bGU6ICdVbmRvJ30sXG4gICAgICAgICAgICB7Y29tbWFuZDogJ3JlZG8nLCBpY29uOiAn4oaq77iPJywgdGl0bGU6ICdSZWRvJ30sXG4gICAgICAgIF0uZm9yRWFjaCgoeyBjb21tYW5kLCBpY29uLCB0aXRsZSB9KSA9PiB7XG4gICAgICAgICAgICAkKCc8YnV0dG9uPicsIHtcbiAgICAgICAgICAgICAgICBodG1sOiBpY29uLFxuICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgICAgICAgICBkaXNhYmxlZDogdGhpcy5pc1JlYWRPbmx5XG4gICAgICAgICAgICB9KS5jbGljayhlID0+IHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbW1hbmQgPT09ICdpbnNlcnRMaW5rJykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBwcm9tcHQoJ0VudGVyIHRoZSBVUkwnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVybCkgZG9jdW1lbnQuZXhlY0NvbW1hbmQoY29tbWFuZCwgZmFsc2UsIHVybCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoY29tbWFuZCwgZmFsc2UsIG51bGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmFwcGVuZFRvKHRvb2xiYXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRvb2xiYXI7XG4gICAgfVxuXG4gICAgcmVuZGVyQ29udHJvbHMocGFnZUlkOnN0cmluZyk6SlF1ZXJ5IHtcbiAgICAgICAgY29uc3QgcGFnZSA9IHRoaXMuZGIuZ2V0KHBhZ2VJZCk7XG4gICAgICAgIGlmICghcGFnZSkgcmV0dXJuICQoJzxkaXY+Jyk7XG5cbiAgICAgICAgY29uc3QgY29udHJvbHMgPSAkKCc8ZGl2PicpLmFkZENsYXNzKCdlZGl0b3ItY29udHJvbHMnKTtcblxuICAgICAgICAvLyBUaXRsZSBpbnB1dFxuICAgICAgICBjb250cm9scy5hcHBlbmQodGhpcy5yZW5kZXJUaXRsZUlucHV0KHBhZ2UsIHBhZ2VJZCkpO1xuXG4gICAgICAgIC8vIE9ubHkgc2hvdyBwcml2YWN5IHRvZ2dsZSBhbmQgdGVtcGxhdGUgYnV0dG9ucyBpZiBub3QgcmVhZC1vbmx5XG4gICAgICAgIGlmICghdGhpcy5pc1JlYWRPbmx5KSB7XG4gICAgICAgICAgICBjb250cm9scy5hcHBlbmQoXG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJQcml2YWN5VG9nZ2xlKHBhZ2UsIHBhZ2VJZCksXG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJUZW1wbGF0ZUJ1dHRvbnMoKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCByZWFkLW9ubHkgaW5kaWNhdG9yIGlmIGFwcGxpY2FibGVcbiAgICAgICAgaWYgKHRoaXMuaXNSZWFkT25seSkge1xuICAgICAgICAgICAgY29udHJvbHMuYXBwZW5kKFxuICAgICAgICAgICAgICAgICQoJzxkaXY+Jywge1xuICAgICAgICAgICAgICAgICAgICBjbGFzczogJ3JlYWRvbmx5LWluZGljYXRvcicsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6ICdSZWFkIE9ubHknXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY29udHJvbHM7XG4gICAgfVxuXG4gICAgcmVuZGVyVGl0bGVJbnB1dChwYWdlLCBwYWdlSWQ6c3RyaW5nKTpKUXVlcnkge1xuICAgICAgICByZXR1cm4gJCgnPGlucHV0PicsIHtcbiAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcbiAgICAgICAgICAgIGNsYXNzOiAndGl0bGUtaW5wdXQnLFxuICAgICAgICAgICAgdmFsdWU6IHBhZ2UubmFtZSxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnUGFnZSBUaXRsZScsXG4gICAgICAgICAgICByZWFkb25seTogdGhpcy5pc1JlYWRPbmx5XG4gICAgICAgIH0pLm9uKCdjaGFuZ2UnLCAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmlzUmVhZE9ubHkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRPYmplY3QubmFtZSA9ICQoZS50YXJnZXQpLnZhbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZW5kZXJQcml2YWN5VG9nZ2xlKHBhZ2UsIHBhZ2VJZDpzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuICQoJzxkaXY+Jywge2NsYXNzOiAncHJpdmFjeS10b2dnbGUnfSkuYXBwZW5kKFxuICAgICAgICAgICAgJCgnPHNwYW4+JykudGV4dCgnUHVibGljJyksXG4gICAgICAgICAgICAkKCc8bGFiZWw+Jywge2NsYXNzOiAndG9nZ2xlLXN3aXRjaCd9KS5hcHBlbmQoXG4gICAgICAgICAgICAgICAgJCgnPGlucHV0PicsIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrYm94JyxcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tlZDogcGFnZS5wdWJsaWMsXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiB0aGlzLmlzUmVhZE9ubHlcbiAgICAgICAgICAgICAgICB9KS5vbignY2hhbmdlJywgZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGIub2JqUHVibGljKHBhZ2VJZCwgZS50YXJnZXQuY2hlY2tlZCk7XG4gICAgICAgICAgICAgICAgICAgIGUudGFyZ2V0LmNoZWNrZWQgP1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHAubmV0LnNoYXJlRG9jdW1lbnQocGFnZUlkKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcC5uZXQudW5zaGFyZURvY3VtZW50KHBhZ2VJZCk7XG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgJCgnPHNwYW4+Jywge2NsYXNzOiAndG9nZ2xlLXNsaWRlcid9KVxuICAgICAgICAgICAgKVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHJlbmRlclRlbXBsYXRlQnV0dG9ucygpOkpRdWVyeSB7XG4gICAgICAgIGlmICh0aGlzLmlzUmVhZE9ubHkpIHJldHVybiAkKCc8ZGl2PicpO1xuXG4gICAgICAgIGNvbnN0IHRlbXBsYXRlQnV0dG9ucyA9ICQoJzxkaXY+Jywge2NsYXNzOiAndGVtcGxhdGUtYnV0dG9ucyd9KTtcbiAgICAgICAgW1xuICAgICAgICAgICAge2ljb246ICfwn5OdJywgdGl0bGU6ICdOb3RlIFRlbXBsYXRlJywgdGVtcGxhdGU6ICdub3RlJ30sXG4gICAgICAgICAgICB7aWNvbjogJ/Cfk4UnLCB0aXRsZTogJ01lZXRpbmcgVGVtcGxhdGUnLCB0ZW1wbGF0ZTogJ21lZXRpbmcnfSxcbiAgICAgICAgICAgIHtpY29uOiAn4pyFJywgdGl0bGU6ICdUb2RvIFRlbXBsYXRlJywgdGVtcGxhdGU6ICd0b2RvJ30sXG4gICAgICAgICAgICB7aWNvbjogJ/Cfk4onLCB0aXRsZTogJ1JlcG9ydCBUZW1wbGF0ZScsIHRlbXBsYXRlOiAncmVwb3J0J31cbiAgICAgICAgXS5mb3JFYWNoKCh7aWNvbiwgdGl0bGUsIHRlbXBsYXRlfSkgPT4ge1xuICAgICAgICAgICAgJCgnPGJ1dHRvbj4nLCB7XG4gICAgICAgICAgICAgICAgY2xhc3M6ICd0ZW1wbGF0ZS1idXR0b24nLFxuICAgICAgICAgICAgICAgIHRleHQ6IGljb24sXG4gICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICAgICAgICAgIGRpc2FibGVkOiB0aGlzLmlzUmVhZE9ubHlcbiAgICAgICAgICAgIH0pLmNsaWNrKCgpID0+IHRoaXMuaW5zZXJ0VGVtcGxhdGUodGVtcGxhdGUpKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRUbyh0ZW1wbGF0ZUJ1dHRvbnMpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlQnV0dG9ucztcbiAgICB9XG5cbiAgICBpbnNlcnRUZW1wbGF0ZSh0ZW1wbGF0ZTpzdHJpbmcpOnZvaWQge1xuICAgICAgICBpZiAodGhpcy5pc1JlYWRPbmx5KSByZXR1cm47XG4gICAgICAgIGxldCBodG1sID0gJzxURU1QTEFURT4nO1xuICAgICAgICBkb2N1bWVudC5leGVjQ29tbWFuZCgnaW5zZXJ0SFRNTCcsIGZhbHNlLCBodG1sKTtcbiAgICB9XG59XG4vKlxuVE9ET1xuXG5pbXBvcnQgKiBhcyBZIGZyb20gJ3lqcyc7XG5pbXBvcnQgeyBBd2FyZW5lc3MgfSBmcm9tICd5LXByb3RvY29scy9hd2FyZW5lc3MnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFZGl0b3Ige1xuICAgIC8vIC4uLiBleGlzdGluZyBjb2RlIC4uLlxuXG4gICAgcHJpdmF0ZSBhd2FyZW5lc3M6IEF3YXJlbmVzcztcblxuICAgIGNvbnN0cnVjdG9yKGVsZTogSlF1ZXJ5LCBkYjogREIsIGdldEF3YXJlbmVzczogRnVuY3Rpb24sIGFwcDogQXBwKSB7XG4gICAgICAgIC8vIC4uLiBleGlzdGluZyBjb2RlIC4uLlxuICAgICAgICB0aGlzLmF3YXJlbmVzcyA9IGdldEF3YXJlbmVzcygpO1xuICAgICAgICB0aGlzLnNldHVwQXdhcmVuZXNzKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzZXR1cEF3YXJlbmVzcygpIHtcbiAgICAgICAgLy8gTGlzdGVuIGZvciBsb2NhbCBjdXJzb3IgY2hhbmdlc1xuICAgICAgICB0aGlzLmVkaXRvci5vbignbW91c2V1cCBrZXl1cCcsICgpID0+IHRoaXMudXBkYXRlTG9jYWxDdXJzb3IoKSk7XG5cbiAgICAgICAgLy8gTGlzdGVuIGZvciBhd2FyZW5lc3MgdXBkYXRlc1xuICAgICAgICB0aGlzLmF3YXJlbmVzcy5vbignY2hhbmdlJywgKCkgPT4gdGhpcy5yZW5kZXJSZW1vdGVDdXJzb3JzKCkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgdXBkYXRlTG9jYWxDdXJzb3IoKSB7XG4gICAgICAgIGNvbnN0IHNlbCA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKTtcbiAgICAgICAgaWYgKHNlbCAmJiBzZWwucmFuZ2VDb3VudCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHJhbmdlID0gc2VsLmdldFJhbmdlQXQoMCk7XG4gICAgICAgICAgICB0aGlzLmF3YXJlbmVzcy5zZXRMb2NhbFN0YXRlRmllbGQoJ2N1cnNvcicsIHtcbiAgICAgICAgICAgICAgICBhbmNob3I6IHJhbmdlLnN0YXJ0T2Zmc2V0LFxuICAgICAgICAgICAgICAgIGhlYWQ6IHJhbmdlLmVuZE9mZnNldCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSByZW5kZXJSZW1vdGVDdXJzb3JzKCkge1xuICAgICAgICBjb25zdCBzdGF0ZXMgPSB0aGlzLmF3YXJlbmVzcy5nZXRTdGF0ZXMoKTtcbiAgICAgICAgc3RhdGVzLmZvckVhY2goKHN0YXRlLCBjbGllbnRJZCkgPT4ge1xuICAgICAgICAgICAgaWYgKGNsaWVudElkID09PSB0aGlzLmF3YXJlbmVzcy5jbGllbnRJRCkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKHN0YXRlLmN1cnNvcikge1xuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyQ3Vyc29yKHN0YXRlLmN1cnNvciwgc3RhdGUudXNlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgcmVuZGVyQ3Vyc29yKGN1cnNvckRhdGEsIHVzZXIpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGV4aXN0aW5nIGN1cnNvciBlbGVtZW50cyBmb3IgdGhpcyB1c2VyXG4gICAgICAgIHRoaXMuZWRpdG9yLmZpbmQoYC5yZW1vdGUtY3Vyc29yLSR7dXNlci5pZH1gKS5yZW1vdmUoKTtcblxuICAgICAgICAvLyBDcmVhdGUgYSBuZXcgY3Vyc29yIGVsZW1lbnRcbiAgICAgICAgY29uc3QgY3Vyc29yRWxlID0gJCgnPHNwYW4+Jywge1xuICAgICAgICAgICAgY2xhc3M6IGByZW1vdGUtY3Vyc29yIHJlbW90ZS1jdXJzb3ItJHt1c2VyLmlkfWAsXG4gICAgICAgICAgICBjc3M6IHtcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IHVzZXIuY29sb3IsXG4gICAgICAgICAgICAgICAgd2lkdGg6ICcycHgnLFxuICAgICAgICAgICAgICAgIGhlaWdodDogJzFlbScsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQb3NpdGlvbiB0aGUgY3Vyc29yIGluIHRoZSBlZGl0b3JcbiAgICAgICAgLy8gKFlvdSdsbCBuZWVkIHRvIG1hcCBjdXJzb3JEYXRhLmFuY2hvciB0byBhIHBvc2l0aW9uIGluIHRoZSBET00pXG4gICAgICAgIC8vIEZvciBzaW1wbGljaXR5LCBoZXJlJ3MgYSBwbGFjZWhvbGRlciBpbXBsZW1lbnRhdGlvbjpcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSB0aGlzLmdldFBvc2l0aW9uRnJvbU9mZnNldChjdXJzb3JEYXRhLmFuY2hvcik7XG4gICAgICAgIGN1cnNvckVsZS5jc3MoeyBsZWZ0OiBwb3NpdGlvbi5sZWZ0LCB0b3A6IHBvc2l0aW9uLnRvcCB9KTtcblxuICAgICAgICB0aGlzLmVkaXRvci5hcHBlbmQoY3Vyc29yRWxlKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldFBvc2l0aW9uRnJvbU9mZnNldChvZmZzZXQ6IG51bWJlcikge1xuICAgICAgICAvLyBJbXBsZW1lbnQgYSBtZXRob2QgdG8gY29udmVydCB0ZXh0IG9mZnNldCB0byB4LHkgY29vcmRpbmF0ZXNcbiAgICAgICAgLy8gVGhpcyBjYW4gYmUgY29tcGxleCBkZXBlbmRpbmcgb24geW91ciBlZGl0b3IncyBpbXBsZW1lbnRhdGlvblxuICAgICAgICByZXR1cm4geyBsZWZ0OiAwLCB0b3A6IDAgfTsgLy8gUGxhY2Vob2xkZXJcbiAgICB9XG5cbiAgICAvLyAuLi4gZXhpc3RpbmcgY29kZSAuLi5cbn1cblxuLy8gSW4gZWRpdG9yLmNzc1xuXG4ucmVtb3RlLWN1cnNvciB7XG4gICAgcG9pbnRlci1ldmVudHM6IG5vbmU7XG4gICAgei1pbmRleDogMTA7XG59XG4gKi9cbiJdfQ==