import { useMemo } from 'react';
import { listedActivities } from '../data';
import { ActivityCard } from '../components/ActivityCard';
import { DayAnchors } from '../components/DayAnchors';
import { FilterBar } from '../components/FilterBar';
import { OptionSet } from '../components/OptionSet';
import { useApp } from '../lib/app-context';
import { applyFilters, sortByDistance, sortByTimeThenDistance } from '../lib/filter';
import { formatDateLong, formatDateShort, tripDates } from '../lib/time';

export function Today() {
  const { date, setDate, isLive, now, day, lodging, marks, filters, distanceTo } = useApp();
  const f = filters.filters;

  const todays = useMemo(() => {
    const base = listedActivities.filter((a) => a.bestDays.length === 0 || a.bestDays.includes(date));
    const filtered = applyFilters(base, { filters: f, date, minutes: now.minutes, getMarks: marks.get });
    return f.nearMe ? sortByDistance(filtered, distanceTo) : sortByTimeThenDistance(filtered, distanceTo);
  }, [date, f, now.minutes, marks.get, distanceTo]);

  return (
    <div className="page">
      <header className="page-header">
        <div className="eyebrow">{isLive ? `Now ${now.hhmm} in Costa Rica` : `Preview · it's ${now.hhmm} in Costa Rica`}</div>
        <h1>{formatDateLong(date)}</h1>
        <div className="sub">Staying at {lodging.name.split(' — ')[0]}</div>
        {!isLive && (
          <div className="date-strip" role="tablist" aria-label="Pick a day">
            {tripDates().map((d) => (
              <button
                type="button"
                key={d}
                role="tab"
                className="date-pill"
                aria-pressed={d === date}
                onClick={() => setDate(d)}
              >
                {formatDateShort(d)}
              </button>
            ))}
          </div>
        )}
      </header>

      {day?.warnings?.map((w) => (
        <div className="warning" key={w}>
          {w}
        </div>
      ))}

      <section className="section" aria-labelledby="anchors-h">
        <div className="section-title">
          <h2 id="anchors-h">Anchors</h2>
          <span className="count">fixed</span>
        </div>
        <DayAnchors anchors={day?.anchors ?? []} />
      </section>

      {day && day.optionSets.length > 0 && (
        <section className="section" aria-labelledby="sets-h">
          <div className="section-title">
            <h2 id="sets-h">Pick a shape for the day</h2>
            <span className="count">suggestions, not a checklist</span>
          </div>
          <div className="optionsets">
            {day.optionSets.map((s) => (
              <OptionSet key={s.name} set={s} />
            ))}
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="all-h">
        <div className="section-title">
          <h2 id="all-h">All options today</h2>
          <span className="count">{todays.length}</span>
        </div>
        <FilterBar />
        <div className="card-list" style={{ marginTop: 10 }}>
          {todays.length === 0 && <div className="empty">Nothing matches these filters.</div>}
          {todays.map((a) => (
            <ActivityCard key={a.id} activity={a} />
          ))}
        </div>
      </section>
    </div>
  );
}
