interface FormProps {
  schema: any;
  data: any;
  onChange: (data: any) => void;
  mode: 'edit' | 'read';
}

export class Form {
  static TEMPLATES = {
    user: {
      schema: 'User',
      initialData: {
        avatar: '',
        name: '',
        color: '#000000',
        bio: '',
        social: {
          twitter: '',
          github: '',
          website: ''
        },
        status: 'online'
      }
    },
    note: {
      schema: 'Note',
      initialData: {
        title: 'Note',
        content: ''
      }
    },
    meeting: {
      schema: 'Meeting',
      initialData: {
        title: 'Meeting',
        attendees: [],
        agenda: []
      }
    }
  };

  private schema: any;
  private data: any;
  private readonly onChange: (data: any) => void;
  private readonly mode: 'edit' | 'read';
  private readonly element: HTMLDivElement;
  private readonly schemaInfoElement: HTMLDivElement;
  private templateControls: HTMLDivElement;

  constructor(props: FormProps) {
    this.schema = props.schema;
    this.data = props.data;
    this.onChange = props.onChange;
    this.mode = props.mode;
    this.element = document.createElement('div');
    this.schemaInfoElement = document.createElement('div');
    this.schemaInfoElement.classList.add('schema-info');
    this.templateControls = document.createElement('div');
    this.templateControls.classList.add('template-controls');
    
    if (this.mode === 'edit' && !this.schema) {
      this.renderTemplateSelection();
    } else {
      this.render();
    }
  }

  private renderTemplateSelection() {
    this.element.innerHTML = '';
    const templateList = document.createElement('div');
    templateList.classList.add('template-list');
    
    Object.entries(Form.TEMPLATES).forEach(([key, template]) => {
      const templateButton = document.createElement('button');
      templateButton.textContent = template.schema;
      templateButton.addEventListener('click', () => {
        this.initializeFromTemplate(key);
      });
      templateList.appendChild(templateButton);
    });
    
    this.element.appendChild(templateList);
  }

  private initializeFromTemplate(templateKey: string) {
    const template = Form.TEMPLATES[templateKey];
    if (!template) return;
    
    this.schema = template.schema;
    this.data = template.initialData;
    this.render();
  }

  public updateData(data: any): void {
    this.data = data;
    this.render();
    this.onChange(data);
  }

  public setSchema(schema: any): void {
    this.schema = schema;
    this.render();
  }

  private render() {
    this.element.innerHTML = '';
    this.renderSchemaInfo();
    
    if (this.schema && typeof this.schema === 'object' && this.schema.properties) {
      for (const field in this.schema.properties) {
        const fieldElement = this.renderField(
          field,
          this.schema.properties[field],
          this.data?.[field]
        );
        this.element.appendChild(fieldElement);
      }
    }
  }

  private renderSchemaInfo() {
    this.schemaInfoElement.innerHTML = '';
    
    if (this.schema) {
      const title = document.createElement('h3');
      title.textContent = this.schema.title || 'Untitled Schema';
      this.schemaInfoElement.appendChild(title);

      if (this.schema.description) {
        const description = document.createElement('p');
        description.textContent = this.schema.description;
        this.schemaInfoElement.appendChild(description);
      }

      if (this.schema.version) {
        const version = document.createElement('div');
        version.classList.add('schema-version');
        version.textContent = `Version: ${this.schema.version}`;
        this.schemaInfoElement.appendChild(version);
      }

      if (this.schema.$id) {
        const schemaLink = document.createElement('a');
        schemaLink.href = this.schema.$id;
        schemaLink.textContent = 'View Schema Documentation';
        schemaLink.target = '_blank';
        this.schemaInfoElement.appendChild(schemaLink);
      }
    }

    this.element.prepend(this.schemaInfoElement);
  }

  private renderField(field: string, schemaProps: any, value: any): HTMLElement {
    const fieldElement = document.createElement('div');
    fieldElement.classList.add('field');
    fieldElement.setAttribute('data-field', field);

    const label = document.createElement('label');
    label.textContent = `${schemaProps.description || field}: `;
    fieldElement.appendChild(label);

    if (this.mode === 'read') {
      const valueDisplay = document.createElement('span');
      valueDisplay.textContent = value || 'N/A';
      fieldElement.appendChild(valueDisplay);
    } else {
      const input = this.createInput(field, schemaProps, value);
      fieldElement.appendChild(input);
    }

    return fieldElement;
  }

  private createInput(field: string, schemaProps: any, value: any): HTMLElement {
    const input = document.createElement('input');
    input.type = this.getInputType(schemaProps);
    input.value = value || '';
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.handleInputChange(field, schemaProps, target.value);
    });
    return input;
  }

  private getInputType(schemaProps: any): string {
    switch (schemaProps.type) {
      case 'string':
        if (schemaProps.format === 'color') return 'color';
        if (schemaProps.format === 'url') return 'url';
        return 'text';
      case 'number':
        return 'number';
      case 'boolean':
        return 'checkbox';
      default:
        return 'text';
    }
  }

  private handleInputChange(field: string, schemaProps: any, value: any) {
    const newData = { ...this.data };
    newData[field] = this.parseValue(schemaProps.type, value);
    this.updateData(newData);
  }

  private parseValue(type: string, value: string): any {
    switch (type) {
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value === 'true';
      default:
        return value;
    }
  }

  getElement(): HTMLDivElement {
    return this.element;
  }
}