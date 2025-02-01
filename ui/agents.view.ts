import {$} from './imports';
import View from './util/view';
import {store} from './store';
import ObjViewMini from './util/obj.view.mini';
import type NObject from '../core/obj';

export default class AgentsView extends View {
    constructor(mainView: JQuery) {
        super(mainView);
    }

    render() {
        this.root.empty();
        const agentsList = $('<ul>').addClass('agents-list');
        this.root.append(agentsList);

        const db = store.getState().db;
        const agents = db?.query().where(obj => obj.tags.toArray().includes('agent')).execute() || [];
        agents.forEach((agent: NObject) => agentsList.append(new ObjViewMini(agent).ele));
    }
}