// Sanity-checks activities.json and days.json so a typo can't ship to the phone.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const load = (p) => JSON.parse(readFileSync(resolve(here, '..', p), 'utf8'));

const activities = load('src/data/activities.json');
const days = load('src/data/days.json');

const CATEGORIES = new Set(['eat', 'nature', 'water', 'culture', 'wellness', 'town']);
const AREAS = new Set([
  'punta-uva', 'cocles', 'playa-chiquita', 'puerto-viejo', 'hone-creek-bribri', 'cahuita', 'manzanillo',
]);
const TOD = new Set(['early', 'morning', 'midday', 'afternoon', 'evening', 'any']);
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const errors = [];
const err = (m) => errors.push(m);

const ids = new Set();
for (const a of activities) {
  const tag = `activity ${a.id ?? '(no id)'}`;
  if (!a.id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.id)) err(`${tag}: id must be kebab-case`);
  if (ids.has(a.id)) err(`${tag}: duplicate id`);
  ids.add(a.id);
  if (!a.name) err(`${tag}: missing name`);
  if (!CATEGORIES.has(a.category)) err(`${tag}: bad category ${a.category}`);
  if (!AREAS.has(a.area)) err(`${tag}: bad area ${a.area}`);
  if (typeof a.lat !== 'number' || a.lat < 9 || a.lat > 10.5) err(`${tag}: lat out of range`);
  if (typeof a.lng !== 'number' || a.lng < -83.5 || a.lng > -82) err(`${tag}: lng out of range`);
  if (!a.description) err(`${tag}: missing description`);
  if (!Array.isArray(a.highlights) || a.highlights.length < 1) err(`${tag}: highlights required`);
  if (typeof a.hours !== 'object' || a.hours === null) err(`${tag}: hours must be an object`);
  else {
    for (const [k, v] of Object.entries(a.hours)) {
      if (!WEEKDAYS.includes(k)) err(`${tag}: bad weekday key ${k}`);
      if (v === null) continue;
      if (!Array.isArray(v) || v.length !== 2 || !HHMM.test(v[0]) || !HHMM.test(v[1])) {
        err(`${tag}: bad hours for ${k}: ${JSON.stringify(v)}`);
      } else if (v[0] >= v[1]) err(`${tag}: ${k} opens after it closes`);
    }
  }
  if (!Array.isArray(a.timeOfDay) || !a.timeOfDay.every((t) => TOD.has(t))) err(`${tag}: bad timeOfDay`);
  if (!Array.isArray(a.bestDays) || !a.bestDays.every((d) => ISO.test(d))) err(`${tag}: bad bestDays`);
  if (typeof a.requiresBooking !== 'boolean') err(`${tag}: requiresBooking must be boolean`);
  if (!Array.isArray(a.tags)) err(`${tag}: tags must be an array`);
  if (a.booking?.whatsapp && !/^\d+$/.test(a.booking.whatsapp)) err(`${tag}: booking.whatsapp must be digits only`);
}

// Cross-references.
for (const a of activities) {
  for (const key of ['pairsWith', 'alternatives']) {
    for (const ref of a[key] ?? []) {
      if (!ids.has(ref)) err(`activity ${a.id}: ${key} references unknown id ${ref}`);
    }
  }
}

const dates = new Set();
for (const d of days) {
  const tag = `day ${d.date}`;
  if (!ISO.test(d.date)) err(`${tag}: bad date`);
  if (dates.has(d.date)) err(`${tag}: duplicate date`);
  dates.add(d.date);
  if (!ids.has(d.lodgingId)) err(`${tag}: unknown lodgingId ${d.lodgingId}`);
  for (const an of d.anchors ?? []) {
    if (!HHMM.test(an.time)) err(`${tag}: anchor "${an.title}" has bad time ${an.time}`);
    if (an.whatsapp && !/^\d+$/.test(an.whatsapp)) err(`${tag}: anchor "${an.title}" whatsapp must be digits only`);
  }
  if (!Array.isArray(d.optionSets) || d.optionSets.length < 2 || d.optionSets.length > 4) {
    err(`${tag}: need 2–4 option sets`);
  }
  for (const s of d.optionSets ?? []) {
    for (const id of s.activityIds) {
      if (!ids.has(id)) err(`${tag}: option set "${s.name}" references unknown id ${id}`);
    }
  }
}

// Every bestDays date should be a trip day.
for (const a of activities) {
  for (const bd of a.bestDays) {
    if (!dates.has(bd)) err(`activity ${a.id}: bestDays ${bd} is not a day in days.json`);
  }
}

if (errors.length) {
  console.error(`✖ ${errors.length} data error(s):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`✔ ${activities.length} activities, ${days.length} days — data OK`);
