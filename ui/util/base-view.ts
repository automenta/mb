import { $ } from '../imports';
import type { UserInfo } from '../types';
import type { Awareness } from 'y-protocols/awareness';

export abstract class BaseView {
  protected readonly root: JQuery;
  protected readonly container: JQuery;
  protected readonly getAwareness?: () => Awareness;
  protected readonly getUser?: () => UserInfo;

  protected constructor(
    root: JQuery,
    options: {
      getAwareness?: () => Awareness;
      getUser?: () => UserInfo;
    } = {}
  ) {
    this.root = root;
    this.container = $('<div>').addClass(this.getViewClass());
    this.getAwareness = options.getAwareness;
    this.getUser = options.getUser;
  }

  protected abstract getViewClass(): string;

  protected renderHeader(title: string): JQuery {
    return $('<header>').append(
      $('<h3>').text(title),
      $('<div>').addClass('header-actions')
    );
  }

  protected renderError(message: string): JQuery {
    return $('<div>')
      .addClass('error-message')
      .text(message)
      .hide()
      .fadeIn();
  }

  protected renderLoading(): JQuery {
    return $('<div>')
      .addClass('loading-indicator')
      .text('Loading...');
  }

  protected bindEvent(selector: string, event: string, handler: (e: JQuery.Event) => void) {
    const wrappedHandler = (e: JQuery.Event) => {
      e.stopPropagation();
      handler(e);
    };
    this.container.on(event, selector, wrappedHandler);
    return () => this.container.off(event, selector, wrappedHandler);
  }

  protected createFormField(field: string, value: any, options: {
    type?: string;
    placeholder?: string;
    onChange?: (value: any) => void;
  } = {}): JQuery {
    const fieldId = `field-${field.replace(/\./g, '-')}`;
    const container = $('<div>').addClass('form-field');
    
    const label = $('<label>', {
      for: fieldId,
      text: field.split('.').pop()?.replace(/-/g, ' ') || field
    });

    const input = $('<input>', {
      type: options.type || 'text',
      id: fieldId,
      value: value || '',
      placeholder: options.placeholder || ''
    }).on('input', (e: JQuery.Event) => {
      const target = e.target as HTMLInputElement;
      options.onChange?.(target.value);
    });

    return container.append(label, input);
  }

  protected createButton(text: string, onClick: () => void): JQuery {
    return $('<button>')
      .text(text)
      .on('click', (e: JQuery.Event) => {
        e.preventDefault();
        onClick();
      });
  }

  destroy() {
    this.container.empty().remove();
  }

  protected renderSection(title: string, content: JQuery): JQuery {
    return $('<section>')
      .addClass('view-section')
      .append(
        $('<h4>').text(title),
        content
      );
  }

  protected renderControlGroup(
    controls: Array<{ label: string; element: JQuery }>
  ): JQuery {
    const group = $('<div>').addClass('control-group');
    controls.forEach(({ label, element }) => {
      group.append(
        $('<label>')
          .text(label)
          .append(element)
      );
    });
    return group;
  }

  abstract render(): void;

  protected clearView(): void {
    this.container.empty();
    this.root.find('.main-view').empty().append(this.container);
  }
}