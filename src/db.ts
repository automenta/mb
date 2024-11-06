"use strict";
import * as Y from 'yjs';
import {Doc} from "yjs";
import {YMap} from "yjs/dist/src/types/YMap";
import {IndexeddbPersistence} from 'y-indexeddb';
import {YText} from "yjs/dist/src/types/YText";

class DB {

    readonly doc: Doc;

    readonly pages: YMap<any>;

    private readonly indexedDB: IndexeddbPersistence;

    constructor(channel:string) {
        this.doc = new Y.Doc();

        this.pages = this.doc.getMap('pages');

        this.indexedDB = new IndexeddbPersistence(channel, this.doc);

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
