import { useCallback, useEffect, useState } from 'react';
import type { Area, Category } from '../data/schema';

const KEY_MARKS = 'cractivities:marks:v1';
const KEY_FILTERS = 'cractivities:filters:v1';

export interface Marks {
  done: boolean;
  skipped: boolean;
  favorite: boolean;
}

export type MarksMap = Record<string, Partial<Marks>>;

export interface Filters {
  categories: Category[];
  areas: Area[];
  openNow: boolean;
  nearMe: boolean;
  hideDoneSkipped: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  categories: [],
  areas: [],
  openNow: false,
  nearMe: false,
  hideDoneSkipped: true,
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / quota: state stays in memory for the session.
  }
}

export function useMarks() {
  const [marks, setMarks] = useState<MarksMap>(() => read<MarksMap>(KEY_MARKS, {}));

  useEffect(() => {
    write(KEY_MARKS, marks);
  }, [marks]);

  const get = useCallback(
    (id: string): Marks => ({
      done: false,
      skipped: false,
      favorite: false,
      ...(marks[id] ?? {}),
    }),
    [marks],
  );

  const toggle = useCallback((id: string, field: keyof Marks) => {
    setMarks((prev) => {
      const current = { done: false, skipped: false, favorite: false, ...(prev[id] ?? {}) };
      const next: Marks = { ...current, [field]: !current[field] };
      // Done and Skip are mutually exclusive.
      if (field === 'done' && next.done) next.skipped = false;
      if (field === 'skipped' && next.skipped) next.done = false;
      return { ...prev, [id]: next };
    });
  }, []);

  return { marks, get, toggle };
}

export function useFilters() {
  const [filters, setFilters] = useState<Filters>(() => read<Filters>(KEY_FILTERS, DEFAULT_FILTERS));

  useEffect(() => {
    write(KEY_FILTERS, filters);
  }, [filters]);

  const update = useCallback((patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleCategory = useCallback((c: Category) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(c)
        ? prev.categories.filter((x) => x !== c)
        : [...prev.categories, c],
    }));
  }, []);

  const toggleArea = useCallback((a: Area) => {
    setFilters((prev) => ({
      ...prev,
      areas: prev.areas.includes(a) ? prev.areas.filter((x) => x !== a) : [...prev.areas, a],
    }));
  }, []);

  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  return { filters, update, toggleCategory, toggleArea, reset };
}
