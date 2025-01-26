import $ from 'jquery';
import NObject from '../../src/obj';

export class MetadataManager {
  constructor(private readonly isReadOnly: boolean) {}

  renderMetadataPanel(currentObject: NObject): JQuery {
    return !currentObject
      ? $('<div>')
      : $('<div>', {
          class: 'metadata-panel',
        }).append(
          $('<div>', { class: 'metadata-row' }).append(
            $('<span>', { text: 'Created: ' }),
            $('<span>', {
              text: new Date(currentObject.created).toLocaleString(),
            })
          ),
          $('<div>', { class: 'metadata-row' }).append(
            $('<span>', { text: 'Last Updated: ' }),
            $('<span>', {
              text: new Date(currentObject.updated).toLocaleString(),
            })
          ),
          $('<div>', { class: 'metadata-row' }).append(
            $('<span>', { text: 'Author: ' }),
            $('<span>', { text: currentObject.author })
          ),
          $('<div>', { class: 'metadata-row' }).append(
            $('<span>', { text: 'Page ID: ' }),
            $('<span>', { text: currentObject.id })
          ),
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
}