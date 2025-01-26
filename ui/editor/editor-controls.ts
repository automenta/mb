import $ from 'jquery'
import DB from '../../src/db';
import NObject from '../../src/obj';

interface EditorControlsConfig {
  ele: JQuery;
  db: DB;
  isReadOnly: boolean;
  currentObject: NObject;
}

export default class EditorControls {
  constructor(private readonly config: EditorControlsConfig) {}

  render(): JQuery {
    const { db, isReadOnly, currentObject } = this.config;
    const controls = $('<div>').addClass('editor-controls');

    // Title input
    controls.append(this.renderTitleInput());

    // Only show privacy toggle and template buttons if not read-only
    if (!isReadOnly) controls.append(this.renderPrivacyToggle(), this.renderTemplateButtons());

    // Add read-only indicator if applicable
    if (isReadOnly) controls.append($('<div>', { class: 'readonly-indicator', text: 'Read Only' }));

    return controls;
  }

  private renderTitleInput(): JQuery {
    return $('<input>', {
      type: 'text',
      class: 'title-input',
      value: this.config.currentObject.name,
      placeholder: 'Page Title',
      readonly: this.config.isReadOnly,
    }).on('change', (e) => {
      if (!this.config.isReadOnly) {
        this.config.currentObject.name = $(e.target).val() as string;
      }
    });
  }

  private renderPrivacyToggle(): JQuery {
    const { db, currentObject, isReadOnly } = this.config;
    return $('<div>', { class: 'privacy-toggle' }).append(
      $('<span>').text('Public'),
      $('<label>', { class: 'toggle-switch' }).append(
        $('<input>', {
          type: 'checkbox',
          checked: currentObject.public,
          disabled: isReadOnly,
        }).on('change', (e) => {
          const checked = (e.target as HTMLInputElement).checked;
          db.objPublic(currentObject.id, checked);
          // Add logic to share/unshare document based on checked status
        }),
        $('<span>', { class: 'toggle-slider' })
      )
    );
  }

  private renderTemplateButtons(): JQuery {
    if (this.config.isReadOnly) return $('<div>');

    const templateButtons = $('<div>', { class: 'template-buttons' });
    // Add template buttons here...
    return templateButtons;
  }
}