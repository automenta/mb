import { $ } from '../imports';
import { Component } from '../app';

export default abstract class BaseView  {
    ele: JQuery<HTMLElement>;
    root: JQuery<HTMLElement>;

    constructor(root: JQuery<HTMLElement>) {
        this.root = root;
        this.ele = $('<div>').addClass(this.getViewClass()) as JQuery<HTMLElement>; // Initialize ele
    }

    getViewClass(): string { // Made getViewClass public to be accessible in Component
        return 'base-view'; // Default class
    }

    render(): JQuery<HTMLElement> | void { // Modified render to return JQuery or void
        this.clearView();
        return this.ele;
    }

    protected renderHeader(title: string): JQuery<HTMLElement> {
        return $('<h2>').text(title);
    }

    protected clearView(): void {
        this.root.empty();
    }

    protected appendContent(content: JQuery<HTMLElement> | string): void {
        this.root.append(content);
    }

    protected findElement(selector: string): JQuery<HTMLElement> {
        return this.root.find(selector);
    }
}

interface BaseViewConstructor {
    new (root: JQuery<HTMLElement>): BaseView;
}
