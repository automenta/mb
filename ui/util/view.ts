import { $ } from '../imports';

export default abstract class View {
    ele: JQuery;
    root: JQuery;

    protected constructor(root: JQuery) {
        this.root = root;
        this.ele = $('<div>').addClass(this.getViewClass()) as JQuery; // Initialize ele
    }

    getViewClass(): string { // Made getViewClass public to be accessible in Component
        return 'base-view'; // Default class
    }

    render(): JQuery | void { // Modified render to return JQuery or void
        this.clearView();
        return this.ele;
    }

    protected renderHeader(title: string): JQuery {
        return $('<h2>').text(title);
    }

    protected clearView(): void {
        this.root.empty();
    }

    protected appendContent(content: JQuery | string): void {
        this.root.append(content);
    }

    protected findElement(selector: string): JQuery {
        return this.root.find(selector);
    }
}

interface BaseViewConstructor {
    new (root: JQuery): View;
}
