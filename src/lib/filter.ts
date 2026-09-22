import type { Activity } from '../data/schema';
import { TIME_OF_DAY_ORDER } from '../data/schema';
import type { Filters, Marks } from './store';
import { isOpen } from './time';

interface Ctx {
  filters: Filters;
  date: string;
  minutes: number;
  getMarks: (id: string) => Marks;
}

/** Apply category / area / open-now / hide-done filters. Sorting is separate. */
export function applyFilters(list: Activity[], ctx: Ctx): Activity[] {
  const { filters, date, minutes, getMarks } = ctx;
  return list.filter((a) => {
    if (filters.categories.length && !filters.categories.includes(a.category)) return false;
    if (filters.areas.length && !filters.areas.includes(a.area)) return false;
    if (filters.openNow && !isOpen(a, date, minutes)) return false;
    if (filters.hideDoneSkipped) {
      const m = getMarks(a.id);
      if (m.done || m.skipped) return false;
    }
    return true;
  });
}

function earliestTod(a: Activity): number {
  return Math.min(...a.timeOfDay.map((t) => TIME_OF_DAY_ORDER[t]));
}

/** Time-of-day first, then distance. */
export function sortByTimeThenDistance(list: Activity[], distanceTo: (a: Activity) => number): Activity[] {
  return [...list].sort((x, y) => {
    const t = earliestTod(x) - earliestTod(y);
    if (t !== 0) return t;
    return distanceTo(x) - distanceTo(y);
  });
}

export function sortByDistance(list: Activity[], distanceTo: (a: Activity) => number): Activity[] {
  return [...list].sort((x, y) => distanceTo(x) - distanceTo(y));
}

export function matchesSearch(a: Activity, q: string): boolean {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [a.name, a.description, ...a.tags, ...a.highlights].join(' ').toLowerCase();
  return needle.split(/\s+/).every((w) => hay.includes(w));
}
