import { $ } from '../imports';

export default abstract class BaseView {
    root: JQuery<HTMLElement>;

    constructor(root: JQuery<HTMLElement>) {
        this.root = root;
    }

    protected getViewClass(): string {
        return 'base-view'; // Default class
    }

    abstract render(): void;

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
