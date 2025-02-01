import $ from 'jquery';
import NObject from '../../core/obj';
import { Form } from '../util/form';

export class MetadataManager {
  constructor(private readonly isReadOnly: boolean) {}

  renderMetadataPanel(currentObject: NObject): JQuery {
    return !currentObject
      ? $('<div>')
      : $('<div>', {
          class: 'metadata-panel form-container',
        }).append(
          new Form({
            fields: [
import $ from 'jquery';
import NObject from '../../core/obj';
import { Form } from '../util/form';

export class MetadataManager {
  constructor(private readonly isReadOnly: boolean) {}

  renderMetadataPanel(currentObject: NObject): JQuery {
    return !currentObject
      ? $('<div>')
      : $('<div>', {
          class: 'metadata-panel form-container',
        }).append(
          new Form({
            fields: [
              {
                type: 'checkbox',
                label: 'Is Query',
                propKey: 'isQuery',
                onChange: (newValue: boolean) => this.updateIsQuery(currentObject, newValue),
              },
              { type: 'text', label: 'Name', value: currentObject.name, propKey: 'name', onChange: (newValue: string) => this.updateName(currentObject, newValue), },
              { type: 'checkbox', label: 'Public', value: currentObject.public, propKey: 'public', onChange: (newValue: boolean) => this.updatePublic(currentObject, newValue), },
              { type: 'text', label: 'Author', value: currentObject.author, propKey: 'author', isReadOnly: true },
              { type: 'text', label: 'Page ID', value: currentObject.id, propKey: 'id', isReadOnly: true },
              { type: 'text', label: 'Created', value: new Date(currentObject.created).toLocaleString(), propKey: 'created', isReadOnly: true },
              { type: 'text', label: 'Last Updated', value: new Date(currentObject.updated).toLocaleString(), propKey: 'updated', isReadOnly: true },
            ],
            isReadOnly: this.isReadOnly,
            currentObject: currentObject
          }).getElement(),
          $('<div>', { class: 'metadata-tags' }).append(
            $('<span>', { text: 'Tags: ' }),
            this.renderTagsEditor(currentObject)
          )
        );
  }

  private renderTagsEditor(currentObject: NObject): JQuery {
    const tagsContainer = $('<div>', { class: 'tags-container' });

    if (!this.isReadOnly) {
      const addTagInput = $('<input>', {
        type: 'text',
        class: 'tag-input',
        placeholder: 'Add tag...',
      }).keypress(e => {
        if (e.key === 'Enter') {
          const tag = $(e.target)
            .val()
            .toString()
            .trim();
          if (tag) {
            currentObject.addTag(tag);
            $(e.target).val('');
            this.updateTagsDisplay(tagsContainer, currentObject);
          }
        }
      });
      tagsContainer.append(addTagInput);
    }

    this.updateTagsDisplay(tagsContainer, currentObject);
    return tagsContainer;
  }

  private updateTagsDisplay(container: JQuery, currentObject: NObject) {
    const tagsDiv =
      container.find('.tags-list') || $('<div>', { class: 'tags-list' });
    tagsDiv.empty();

    currentObject.tags.toArray().forEach(tag => {
      const tagElement = $('<span>', {
        class: 'tag',
        text: tag,
      });

      if (!this.isReadOnly)
        tagElement.append(
          $('<button>', {
            class: 'remove-tag',
            text: '×',
          }).click(() => {
            currentObject.removeTag(tag);
            this.updateTagsDisplay(container, currentObject);
          })
        );


      tagsDiv.append(tagElement);
    });

    if (!container.find('.tags-list').length)
      container.append(tagsDiv);

  }

  showToast(message: string) {
    const toast = $('<div>', { class: 'toast', text: message });
    $('body').append(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  updatePrivacyIndicator(isPublic: boolean) {
    // Logic to update privacy indicator in the UI
    // For example, you might update a visual element to show if the document is public or private
    console.log('Privacy updated to:', isPublic);
  }

  clearMetadataPanel(): void {
    $('.metadata-panel').empty(); // Or however you want to clear the panel
  }

  updatePrivacyIndicator(isPublic: boolean) {
    const privacyIndicator = $('.privacy-indicator');
    if (privacyIndicator.length) {
        privacyIndicator.text(isPublic ? 'Public' : 'Private');
        privacyIndicator.toggleClass('public', isPublic);
        privacyIndicator.toggleClass('private', !isPublic);
    }
  }
}
