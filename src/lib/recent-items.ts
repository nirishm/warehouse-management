export interface RecentItem {
  id: string;
  label: string; // displayed text, e.g. "[WID001] Widget"
}

const MAX_RECENTS = 5;

function storageKey(tenantId: string) {
  return `wareos:${tenantId}:recent_items`;
}

export function getRecentItems(tenantId: string): RecentItem[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey(tenantId)) : null;
    return raw ? (JSON.parse(raw) as RecentItem[]) : [];
  } catch {
    return [];
  }
}

export function addRecentItem(tenantId: string, item: RecentItem): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const existing = getRecentItems(tenantId).filter((r) => r.id !== item.id);
    const updated = [item, ...existing].slice(0, MAX_RECENTS);
    localStorage.setItem(storageKey(tenantId), JSON.stringify(updated));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export function clearRecentItems(tenantId: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(storageKey(tenantId));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}
