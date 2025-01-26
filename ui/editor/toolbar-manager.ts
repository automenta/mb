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
    { command: 'bold', icon: '<b>B</b>', title: 'Bold', action: (editor) => editor.formatText('bold') },
    { command: 'italic', icon: '<i>I</i>', title: 'Italic', action: (editor) => editor.formatText('italic') },
    { command: 'underline', icon: '<u>U</u>', title: 'Underline', action: (editor) => editor.formatText('underline') },
    { command: 'strikeThrough', icon: '<del>S</del>', title: 'Strikethrough', action: (editor) => editor.formatText('strikeThrough') },
    { command: 'insertOrderedList', icon: 'list-ol', title: 'Ordered List', action: (editor) => editor.formatText('insertOrderedList') }, // Changed icon to class name
    { command: 'insertUnorderedList', icon: 'list-ul', title: 'Unordered List', action: (editor) => editor.formatText('insertUnorderedList') }, // Changed icon to class name
    { command: 'heading1', icon: 'H1', title: 'Heading 1', action: (editor) => editor.setBlockFormat('<h1>') },
    { command: 'heading2', icon: 'H2', title: 'Heading 2', action: (editor) => editor.setBlockFormat('<h2>') },
    { command: 'heading3', icon: 'H3', title: 'Heading 3', action: (editor) => editor.setBlockFormat('<h3>') },
    { command: 'heading4', icon: 'H4', title: 'Heading 4', action: (editor) => editor.setBlockFormat('<h4>') },
    { command: 'heading5', icon: 'H5', title: 'Heading 5', action: (editor) => editor.setBlockFormat('<h5>') },
    { command: 'heading6', icon: 'H6', title: 'Heading 6', action: (editor) => editor.setBlockFormat('<h6>') },
    { command: 'formatBlockquote', icon: 'blockquote', title: 'Quote Block', action: (editor) => editor.setBlockFormat('<blockquote>') }, // Changed icon to class name
    { command: 'insertCode', icon: 'code', title: 'Code Block', action: (editor) => editor.setBlockFormat('<pre>') }, // Changed icon to class name
    {
      command: 'insertLink',
      icon: 'link',
      title: 'Insert Link',
      action: (editor) => {
              const url = prompt('Enter the URL');
              if (url) document.execCommand('createLink', false, url);
            },
    },
    { command: 'undo', icon: 'undo', title: 'Undo', action: (editor) => editor.formatText('undo') }, // Changed icon to class name
    { command: 'redo', icon: 'redo', title: 'Redo', action: (editor) => editor.formatText('redo') }, // Changed icon to class name
    { command: 'toggleDarkMode', icon: 'dark-mode', title: 'Toggle Dark Mode', action: (editor) => editor.toggleDarkMode() }, // Changed icon to class name
  ];


  constructor(private editor: Editor) {}
render() {
  const toolbar = $('<div class="editor-toolbar"></div>');
  this.toolbarItems.forEach((item) => {
    const icon = typeof item.icon === 'function' ? item.icon() : item.icon;
    const button = $('<button>', {
      class: `toolbar-button toolbar-button-${item.command}`, // Added class for styling
      title: item.title,
    });
    if (typeof item.icon === 'string' && item.icon.length > 2) {
      $('<i>', { class: `icon-${item.icon}` }).appendTo(button); // Use <i> tag for icon classes
    } else {
      button.html(icon); // For text-based icons (like H1, H2 etc)
    }
    button.on('click', () => item.action(this.editor));
    toolbar.append(button);
  });
  return toolbar;
}

init(root: JQuery) {
  root.append(this.render());
}
}