// Generates public/guide.html (the printable B&W field guide) from the two data files.
// Run: npm run guide
import fs from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const activities = JSON.parse(fs.readFileSync(`${ROOT}/src/data/activities.json`, 'utf8'));
const days = JSON.parse(fs.readFileSync(`${ROOT}/src/data/days.json`, 'utf8'));

const AREA_LABEL = {
  'punta-uva': 'Punta Uva',
  cocles: 'Cocles',
  'playa-chiquita': 'Playa Chiquita',
  'puerto-viejo': 'Puerto Viejo',
  'hone-creek-bribri': 'Hone Creek / Bribri',
  cahuita: 'Cahuita',
  manzanillo: 'Manzanillo',
};
const CATEGORY_LABEL = {
  eat: 'Eat', nature: 'Nature', water: 'Water',
  culture: 'Culture', wellness: 'Wellness', town: 'Town',
};
const GLYPH = {
  nature: '●',   // filled circle
  water: '○',    // open circle
  culture: '◆',  // filled diamond
  wellness: '▲', // triangle
  eat: '■',      // filled square
  town: '◇',     // open diamond
};
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEKDAY_LABEL = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

// Geographic order, north -> south, as specified.
const AREA_ORDER = [
  'cahuita', 'hone-creek-bribri', 'puerto-viejo',
  'playa-chiquita', 'cocles', 'punta-uva', 'manzanillo',
];

const LODGING_IDS = new Set(['dragonfly', 'congo-bongo']);
const byId = new Map(activities.map((a) => [a.id, a]));
const dragonfly = byId.get('dragonfly');
const congoBongo = byId.get('congo-bongo');

// ---------------------------------------------------------------- helpers

const e = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 30 km/h, 1.3x road factor. */
function driveMin(from, to) {
  const km = haversineKm(from, to) * 1.3;
  return Math.max(1, Math.round((km / 30) * 60));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function isoToShort(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}
function isoToLong(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getUTCDay()];
  return { dow, short: `${MONTHS[m - 1]} ${d}`, iso };
}
function isoWeekdayKey(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dt.getUTCDay()];
}

const NB = '–'; // en dash

function rangeText(v) {
  if (v === null) return 'closed';
  if (!v) return null;
  const [s, t] = v;
  if (s === '00:00' && (t === '23:59' || t === '24:00')) return 'open all day';
  return `${s}${NB}${t}`;
}

/** Narrow form for the closed-days matrix: "8–16", "12:30–21:30". */
function compactRange(v) {
  const strip = (t) => t.replace(/^0/, '');
  const trim = (t) => (t.endsWith(':00') ? strip(t).slice(0, -3) : strip(t));
  return `${trim(v[0])}${NB}${trim(v[1])}`;
}

/** Collapse a weekly hours object into one compact line. */
function hoursLine(hours) {
  const known = WEEKDAYS.filter((d) => Object.prototype.hasOwnProperty.call(hours || {}, d));
  if (known.length === 0) return 'By arrangement';
  const parts = [];
  let i = 0;
  while (i < WEEKDAYS.length) {
    const d = WEEKDAYS[i];
    if (!Object.prototype.hasOwnProperty.call(hours, d)) { i++; continue; }
    const txt = rangeText(hours[d]);
    let j = i;
    while (
      j + 1 < WEEKDAYS.length &&
      Object.prototype.hasOwnProperty.call(hours, WEEKDAYS[j + 1]) &&
      rangeText(hours[WEEKDAYS[j + 1]]) === txt
    ) j++;
    const label = i === j
      ? WEEKDAY_LABEL[WEEKDAYS[i]]
      : `${WEEKDAY_LABEL[WEEKDAYS[i]]}${NB}${WEEKDAY_LABEL[WEEKDAYS[j]]}`;
    parts.push(`${label} ${txt}`);
    i = j + 1;
  }
  if (parts.length === 1 && known.length === 7) {
    return `Daily ${parts[0].split(' ').slice(1).join(' ')}`;
  }
  return parts.join(' · ');
}

/** "50661287817" -> "+506 6128 7817" */
function fmtWhatsapp(w) {
  if (!w) return null;
  const digits = String(w).replace(/\D/g, '');
  if (digits.startsWith('506') && digits.length === 11) {
    const n = digits.slice(3);
    return `+506 ${n.slice(0, 4)} ${n.slice(4)}`;
  }
  return `+${digits}`;
}
function fmtPhone(p) {
  if (!p) return null;
  const digits = String(p).replace(/\D/g, '');
  if (digits.startsWith('506') && digits.length === 11) {
    const n = digits.slice(3);
    return `+506 ${n.slice(0, 4)} ${n.slice(4)}`;
  }
  return String(p).trim();
}
function domain(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + (u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : '');
  } catch {
    return url;
  }
}


/** Short label for the matrix: drop parentheticals, cap at 40 chars. */
function shortName(name) {
  let n = name.replace(/\s*\([^)]*\)/g, '').trim();
  if (n.length > 38) {
    n = n.slice(0, 38).replace(/[\s\u2014\u00b7+&,-]+\S*$/, '') + '\u2026';
  }
  return n;
}

function nameOf(id) {
  const a = byId.get(id);
  return a ? a.name : id;
}
function areaOf(id) {
  const a = byId.get(id);
  return a ? AREA_LABEL[a.area] : '';
}

// ------------------------------------------------------- derived structures

const regionActivities = {};
for (const area of AREA_ORDER) {
  regionActivities[area] = activities.filter((a) => a.area === area && !LODGING_IDS.has(a.id));
}

const CAT_GROUPS = [
  { key: 'nature-water', label: 'Nature · Water', cats: ['nature', 'water'] },
  { key: 'culture-wellness', label: 'Culture · Wellness · Town', cats: ['culture', 'wellness', 'town'] },
  { key: 'eat', label: 'Eat', cats: ['eat'] },
];

function centroid(list) {
  const lat = list.reduce((s, a) => s + a.lat, 0) / list.length;
  const lng = list.reduce((s, a) => s + a.lng, 0) / list.length;
  return { lat, lng };
}

// ------------------------------------------------------------ page: cover

const LODGING_BY_ID = { dragonfly: dragonfly, 'congo-bongo': congoBongo };

function coverSection() {
  const rows = days.map((d) => {
    const L = isoToLong(d.date);
    const lodge = LODGING_BY_ID[d.lodgingId];
    const lodgeShort = d.lodgingId === 'dragonfly' ? 'Dragonfly' : 'Congo Bongo';
    const anchors = d.anchors.length
      ? d.anchors.map((a) => `<span class="nw"><b>${e(a.time)}</b> ${e(a.title)}</span>`).join('<br>')
      : '<span class="dim">Open day</span>';
    const opts = d.optionSets.map((o) => e(o.name)).join(' · ');
    return `<tr>
      <td class="nw"><b>${e(L.dow)} ${e(L.short)}</b></td>
      <td class="nw">${e(lodgeShort)}</td>
      <td>${anchors}</td>
      <td>${opts}</td>
    </tr>`;
  }).join('\n');

  const warnRows = days.flatMap((d) =>
    (d.warnings || []).map((w) => ({ date: isoToLong(d.date), text: w }))
  );
  const warnList = warnRows.map((w) =>
    `<li><span class="wdate">${e(w.date.dow)} ${e(w.date.short)}</span> ${e(w.text)}</li>`
  ).join('\n');

  const lodgingCard = (a, dates) => `
    <div class="card">
      <div class="card-h">${e(dates)}</div>
      <div class="card-n">${e(a.name)}</div>
      <div class="card-b">${e(a.description)}</div>
      <ul class="tight">${a.highlights.map((h) => `<li>${e(h)}</li>`).join('')}</ul>
      <div class="card-b"><b>Phone / WhatsApp</b> ${e(fmtPhone(a.booking.phone))}</div>
    </div>`;

  return `
<section class="cover">
  <header class="masthead">
    <div class="mast-sub">Field guide</div>
    <h1>Caribe Sur</h1>
    <div class="mast-line">Costa Rica · southern Caribbean coast · <b>Mon 5 – Sat 10 October 2026</b></div>
    <div class="mast-line small">Jason &amp; Andrea · Cahuita to Manzanillo · 32 entries, ${activities.length - 2} activities</div>
  </header>

  <h2 class="sec">Home bases</h2>
  <div class="cards">
    ${lodgingCard(dragonfly, 'Mon 5 – Wed 7 Oct')}
    ${lodgingCard(congoBongo, 'Wed 7 – Sat 10 Oct')}
  </div>

  <h2 class="sec">Numbers to have on paper</h2>
  <table class="grid num">
    <tbody>
      <tr><td class="k">Dragonfly Beach Retreat</td><td class="v">+506 6128 7817</td><td class="k">Conf.</td><td class="v">4W9K5ZP4QB · paid in full</td></tr>
      <tr><td class="k">Congo Bongo — Daan Nelemans</td><td class="v">+506 8957 4177</td><td class="k">Locator</td><td class="v">33643575 · $419.51 due at property</td></tr>
      <tr><td class="k">Adobe Rent a Car, Limón</td><td class="v">+506 2758 4042</td><td class="k">Car</td><td class="v">Pick up Mon 13:30 · return Sat 15:30, full tank (closes 17:00)</td></tr>
      <tr><td class="k">Sansa — Limón (LIO)</td><td class="v">RZ1102 / RZ1132</td><td class="k">Flights</td><td class="v">Mon 12:40 arrive · Sat 17:10 depart to SJO</td></tr>
      <tr><td class="k">Other numbers</td><td class="v" colspan="3">Jaguar Rescue +506 2750 0710 · Kayaks Punta Uva +506 8839 8386 · Beauty Ritual Spa +506 8314 8943 · Green Water Tours +506 6427 7088 · Cacao Trails +506 8353 8455 · Finca la Isla +506 8886 8530</td></tr>
    </tbody>
  </table>

  <h2 class="sec">Six days at a glance</h2>
  <table class="grid days">
    <thead><tr><th>Date</th><th>Sleep</th><th>Fixed points</th><th>Option sets</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>

  <div class="dontforget">
    <div class="df-h">Don't forget</div>
    <ul>
${warnList}
      <li><span class="wdate">Every day</span> Carry cash — card machines are unreliable (Moca Beach, Ma-Cu, Two Waters, kayak rental are cash).</li>
      <li><span class="wdate">Book ahead</span> Cahuita reef snorkel (24 h), Sherman's boat (ask Daan the day before), couples massage (WhatsApp a day ahead).</li>
    </ul>
  </div>
</section>`;
}

// ---------------------------------------------------------- page: regions

function activityEntry(a) {
  const meta = [];
  if (a.price) meta.push(e(a.price));
  if (a.duration) meta.push(e(a.duration));
  meta.push(a.requiresBooking
    ? `<b class="flag">Book ahead</b>${a.bookingLeadTime ? ' — ' + e(a.bookingLeadTime) : ''}`
    : '<span class="dim">No booking needed</span>');

  const best = a.bestDays.length
    ? a.bestDays.slice().sort().map(isoToShort).join(', ')
    : 'any day';

  const contacts = [];
  const seen = new Set();
  const pushContact = (label, val) => {
    if (!val || seen.has(val)) return;
    seen.add(val);
    contacts.push(`${label} ${e(val)}`);
  };
  if (a.booking) {
    pushContact('T', fmtPhone(a.booking.phone));
    pushContact('WA', fmtWhatsapp(a.booking.whatsapp));
    if (a.booking.email) pushContact('E', a.booking.email);
  }
  const web = domain(a.website) || domain(a.booking && a.booking.url);
  if (web) contacts.push(`W ${e(web)}`);

  const pairs = (a.pairsWith || []).map(nameOf);
  const alts = (a.alternatives || []).map(nameOf);

  const xref = [
    pairs.length ? `<span class="lab">Pairs with</span> ${e(pairs.join('; '))}` : null,
    alts.length ? `<span class="lab">Or</span> ${e(alts.join('; '))}` : null,
  ].filter(Boolean).join(' <span class="sep">|</span> ');

  const bookLine = [
    a.booking && a.booking.method ? `<span class="lab">Booking</span> ${e(a.booking.method)}` : null,
    contacts.length ? contacts.join(' · ') : null,
  ].filter(Boolean).join(' <span class="sep">|</span> ');

  return `
<div class="act">
  <div class="act-h">
    <span class="glyph">${GLYPH[a.category]}</span>
    <span class="act-n">${e(a.name)}</span>
    <span class="act-cat">${e(CATEGORY_LABEL[a.category])}</span>
  </div>
  <div class="act-meta">${meta.join(' · ')}</div>
  <div class="act-hours"><span class="lab">Hours</span> ${e(hoursLine(a.hours))} <span class="sep">|</span> <span class="lab">Best</span> ${e(best)}</div>
  <div class="act-desc">${e(a.description)}</div>
  ${a.highlights && a.highlights.length
    ? `<ul class="hl">${a.highlights.map((h) => `<li>${e(h)}</li>`).join('')}</ul>`
    : ''}
  ${a.notes ? `<div class="act-note"><i>Note: ${e(a.notes)}</i></div>` : ''}
  ${bookLine ? `<div class="act-book">${bookLine}</div>` : ''}
  ${xref ? `<div class="act-x">${xref}</div>` : ''}
</div>`;
}

const leg = (n) => (n < 5 ? `~${n} min (walkable)` : `~${n} min`);

function regionsSection() {
  const blocks = AREA_ORDER.map((area, idx) => {
    const list = regionActivities[area];
    const c = centroid(list);
    const dDf = driveMin(dragonfly, c);
    const dCb = driveMin(congoBongo, c);
    const counts = CAT_GROUPS.map((g) => {
      const n = list.filter((a) => g.cats.includes(a.category)).length;
      return n ? `${n} ${g.label.toLowerCase()}` : null;
    }).filter(Boolean);

    // Chromium ignores `break-after: avoid` on headings, so every heading is
    // physically wrapped together with the entry that follows it instead.
    const blocks = [];
    for (const g of CAT_GROUPS) {
      const items = list.filter((a) => g.cats.includes(a.category));
      if (!items.length) continue;
      blocks.push(`<h4 class="grp">${e(g.label)}</h4>${activityEntry(items[0])}`);
      for (const a of items.slice(1)) blocks.push(activityEntry(a));
    }

    const header = `<h3 class="rgn">
    <span class="rgn-num">${String(idx + 1).padStart(2, '0')}</span>
    <span class="rgn-name">${e(AREA_LABEL[area])}</span>
  </h3>
  <div class="rgn-orient">${leg(dDf)} from Dragonfly / ${leg(dCb)} from Congo Bongo <span class="sep">|</span> ${e(list.length)} ${list.length === 1 ? 'entry' : 'entries'}</div>`;

    // Region title + orientation + first entry travel as one unbreakable unit.
    const body = [`<div class="keep">${header}${blocks[0] || ''}</div>`]
      .concat(blocks.slice(1).map((b) => `<div class="keep">${b}</div>`))
      .join('\n');

    return `
<section class="region${idx === 0 ? ' first-region' : ''}">
${body}
</section>`;
  }).join('\n');

  return `
<section class="part" id="regions">
  <h2 class="part-h">Part I · The coast, north to south</h2>
  <div class="legend">
    <b>Key</b>
    ${CAT_GROUPS.flatMap((g) => g.cats).map((c) => `<span class="lg">${GLYPH[c]} ${CATEGORY_LABEL[c]}</span>`).join('')}
    <span class="lg">Drive times are estimates: straight-line distance &times; 1.3, at 30 km/h.</span>
  </div>
${blocks}
</section>`;
}

// ------------------------------------------------------- page: day-by-day

function daysSection() {
  const blocks = days.map((d) => {
    const L = isoToLong(d.date);
    const lodgeShort = d.lodgingId === 'dragonfly' ? 'Dragonfly, Punta Uva' : 'Congo Bongo, Manzanillo';
    const wk = isoWeekdayKey(d.date);

    const anchors = d.anchors.length
      ? `<table class="grid anch"><tbody>${d.anchors.map((a) => `
          <tr>
            <td class="t">${e(a.time)}</td>
            <td><b>${e(a.title)}</b>${a.note ? ` <span class="anote">${e(a.note)}</span>` : ''}</td>
            <td class="ph">${[fmtPhone(a.phone), a.whatsapp && fmtWhatsapp(a.whatsapp) !== fmtPhone(a.phone) ? 'WA ' + fmtWhatsapp(a.whatsapp) : null].filter(Boolean).map(e).join('<br>')}</td>
          </tr>`).join('')}</tbody></table>`
      : '<div class="noanchor">No fixed times today — the whole day is yours.</div>';

    const opts = d.optionSets.map((o) => `
      <div class="opt">
        <div class="opt-n">${e(o.name)}</div>
        <div class="opt-b">${e(o.blurb)}</div>
        <ol class="opt-l">${o.activityIds.map((id) => {
          const a = byId.get(id);
          const closed = a && Object.prototype.hasOwnProperty.call(a.hours, wk) && a.hours[wk] === null;
          return `<li>${a ? GLYPH[a.category] + ' ' : ''}${e(nameOf(id))} <span class="opt-a">[${e(areaOf(id))}]</span>${closed ? ' <b class="closedtag">CLOSED TODAY</b>' : ''}</li>`;
        }).join('')}</ol>
      </div>`).join('');

    const warn = (d.warnings || []).length
      ? `<div class="daywarn"><b>Watch out</b> ${d.warnings.map(e).join(' · ')}</div>`
      : '';

    return `
<section class="day">
  <h3 class="day-h"><span class="day-dow">${e(L.dow)}</span> <span class="day-date">${e(L.short)}</span> <span class="day-lodge">${e(lodgeShort)}</span></h3>
  ${anchors}
  ${warn}
  ${opts}
</section>`;
  }).join('\n');

  return `
<section class="part" id="daybyday">
  <h2 class="part-h">Part II · Day by day</h2>
  <div class="legend"><b>Note</b> <span class="lg">Anchors are fixed. Option sets are alternatives — pick one, not all.</span></div>
${blocks}
</section>`;
}

// ---------------------------------------------------- page: closed matrix

function matrixSection() {
  const withHours = AREA_ORDER.flatMap((area) =>
    activities
      .filter((a) => a.area === area && !LODGING_IDS.has(a.id) && Object.keys(a.hours || {}).length > 0)
      .map((a) => ({ area, a }))
  );
  const noHours = activities.filter(
    (a) => !LODGING_IDS.has(a.id) && Object.keys(a.hours || {}).length === 0
  );

  let lastArea = null;
  const rows = withHours.map(({ area, a }) => {
    const head = area !== lastArea
      ? `<tr class="marea"><td colspan="8">${e(AREA_LABEL[area])}</td></tr>`
      : '';
    lastArea = area;
    const cells = WEEKDAYS.map((d) => {
      if (!Object.prototype.hasOwnProperty.call(a.hours, d)) return '<td class="unk">?</td>';
      const v = a.hours[d];
      if (v === null) return '<td class="cl">✕</td>';
      if (rangeText(v) === 'open all day') return '<td class="op">✓</td>';
      return `<td class="op">${e(compactRange(v))}</td>`;
    }).join('');
    return `${head}<tr><td class="mn">${GLYPH[a.category]} ${e(shortName(a.name))}</td>${cells}</tr>`;
  }).join('\n');

  const oct = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'];
  const dateHead = WEEKDAYS.map((w) => {
    const iso = oct.find((d) => isoWeekdayKey(d) === w);
    return `<th>${WEEKDAY_LABEL[w]}${iso ? `<span class="dh">${isoToShort(iso).replace('Oct ', '')}</span>` : ''}</th>`;
  }).join('');

  return `
<section class="part" id="matrix">
  <h2 class="part-h">Part III · What's closed today</h2>
  <div class="legend"><b>Key</b> <span class="lg">✕ closed</span><span class="lg">✓ open, no fixed hours</span><span class="lg">? hours unknown</span><span class="lg">Sorted north to south. Trip dates under each weekday.</span></div>
  <table class="grid matrix">
    <thead><tr><th class="mn">Place</th>${dateHead}</tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>
  <div class="matrix-foot">
    <b>By arrangement only (no published hours):</b>
    ${noHours.map((a) => `${GLYPH[a.category]} ${e(a.name)}`).join(' · ')}
  </div>
</section>`;
}

// ------------------------------------------------------------ page: notes

function notesSection() {
  const lines = Array.from({ length: 26 }, () => '<div class="rule"></div>').join('');
  return `
<section class="part" id="notes">
  <h2 class="part-h">Notes</h2>
  <div class="notes-grid">
    <div class="notes-col">${lines}</div>
  </div>
  <div class="colophon">
    <div><b>The live version, always current:</b> jasonedelstein1.github.io/cractivities/</div>
    <div class="small">Hours, prices and phone numbers were correct when this guide was generated. Call ahead on anything that matters.</div>
  </div>
</section>`;
}

// ------------------------------------------------------------------- CSS

const CSS = `
@page { size: letter; margin: 0.5in; }

* { box-sizing: border-box; }

html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

body {
  margin: 0;
  background: #fff;
  color: #000;
  font-family: Georgia, "Times New Roman", Times, serif;
  font-size: 10pt;
  line-height: 1.25;
}

.sheet { max-width: 7.5in; margin: 0 auto; padding: 0.5in 0.5in 0.6in; }
@media print { .sheet { max-width: none; margin: 0; padding: 0; } }

b, strong { font-weight: 700; }
.dim { color: #000; opacity: 0.62; }
.nw { white-space: nowrap; }
.small { font-size: 9pt; }
.sep { opacity: 0.35; padding: 0 0.15em; }

.sans, .act-meta, .act-hours, .act-contact, .act-x, .act-book,
.legend, table, .rgn-orient, .card-h, .mast-sub, .mast-line,
.df-h, .opt-a, .day-lodge, .grp, .lab, .matrix-foot, .colophon {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
}

.lab {
  font-variant: small-caps;
  font-weight: 700;
  letter-spacing: 0.04em;
  font-size: 0.92em;
}

/* ------------------------------------------------------------- masthead */
.masthead { border-bottom: 3px solid #000; padding-bottom: 5px; margin-bottom: 8px; }
.mast-sub {
  font-size: 9pt; font-weight: 700; letter-spacing: 0.24em;
  text-transform: uppercase; margin-bottom: 2px;
}
.masthead h1 {
  font-family: Georgia, serif;
  font-size: 26pt; line-height: 0.95; margin: 1px 0 3px;
  letter-spacing: -0.015em; font-weight: 700;
}
.mast-line { font-size: 10pt; }
.mast-line.small { font-size: 8.5pt; opacity: 0.7; margin-top: 1px; }

h2.sec {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 9pt; font-weight: 700; letter-spacing: 0.18em;
  text-transform: uppercase;
  margin: 8px 0 4px;
  padding-bottom: 2px;
  border-bottom: 1px solid #000;
}

/* --------------------------------------------------------------- cards */
.cards { display: flex; gap: 12px; }
.card { flex: 1; border: 1px solid #000; padding: 6px 8px; break-inside: avoid; }
.card-h {
  font-size: 8pt; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; border-bottom: 1px solid #000;
  padding-bottom: 3px; margin-bottom: 5px;
}
.card-n { font-weight: 700; font-size: 10.5pt; line-height: 1.14; margin-bottom: 2px; }
.card-b { font-size: 9pt; margin-bottom: 2px; }
ul.tight { margin: 2px 0 3px; padding-left: 13px; font-size: 9pt; }
ul.tight li { margin-bottom: 1px; }

/* -------------------------------------------------------------- tables */
table.grid { width: 100%; border-collapse: collapse; font-size: 9pt; }
table.grid th {
  text-align: left; font-size: 8pt; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  background: #000; color: #fff; padding: 3px 5px;
  border: 1px solid #000;
}
table.grid td { border: 1px solid #000; padding: 2px 4px; vertical-align: top; }
table.grid tr { break-inside: avoid; }

table.num td.k { font-weight: 700; width: 24%; }
table.num td.v { width: 26%; }

table.days td:nth-child(1) { width: 12%; }
table.days td:nth-child(2) { width: 12%; }
table.days td:nth-child(3) { width: 38%; }
table.days td:nth-child(4) { width: 38%; }

/* Cover only: squeeze so the at-a-glance page never spills. */
.cover table.grid td { padding: 1.5px 4px; line-height: 1.18; }
.cover table.grid th { padding: 2px 4px; }
.cover ul.tight li { margin-bottom: 0; line-height: 1.2; }
.cover .card-b { line-height: 1.22; }

/* --------------------------------------------------------- don't forget */
.dontforget {
  border: 2.5px solid #000; padding: 6px 9px; margin-top: 7px;
  break-inside: avoid;
}
.df-h {
  font-size: 9.5pt; font-weight: 700; letter-spacing: 0.2em;
  text-transform: uppercase; margin-bottom: 4px;
  border-bottom: 1px solid #000; padding-bottom: 3px;
}
.dontforget ul { margin: 0; padding-left: 14px; font-size: 9pt; }
.dontforget li { margin-bottom: 1px; }
.wdate {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 7.6pt; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid #000; padding: 0 3px; margin-right: 4px;
  white-space: nowrap;
}

/* --------------------------------------------------------------- parts */
.part { break-before: page; }
.part-h {
  font-family: Georgia, serif;
  font-size: 19pt; font-weight: 700; margin: 0 0 4px;
  letter-spacing: -0.01em;
  border-bottom: 2.5px solid #000; padding-bottom: 5px;
}
.legend {
  font-size: 8.2pt; margin: 5px 0 12px; padding-bottom: 5px;
  border-bottom: 1px solid #000;
}
.legend b {
  font-variant: small-caps; letter-spacing: 0.08em; margin-right: 6px;
}
.lg { margin-right: 11px; white-space: nowrap; }
.legend .lg:last-child { white-space: normal; opacity: 0.68; }

/* ------------------------------------------------------------- regions */
.region { margin-bottom: 12px; break-inside: auto; }
h3.rgn {
  display: flex; align-items: baseline; gap: 8px;
  margin: 9px 0 1px; padding-bottom: 2px;
  border-bottom: 1.5px solid #000;
  break-after: avoid;
}
.rgn-num {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 9pt; font-weight: 700; letter-spacing: 0.05em;
  border: 1.5px solid #000; padding: 0 3px;
}
.rgn-name {
  font-family: Georgia, serif; font-size: 15pt; font-weight: 700;
  letter-spacing: -0.005em;
}
.rgn-orient { font-size: 8.5pt; margin-bottom: 5px; break-after: avoid; }

h4.grp {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 8pt; font-weight: 700; letter-spacing: 0.16em;
  text-transform: uppercase;
  margin: 7px 0 3px;
  break-after: avoid;
}
h4.grp::after {
  content: ""; display: block; border-bottom: 0.75pt solid #000;
  margin-top: 2px;
}

.keep { break-inside: avoid; page-break-inside: avoid; }

.act {
  break-inside: avoid;
  page-break-inside: avoid;
  margin: 0 0 4px;
  padding: 0 0 3px 0;
  border-bottom: 0.5pt solid #000;
}
.act:last-child { border-bottom: none; }
.act-h { display: flex; align-items: baseline; gap: 5px; margin-bottom: 1px; }
.glyph { font-size: 8pt; line-height: 1; }
.act-n { font-weight: 700; font-size: 11.5pt; line-height: 1.15; }
.act-cat {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 7.2pt; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; opacity: 0.55; white-space: nowrap;
}
.act-meta { font-size: 9.2pt; margin-bottom: 1px; }
.flag { border: 1px solid #000; padding: 0 3px; font-size: 8.2pt; }
.act-hours { font-size: 9.2pt; margin-bottom: 2px; }
.act-desc { font-size: 10pt; margin-bottom: 2px; }
ul.hl { margin: 1px 0 2px; padding-left: 13px; font-size: 9.5pt; }
ul.hl li { margin-bottom: 0.5px; }
.act-note { font-size: 9.5pt; margin-bottom: 1px; }
.act-book, .act-contact, .act-x { font-size: 8.8pt; margin-bottom: 1px; }
.act-contact { letter-spacing: 0.005em; }

/* ---------------------------------------------------------- day by day */
.day { break-inside: avoid; page-break-inside: avoid; margin-bottom: 11px; }
h3.day-h {
  display: flex; align-items: baseline; gap: 8px;
  margin: 0 0 5px; padding-bottom: 3px;
  border-bottom: 1.5px solid #000;
}
.day-dow {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 9pt; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase;
  border: 1.5px solid #000; padding: 0 4px;
}
.day-date { font-family: Georgia, serif; font-size: 15pt; font-weight: 700; }
.day-lodge {
  font-size: 8.2pt; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; margin-left: auto; opacity: 0.7;
}
table.anch { margin-bottom: 5px; }
table.anch td.t { width: 9%; font-weight: 700; white-space: nowrap; }
table.anch td.ph { width: 22%; white-space: nowrap; }
.anote { opacity: 0.75; }
.noanchor { font-size: 9pt; font-style: italic; margin-bottom: 5px; opacity: 0.7; }
.daywarn {
  font-size: 8.8pt; border-left: 3px solid #000; padding: 2px 0 2px 7px;
  margin: 0 0 6px;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
}
.daywarn b {
  font-variant: small-caps; letter-spacing: 0.08em; margin-right: 4px;
}
.opt { margin: 0 0 5px; padding-left: 9px; border-left: 0.75pt solid #000; }
.opt-n { font-weight: 700; font-size: 10.5pt; }
.opt-b { font-size: 9.4pt; margin-bottom: 2px; }
ol.opt-l { margin: 0; padding-left: 16px; font-size: 9.4pt; }
ol.opt-l li { margin-bottom: 0.5px; }
.opt-a { font-size: 8pt; letter-spacing: 0.04em; opacity: 0.62; }
.closedtag {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 7pt; letter-spacing: 0.08em; border: 1px solid #000; padding: 0 2px;
}

/* -------------------------------------------------------------- matrix */
table.matrix { font-size: 9pt; table-layout: fixed; }
table.matrix th.mn, table.matrix td.mn { width: 28%; text-align: left; white-space: normal; overflow-wrap: break-word; line-height: 1.12; }
table.matrix th { text-align: center; padding: 3px 1px; }
table.matrix th .dh {
  display: block; font-size: 6.6pt; letter-spacing: 0.04em; opacity: 0.85;
}
table.matrix td { text-align: center; white-space: nowrap; padding: 1.5px 1px; }
table.matrix td.mn { text-align: left; font-weight: 400; }
table.matrix td.cl { font-weight: 700; }
table.matrix td.unk { opacity: 0.45; }
tr.marea td {
  background: #000; color: #fff;
  font-size: 7.4pt; font-weight: 700; letter-spacing: 0.16em;
  text-transform: uppercase; padding: 2px 5px;
}
.matrix-foot { font-size: 8.6pt; margin-top: 8px; border-top: 1px solid #000; padding-top: 5px; }

/* --------------------------------------------------------------- notes */
.notes-grid { margin-top: 10px; }
.rule { border-bottom: 0.5pt solid #000; height: 0.32in; }
.colophon {
  margin-top: 18px; border-top: 2.5px solid #000; padding-top: 7px;
  font-size: 9pt;
}
.colophon .small { opacity: 0.7; margin-top: 3px; }
`;

// ------------------------------------------------------------------ build

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Caribe Sur · Field Guide · Oct 5–10 2026</title>
<style>${CSS}</style>
</head>
<body>
<div class="sheet">
${coverSection()}
${regionsSection()}
${daysSection()}
${matrixSection()}
${notesSection()}
</div>
</body>
</html>
`;

fs.writeFileSync(`${ROOT}/public/guide.html`, html, 'utf8');
console.log('wrote guide.html', html.length, 'bytes');

// quick data sanity report
const ids = new Set(activities.map((a) => a.id));
const problems = [];
for (const a of activities) {
  for (const r of [...(a.pairsWith || []), ...(a.alternatives || [])]) {
    if (!ids.has(r)) problems.push(`${a.id}: unknown ref ${r}`);
  }
}
for (const d of days) {
  for (const o of d.optionSets) {
    for (const id of o.activityIds) if (!ids.has(id)) problems.push(`${d.date}/${o.name}: unknown id ${id}`);
  }
}
// closed-on-suggested-day checks
for (const d of days) {
  const wk = isoWeekdayKey(d.date);
  for (const o of d.optionSets) {
    for (const id of o.activityIds) {
      const a = byId.get(id);
      if (a && a.hours && a.hours[wk] === null) problems.push(`${d.date} (${wk}) "${o.name}" suggests ${id} but it is CLOSED`);
    }
  }
}
for (const a of activities) {
  for (const b of a.bestDays) {
    const wk = isoWeekdayKey(b);
    if (a.hours && a.hours[wk] === null) problems.push(`${a.id}: bestDay ${b} (${wk}) but closed that day`);
  }
}
console.log(problems.length ? problems.join('\n') : 'no ref/closure problems');
