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
            // Try 'changed' instead of 'keysChanged'
            const changedKeys: Set<string> = e[0].changed; // Assuming 'changed' is a Set<string>
            if (changedKeys && (changedKeys.has('name') || changedKeys.has('public')))
                setTimeout(()=> this.render());
        };
        
        this.ele.on("remove", () => this.obj.unobserve(observer));

        this.render();
        this.obj.observe(observer);
    }

    private render() {
        const title = $('<span>').addClass('obj-title').text(this.obj.name);
        const publicStatus = $('<span>').addClass('obj-public').text(this.obj.public ? 'Public' : 'Private');

        this.ele.empty().append(title, publicStatus);
    }
}