import $ from 'jquery';
import NObject from '../../src/obj';

interface FormField {
    type: 'text' | 'checkbox';
    label: string;
    value: any;
    propKey: string;
    isReadOnly?: boolean;
}

interface FormProps {
    fields: FormField[];
    isReadOnly?: boolean;
    currentObject?: NObject; // Add currentObject to props
}

export class Form {
    props: FormProps;
    ele: JQuery;

    constructor(props: FormProps) {
        this.props = props;
        this.ele = $('<div>').addClass('form'); // Use jQuery to create the form element
        this.render();
    }

    render() {
        this.ele.empty(); // Clear existing content
        this.props.fields.forEach((field: FormField) => {
            const row = $('<div>').addClass('form-row'); // Use jQuery
            const label = $('<label>').text(field.label); // Use jQuery
            let inputElement;

            if (field.type === 'text') { // Text input field
                inputElement = $('<input>') // Use jQuery
                    .attr('type', 'text')
                    .addClass('form-input')
                    .val(field.value)
                    .prop('disabled', this.props.isReadOnly)
                    .on('change', (e) => {
                        this.updateObjectProperty(field.propKey, $(e.target).val());
                    });
            } else if (field.type === 'checkbox') { // Checkbox field
                inputElement = $('<input>') // Use jQuery
                    .attr('type', 'checkbox')
                    .addClass('form-checkbox')
                    .prop('checked', field.value)
                    .prop('disabled', this.props.isReadOnly)
                    .on('change', (e) => {
                        this.updateObjectProperty(field.propKey, $(e.target).is(':checked'));
                    });
            }

            row.append(label, inputElement); // Use jQuery
            this.ele.append(row); // Use jQuery
        });
    }

    private updateObjectProperty(key: string, value: any) {
        if (this.props.isReadOnly || !this.props.currentObject) return; // Ensure currentObject is available
        this.props.currentObject.setMetadata(key, value); // Use setMetadata for generic metadata updates
    }

    getElement(): JQuery { // Return jQuery element
        return this.ele;
    }
}
