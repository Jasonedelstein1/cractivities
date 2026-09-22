import type { OptionSet as OptionSetT } from '../data/schema';
import { activityById } from '../data';
import { useApp } from '../lib/app-context';
import { formatKm } from '../lib/geo';
import { isClosedOnDate, openState } from '../lib/time';
import { categoryColor } from './StatusChips';

export function OptionSet({ set }: { set: OptionSetT }) {
  const { date, now, marks, distanceTo, openDetail } = useApp();
  const items = set.activityIds.map((id) => activityById[id]).filter(Boolean);

  return (
    <section className="optionset" aria-label={set.name}>
      <h3>{set.name}</h3>
      <p className="blurb">{set.blurb}</p>
      <div className="optionset-row">
        {items.map((a, i) => {
          const m = marks.get(a.id);
          const closed = isClosedOnDate(a, date);
          const s = openState(a, date, now.minutes);
          const cls = ['mini-card'];
          if (closed) cls.push('is-closed');
          if (m.done) cls.push('is-done');
          if (m.skipped) cls.push('is-skipped');
          let meta = formatKm(distanceTo(a));
          if (closed) meta = 'Closed today';
          else if (s.kind === 'open' && s.closingSoon) meta = `Closes ${s.closesAt}`;
          else if (s.kind === 'closed-now') meta = `Closed at ${s.closedAt}`;
          else if (m.done) meta = 'Done';
          else if (m.skipped) meta = 'Skipped';
          return (
            <button
              type="button"
              key={`${a.id}-${i}`}
              className={cls.join(' ')}
              style={{ ['--cat' as string]: categoryColor(a.category) }}
              onClick={() => openDetail(a.id)}
            >
              <span className="step">{i + 1}{m.favorite ? ' · ♥' : ''}</span>
              <span className="name">{a.name}</span>
              <span className="meta">{meta}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
