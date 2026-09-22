import { useMemo, useState } from 'react';
import { listedActivities } from '../data';
import { AREAS, AREA_LABEL, type Area } from '../data/schema';
import { ActivityCard } from '../components/ActivityCard';
import { FilterBar } from '../components/FilterBar';
import { useApp } from '../lib/app-context';
import { applyFilters, matchesSearch, sortByDistance, sortByTimeThenDistance } from '../lib/filter';

export function Browse() {
  const { date, now, marks, filters, distanceTo } = useApp();
  const f = filters.filters;
  const [q, setQ] = useState('');

  const visible = useMemo(() => {
    const filtered = applyFilters(listedActivities, { filters: f, date, minutes: now.minutes, getMarks: marks.get }).filter(
      (a) => matchesSearch(a, q),
    );
    return f.nearMe ? sortByDistance(filtered, distanceTo) : sortByTimeThenDistance(filtered, distanceTo);
  }, [f, date, now.minutes, marks.get, q, distanceTo]);

  // Group by area; when "Near me" is on, flatten into one distance-sorted list.
  const groups = useMemo(() => {
    if (f.nearMe) return null;
    const byArea = new Map<Area, typeof visible>();
    for (const a of visible) {
      const list = byArea.get(a.area) ?? [];
      list.push(a);
      byArea.set(a.area, list);
    }
    return AREAS.filter((ar) => byArea.has(ar)).map((ar) => ({ area: ar, items: byArea.get(ar)! }));
  }, [visible, f.nearMe]);

  return (
    <div className="page">
      <header className="page-header">
        <div className="eyebrow">Everything</div>
        <h1>Browse</h1>
        <div className="sub">{visible.length} of {listedActivities.length} options</div>
      </header>

      <FilterBar />

      <div className="search">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search names, descriptions, tags…"
          aria-label="Search activities"
          autoCapitalize="none"
          autoCorrect="off"
        />
      </div>

      {visible.length === 0 && <div className="empty">Nothing matches.</div>}

      {groups
        ? groups.map((g) => (
            <section key={g.area} aria-labelledby={`area-${g.area}`}>
              <h2 className="group-title" id={`area-${g.area}`}>
                {AREA_LABEL[g.area]} <span style={{ fontWeight: 400 }}>· {g.items.length}</span>
              </h2>
              <div className="card-list">
                {g.items.map((a) => (
                  <ActivityCard key={a.id} activity={a} />
                ))}
              </div>
            </section>
          ))
        : (
            <div className="card-list" style={{ marginTop: 14 }}>
              {visible.map((a) => (
                <ActivityCard key={a.id} activity={a} />
              ))}
            </div>
          )}
    </div>
  );
}
