import $ from 'jquery';
import Editor from './editor'

interface ToolbarItem {
  command: string;
  icon: string | (() => string);
  title: string;
  action: (editor: Editor) => void;
}

export class ToolbarManager {
  private toolbarItems: ToolbarItem[] = [
    { command: 'save', icon: '💾', title: 'Save', action: (editor) => editor.saveDocument() },
    { command: 'privacy', icon: () => (this.editor.isPublic ? '🔓' : '🔒'), title: 'Toggle Privacy', action: (editor) => editor.togglePrivacy() },
    { command: 'bold', icon: '𝐁', title: 'Bold', action: (editor) => editor.formatText('bold') },
    { command: 'italic', icon: '𝐼', title: 'Italic', action: (editor) => editor.formatText('italic') },
    { command: 'underline', icon: 'U', title: 'Underline', action: (editor) => editor.formatText('underline') },
    { command: 'strikeThrough', icon: 'S', title: 'Strikethrough', action: (editor) => editor.formatText('strikeThrough') },
    { command: 'insertOrderedList', icon: '1.', title: 'Ordered List', action: (editor) => editor.formatText('insertOrderedList') },
    { command: 'insertUnorderedList', icon: '•', title: 'Unordered List', action: (editor) => editor.formatText('insertUnorderedList') },
    { command: 'heading1', icon: 'H1', title: 'Heading 1', action: (editor) => editor.formatText('heading1') },
    { command: 'heading2', icon: 'H2', title: 'Heading 2', action: (editor) => editor.formatText('heading2') },
    { command: 'heading3', icon: 'H3', title: 'Heading 3', action: (editor) => editor.formatText('heading3') },
    { command: 'insertCode', icon: '{}', title: 'Code Block', action: (editor) => editor.formatText('insertCode') },
    {
      command: 'insertLink',
      icon: '🔗',
      title: 'Insert Link',
      action: (editor) => {
              const url = prompt('Enter the URL');
              if (url) document.execCommand('createLink', false, url);
            },
    },
    { command: 'undo', icon: '↩️', title: 'Undo', action: (editor) => editor.formatText('undo') },
    { command: 'redo', icon: '↪️', title: 'Redo', action: (editor) => editor.formatText('redo') },
    { command: 'toggleDarkMode', icon: '🌙', title: 'Toggle Dark Mode', action: (editor) => editor.toggleDarkMode() },
  ];

  constructor(private editor: Editor) {}

  render() {
    const toolbar = $('<div class="toolbar"></div>');
    this.toolbarItems.forEach((item) => {
      const icon = typeof item.icon === 'function' ? item.icon() : item.icon;
      const button = $(`<button title="${item.title}">${icon}</button>`);
      button.on('click', () => item.action(this.editor));
      toolbar.append(button);
    });
    return toolbar.prop('outerHTML');
  }

  init(root: JQuery) {
    root.append(this.render());
  }
}