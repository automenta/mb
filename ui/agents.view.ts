import { $ } from './imports';
import BaseView from './util/base-view';
import { store } from './store';
import ObjViewMini from './util/obj.view.mini';
import type NObject from '../src/obj';

export default class AgentsView extends BaseView {
    constructor(mainView: JQuery) {
        super(mainView);
    }

    render() {
        this.root.empty();
        const agentsList = $('<ul>').addClass('agents-list');
        this.root.append(agentsList);

        const db = store.getState().db;
        (db?.query().where(obj => obj.tags.toArray().includes('agent')).execute() || []).forEach((agent: NObject) => agentsList.append(new ObjViewMini(agent).ele));
    }
}