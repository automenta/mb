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

        const observer = (e: YEvent<any>[]) => {
            const changedKeys = e[0]?.changed;
            if (changedKeys && (changedKeys instanceof Set ? changedKeys.has('name') || changedKeys.has('public') : Object.keys(changedKeys).includes('name') || Object.keys(changedKeys).includes('public')))
                setTimeout(() => this.render());
        };

        if (this.obj.observe) {
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
