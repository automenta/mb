import $ from "jquery";
import NObject from '../../src/obj';
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
            const kc: Set<string> = e[0].keysChanged;
            if (kc.has('name') || kc.has('public'))
                setTimeout(()=> this.render());
        };
        this.obj.observe(observer);
        this.ele.on("remove", () => this.obj.unobserve(observer));

        this.render();
    }

    private render() {
        const title = $('<span>').addClass('obj-title').text(this.obj.name);
        const publicStatus = $('<span>').addClass('obj-public').text(this.obj.public ? 'Public' : 'Private');

        this.ele.empty().append(title, publicStatus);
    }
}