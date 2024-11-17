import {beforeEach, describe, expect, test} from 'vitest';
import DB from '../src/db';

describe('DB', () => {
    let db;

    beforeEach(() => {
        db = new DB('test-user');
    });

    test('creates new page with correct structure', () => {
        const pageId = 'test-page';
        const title = 'Test Page';

        db.pageNew(pageId, title, false);

        const page = db.page(pageId);
        expect(page).toBeDefined();
        expect(page.title).toBe(title);
        expect(page.isPublic).toBe(false);
        expect(page.contentId).toBe(`content-${pageId}`);
    });

    test('updates page title', () => {
        const pageId = 'test-page';
        const originalTitle = 'Original Title';
        const newTitle = 'New Title';

        db.pageNew(pageId, originalTitle, false);
        db.pageTitle(pageId, newTitle);

        const page = db.page(pageId);
        expect(page.title).toBe(newTitle);
    });

    test('toggles page privacy', () => {
        const pageId = 'test-page';

        db.pageNew(pageId, 'Test Page', false);
        db.pagePrivacy(pageId, true);

        const page = db.page(pageId);
        expect(page.isPublic).toBe(true);
    });

    test('retrieves page content', () => {
        const pageId = 'test-page';

        db.pageNew(pageId, 'Test Page', false);
        const content = db.pageContent(pageId);

        expect(content).toBeDefined();
        expect(typeof content.toString).toBe('function');
    });
});