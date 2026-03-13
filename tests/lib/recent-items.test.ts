import { describe, it, expect, beforeEach } from 'vitest';

// In-memory localStorage mock — no jsdom needed
const store: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  },
  writable: true,
});

// Import after mock is installed
const { getRecentItems, addRecentItem, clearRecentItems } = await import('../../src/lib/recent-items');

describe('recent-items', () => {
  const TENANT = 'tenant-abc';

  beforeEach(() => store['wareos:tenant-abc:recent_items'] && delete store['wareos:tenant-abc:recent_items']);

  it('returns [] when nothing stored', () => {
    expect(getRecentItems(TENANT)).toEqual([]);
  });

  it('adds an item and returns it', () => {
    addRecentItem(TENANT, { id: '1', label: 'Widget' });
    expect(getRecentItems(TENANT)).toEqual([{ id: '1', label: 'Widget' }]);
  });

  it('deduplicates: adding same id moves it to front', () => {
    addRecentItem(TENANT, { id: '1', label: 'Widget' });
    addRecentItem(TENANT, { id: '2', label: 'Bolt' });
    addRecentItem(TENANT, { id: '1', label: 'Widget' }); // re-add
    const result = getRecentItems(TENANT);
    expect(result[0].id).toBe('1');
    expect(result).toHaveLength(2);
  });

  it('caps at 5 entries (oldest dropped)', () => {
    for (let i = 1; i <= 7; i++) {
      addRecentItem(TENANT, { id: String(i), label: `Item ${i}` });
    }
    const result = getRecentItems(TENANT);
    expect(result).toHaveLength(5);
    expect(result[0].id).toBe('7'); // most recent first
  });

  it('clearRecentItems empties the list', () => {
    addRecentItem(TENANT, { id: '1', label: 'Widget' });
    clearRecentItems(TENANT);
    expect(getRecentItems(TENANT)).toEqual([]);
  });
});
