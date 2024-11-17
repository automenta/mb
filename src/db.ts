"use strict";
import * as Y from 'yjs';
import {YMap} from "yjs/dist/src/types/YMap";
import {YText} from "yjs/dist/src/types/YText";
import {IndexeddbPersistence} from 'y-indexeddb';

const appID = "todo";

class DB {

    readonly userID: string;
    readonly doc: Y.Doc;

    readonly pages: YMap<any>;

    private readonly indexedDB: IndexeddbPersistence;

    constructor(userID:string) {
        this.userID = userID;
        this.doc = new Y.Doc();
        this.indexedDB = new IndexeddbPersistence(appID + "_" + userID, this.doc);

        this.pages = this.doc.getMap('pages');

        // Observe changes to persist data or trigger updates if needed
        this.indexedDB.on('synced', () => console.log('Data synchronized with IndexedDB'));
    }

    page(pageId:string):any {
        return this.pages.get(pageId);
    }

    pageContent(pageId: string):YText {
        const page = this.page(pageId);
        return page ? this.doc.getText(page.contentId) : null;
    }

    pageSet(pageId:string, content:any):void {
        this.pages.set(pageId, content);
    }

    pageNew(pageId:string, title:string, isPublic = false):void {
        const contentId = `content-${pageId}`;
        this.doc.getText(contentId); // Initialize Y.Text for content
        this.pageSet(pageId, { title, contentId, isPublic });
    }


    pageTitle(pageId:string, title:string):void {
        const page = this.page(pageId);
        if (page)
            this.pageSet(pageId, { ...page, title });
    }

    pagePrivacy(pageId:string, isPublic:boolean):void {
        const page = this.page(pageId);
        if (page)
            this.pageSet(pageId, { ...page, isPublic });
    }

    pageDelete(pageId:string) {
        throw "TODO";
    }

}

export default DB;
