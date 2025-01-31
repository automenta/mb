// ui/util/form.ts

import $ from 'jquery'; // Import $ from jquery, use global JQuery

// Define types and interfaces related to tag form utility here


export function renderTagForm(tag: any, data: any, updateCallback: (fieldPath: string, value: any) => void): JQuery {
  const form = $('<div/>').addClass('tag-form');

  if (tag && tag.properties) {
    for (const field in tag.properties) {
      const property = tag.properties[field];
      const fieldId = `tag-form-${field}`;
      const label = $('<label/>', { for: fieldId, text: `${property.description}: ` });
      let inputElement: JQuery;

      switch (property.format) {
        case 'color':
          inputElement = $('<input/>', {
            type: 'color',
            id: fieldId,
            value: data[field] || '#ffffff', // Default to white color
          });
          break;
        case 'url':
          inputElement = $('<input/>', {
            type: 'url',
            id: fieldId,
            value: data[field] || '',
            placeholder: property.description,
          });
          break;
        case 'textarea':
          inputElement = $('<textarea/>', {
            id: fieldId,
            value: data[field] || '',
            placeholder: property.description,
          });
          break;
        default:
          inputElement = $('<input/>', {
            type: 'text',
            id: fieldId,
            value: data[field] || '', // Use provided data or default to empty string
            placeholder: property.description,
          });
      }

      inputElement.on('input', e => {
        if (e.target instanceof HTMLInputElement) {
          updateCallback(field, e.target.value);
        }
      });
      form.append($('<div/>', { class: 'tag-form-field' }).append(label, inputElement));
    }
  }

  return form;
}