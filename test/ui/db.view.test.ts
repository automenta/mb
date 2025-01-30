import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import { expectTypeOf } from 'vitest';
import { setupAppTest, waitFor } from './test-utils';
import DBView from '../../ui/db.view';
import { store } from '../../ui/store';

describe('Database View', () => {
  let testSetup: Awaited<ReturnType<typeof setupAppTest>>;
  let dbView: DBView;

  beforeEach(async () => {
    testSetup = await setupAppTest();
    dbView = new DBView(testSetup.container, testSetup.db);
    dbView.render();
  });

  afterEach(async () => {
    await testSetup.cleanup();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should render statistics panel', () => {
      const statsPanel = testSetup.container.querySelector('.db-stats');
      expect(statsPanel).toBeDefined();
      expect(statsPanel?.children.length).toBeGreaterThan(0);
    });

    test('should render table view', () => {
      const tableView = testSetup.container.querySelector('.db-table');
      expect(tableView).toBeDefined();
      expect(tableView?.children.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics Display', () => {
    test('should show total object count', async () => {
      const testData = [
        testSetup.objFactory.def(),
        testSetup.objFactory.def()
      ];

      testData.forEach(obj => {
        dbView.handleNewObject(obj);
      });

      await waitFor(100);

      const countDisplay = testSetup.container.querySelector('.total-objects');
      expect(countDisplay?.textContent).toContain('2');
    });

    test('should show public/private object breakdown', async () => {
      const testData = [
        { ...testSetup.objFactory.def(), isPublic: true },
        { ...testSetup.objFactory.def(), isPublic: false }
      ];

      testData.forEach(obj => {
        dbView.addObject(obj);
      });
      await waitFor(100);

      const publicCount = testSetup.container.querySelector('.public-objects');
      const privateCount = testSetup.container.querySelector('.private-objects');

      expect(publicCount?.textContent).toContain('1');
      expect(privateCount?.textContent).toContain('1');
    });
  });

  describe('Table Functionality', () => {
    test('should sort objects by type', async () => {
      const testData = [
        { ...testSetup.objFactory.def(), timestamp: 1 },
        { ...testSetup.objFactory.def(), type: 'query', timestamp: 2 }
      ];

      testData.forEach(obj => {
        dbView.addObject(obj);
      });


      const sortButton = testSetup.container.querySelector('.sort-type');
      sortButton?.dispatchEvent(new MouseEvent('click'));
      await waitFor(100);

      const firstRow = testSetup.container.querySelector('.db-table-row:first-child');
      expect(firstRow?.textContent).toContain('fact');
    });

    test('should filter objects by verification status', async () => {
      const testData = [
        { ...testSetup.objFactory.def(), verified: true },
        { ...testSetup.objFactory.def(), verified: false }
      ];

      testData.forEach(obj => {
        dbView.addObject(obj);
      });

      const filterButton = testSetup.container.querySelector('.filter-verified');
      filterButton?.dispatchEvent(new MouseEvent('click'));
      await waitFor(100);

      const rows = testSetup.container.querySelectorAll('.db-table-row');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('obj1');
    });

    test('should handle large datasets efficiently', async () => {
      const testData = Array.from({ length: 1000 }, (_, i) => ({
        ...testSetup.objFactory.def(),
        id: `obj${i}`,
        timestamp: i
      }));

      testData.forEach(obj => {
        dbView.addObject(obj);
      });

      await waitFor(100);

      const rows = testSetup.container.querySelectorAll('.db-table-row');
      expect(rows.length).toBeLessThan(100);
      expect(testSetup.container.querySelector('[data-testid="virtualized"]')).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    test('should maintain type-safe store state', () => {
      expectTypeOf(store.getState().objects[0]).toMatchTypeOf<
        ReturnType<typeof testSetup.objFactory.def>
      >();
    });
  });
});
