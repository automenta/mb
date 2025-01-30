// ui/util/schema-form.ts

import $ from 'jquery'; // Import $ from jquery, use global JQuery

// Define types and interfaces related to schema form utility here


export function renderSchemaForm(schema: any, data: any, updateCallback: (fieldPath: string, value: any) => void): JQuery {
  const form = $('<div/>').addClass('schema-form');

  if (schema && schema.properties) {
    for (const field in schema.properties) {
      const property = schema.properties[field];
      const fieldId = `schema-form-${field}`;
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
      form.append($('<div/>', { class: 'schema-form-field' }).append(label, inputElement));
    }
  }

  return form;
}