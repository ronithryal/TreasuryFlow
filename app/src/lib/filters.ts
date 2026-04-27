export type SortDir = "asc" | "desc";

export function sortBy<T>(arr: T[], key: (t: T) => string | number | Date, dir: SortDir = "desc"): T[] {
  const sorted = [...arr].sort((a, b) => {
    const av = key(a);
    const bv = key(b);
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
  return sorted;
}

export function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function groupBy<T, K extends string>(arr: T[], key: (t: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of arr) {
    const k = key(item);
    if (!out[k]) out[k] = [];
    out[k].push(item);
  }
  return out;
}

export function searchMatches(haystack: string, needle: string) {
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}
