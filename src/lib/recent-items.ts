export interface RecentItem {
  id: string;
  label: string; // displayed text, e.g. "[WID001] Widget"
}

const MAX_RECENTS = 5;

function storageKey(tenantId: string) {
  return `wareos:${tenantId}:recent_items`;
}

export function getRecentItems(tenantId: string): RecentItem[] {
  if (typeof globalThis === 'undefined' || !globalThis.localStorage) return [];
  try {
    const raw = globalThis.localStorage.getItem(storageKey(tenantId));
    return raw ? (JSON.parse(raw) as RecentItem[]) : [];
  } catch {
    return [];
  }
}

export function addRecentItem(tenantId: string, item: RecentItem): void {
  if (typeof globalThis === 'undefined' || !globalThis.localStorage) return;
  const existing = getRecentItems(tenantId).filter((r) => r.id !== item.id);
  const updated = [item, ...existing].slice(0, MAX_RECENTS);
  globalThis.localStorage.setItem(storageKey(tenantId), JSON.stringify(updated));
}

export function clearRecentItems(tenantId: string): void {
  if (typeof globalThis === 'undefined' || !globalThis.localStorage) return;
  globalThis.localStorage.removeItem(storageKey(tenantId));
}
