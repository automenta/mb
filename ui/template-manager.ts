import $ from 'jquery';

export class TemplateManager {
  constructor(private readonly isReadOnly: boolean) {}

  insertTemplate(template: string): void {
    if (this.isReadOnly) return;
    let html = '';
    switch (template) {
      case 'note':
        html = '<h1>Note</h1><p>Content...</p>';
        break;
      case 'meeting':
        html = '<h1>Meeting</h1><h2>Attendees</h2><ul><li></li></ul><h2>Agenda</h2><ol><li></li></ol>';
        break;
      case 'todo':
        html = '<h1>Todo</h1><ul><li><input type="checkbox"> Item 1</li></ul>';
        break;
      case 'report':
        html = '<h1>Report</h1><h2>Summary</h2><p></p><h2>Details</h2><p></p>';
        break;
      default:
        html = '<p>Invalid template</p>';
    }
    document.execCommand('insertHTML', false, html);
  }
}