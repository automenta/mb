import $ from "jquery";
import NObject from '../../core/obj';
import {YEvent} from "yjs";

export default class ObjViewMini {
    public readonly ele: JQuery;
    private obj: NObject;

    constructor(obj: NObject) {
        this.obj = obj;
        this.ele = $('<li>').addClass('obj-view-mini').css({
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        });

        const observer: (e: YEvent<any>[]) => void = (e) => {
            // Check if 'changed' is a Set or an Array
            const changedKeys = e[0].changed instanceof Set ? e[0].changed : Object.keys(e[0].changed);
            if (changedKeys && (changedKeys.has('name') || changedKeys.has('public')))
                setTimeout(() => this.render());
        };

        if (typeof this.obj.observe === 'function') {
            this.ele.on("remove", () => this.obj.unobserve(observer));
            this.obj.observe(observer);
        }

        this.render();
    }

    private render() {
        const title = $('<span>').addClass('obj-title').text(this.obj.name);
        const publicStatus = $('<span>').addClass('obj-public').text(this.obj.public ? 'Public' : 'Private');

        this.ele.empty().append(title, publicStatus);
    }
}
