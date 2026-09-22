import type { Activity, HoursRange, Weekday } from '../data/schema';
import { WEEKDAYS } from '../data/schema';

/** Costa Rica is UTC-6 year-round (no DST), so a fixed offset is exact. */
const CR_OFFSET_MS = -6 * 60 * 60 * 1000;

export const TRIP_START = '2026-10-05';
export const TRIP_END = '2026-10-10';

export interface CRNow {
  /** ISO date in Costa Rica, e.g. "2026-10-08". */
  date: string;
  /** Minutes since midnight in Costa Rica. */
  minutes: number;
  /** "09:05" */
  hhmm: string;
  weekday: Weekday;
}

/** A Date whose UTC fields equal Costa Rica wall-clock fields. */
function shifted(ms: number): Date {
  return new Date(ms + CR_OFFSET_MS);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Current Costa Rica wall-clock, independent of device timezone. */
export function nowCR(ms: number = Date.now()): CRNow {
  const d = shifted(ms);
  const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  return {
    date: isoDate(d),
    minutes,
    hhmm: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
    weekday: weekdayOf(isoDate(d)),
  };
}

/** Weekday of an ISO date (date-only, timezone-free). */
export function weekdayOf(iso: string): Weekday {
  const [y, m, d] = iso.split('-').map(Number);
  // getUTCDay: 0 = Sunday
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const map: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[dow];
}

export function parseHHMM(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function isTripDate(iso: string): boolean {
  return iso >= TRIP_START && iso <= TRIP_END;
}

export function tripDates(): string[] {
  const out: string[] = [];
  const [y, m, d] = TRIP_START.split('-').map(Number);
  const start = Date.UTC(y, m - 1, d);
  for (let i = 0; ; i++) {
    const iso = isoDate(new Date(start + i * 86400000));
    if (iso > TRIP_END) break;
    out.push(iso);
  }
  return out;
}

const WEEKDAY_LONG: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Thursday, Oct 8" */
export function formatDateLong(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${WEEKDAY_LONG[weekdayOf(iso)]}, ${MONTH_SHORT[m - 1]} ${d}`;
}

/** "Thu Oct 8" */
export function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  const wd = WEEKDAY_LONG[weekdayOf(iso)].slice(0, 3);
  return `${wd} ${MONTH_SHORT[m - 1]} ${d}`;
}

export type OpenState =
  | { kind: 'unknown' }
  | { kind: 'closed-today' }
  | { kind: 'all-day' }
  | { kind: 'open'; closesAt: string; closingSoon: boolean }
  | { kind: 'not-yet'; opensAt: string }
  | { kind: 'closed-now'; closedAt: string };

export function hoursFor(activity: Activity, iso: string): HoursRange | undefined {
  return activity.hours[weekdayOf(iso)];
}

export function isAllDay(range: HoursRange): boolean {
  return !!range && range[0] === '00:00' && range[1] >= '23:59';
}

/** Whether the activity is closed for the whole of the given date (null hours). */
export function isClosedOnDate(activity: Activity, iso: string): boolean {
  return hoursFor(activity, iso) === null;
}

/**
 * Open-state at a given date + minutes-since-midnight (Costa Rica time).
 * Unknown hours (missing key) return { kind: 'unknown' } so callers can
 * avoid dimming things we simply don't know about.
 */
export function openState(activity: Activity, iso: string, minutes: number): OpenState {
  const range = hoursFor(activity, iso);
  if (range === undefined) return { kind: 'unknown' };
  if (range === null) return { kind: 'closed-today' };
  if (isAllDay(range)) return { kind: 'all-day' };
  const open = parseHHMM(range[0]);
  const close = parseHHMM(range[1]);
  if (minutes < open) return { kind: 'not-yet', opensAt: range[0] };
  if (minutes >= close) return { kind: 'closed-now', closedAt: range[1] };
  return { kind: 'open', closesAt: range[1], closingSoon: close - minutes <= 60 };
}

export function isOpen(activity: Activity, iso: string, minutes: number): boolean {
  const s = openState(activity, iso, minutes);
  return s.kind === 'open' || s.kind === 'all-day';
}

export function closesAt(activity: Activity, iso: string): string | null {
  const range = hoursFor(activity, iso);
  return range ? range[1] : null;
}

/** "Closed Sun" / "Closed Tue & Wed" / null when open every day. */
export function closedDaysLabel(activity: Activity): string | null {
  const closed = WEEKDAYS.filter((w) => activity.hours[w] === null);
  if (closed.length === 0) return null;
  const names = closed.map((w) => WEEKDAY_LONG[w].slice(0, 3));
  if (names.length === 1) return `Closed ${names[0]}`;
  if (names.length === 2) return `Closed ${names[0]} & ${names[1]}`;
  return `Closed ${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

export function hoursKnown(activity: Activity): boolean {
  return WEEKDAYS.some((w) => activity.hours[w] !== undefined);
}
