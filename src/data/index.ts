import activitiesJson from './activities.json';
import daysJson from './days.json';
import type { Activity, Day } from './schema';

export const activities = activitiesJson as Activity[];
export const days = daysJson as Day[];

export const activityById: Record<string, Activity> = Object.fromEntries(
  activities.map((a) => [a.id, a]),
);

/** Lodging ids come from days.json, so nothing is hardcoded here. */
export const lodgingIds = new Set<string>(days.map((d) => d.lodgingId));

/** Everything that should appear in option lists (lodging is map-only). */
export const listedActivities = activities.filter((a) => !lodgingIds.has(a.id));

export function dayFor(iso: string): Day | undefined {
  return days.find((d) => d.date === iso);
}

export function lodgingFor(iso: string): Activity {
  const day = dayFor(iso);
  const id = day?.lodgingId ?? days[0].lodgingId;
  return activityById[id];
}
