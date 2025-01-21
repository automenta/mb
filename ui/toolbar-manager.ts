import $ from 'jquery';
import App from './app';

interface BasicToolbarItem {
  command: string;
  icon: string;
  title: string;
}

export class ToolbarManager {
  private toolbar: JQuery;

  constructor(private readonly isReadOnly: boolean, private readonly app: App) {
    this.toolbar = this.createToolbar();
  }

  private createToolbar(): JQuery {
    if (this.isReadOnly) return $('<div>');

    const toolbar = $('<div>', { class: 'toolbar' });
    const items: BasicToolbarItem[] = [
      { command: 'bold', icon: '𝐁', title: 'Bold' },
      { command: 'italic', icon: '𝐼', title: 'Italic' },
      { command: 'underline', icon: 'U', title: 'Underline' },
      { command: 'strikeThrough', icon: 'S', title: 'Strikethrough' },
      { command: 'insertOrderedList', icon: '1.', title: 'Ordered List' },
      { command: 'insertUnorderedList', icon: '•', title: 'Unordered List' },
      { command: 'insertLink', icon: '🔗', title: 'Insert Link' },
      { command: 'undo', icon: '↩️', title: 'Undo' },
      { command: 'redo', icon: '↪️', title: 'Redo' },
      { command: 'toggleDarkMode', icon: '🌙', title: 'Toggle Dark Mode' },
    ];

    items.forEach(({ command, icon, title }) => {
      $('<button>', {
        html: icon,
        title: title,
        disabled: this.isReadOnly,
      })
        .click(e => {
          e.preventDefault();
          if (command === 'insertLink') {
            const url = prompt('Enter the URL');
            if (url) document.execCommand(command, false, url);
          } else if (command === 'toggleDarkMode') {
            this.app.toggleDarkMode();
          } else {
            document.execCommand(command, false, null);
          }
        })
        .appendTo(toolbar);
    });
    return toolbar;
  }

  getToolbarElement(): JQuery {
    return this.toolbar;
  }
}