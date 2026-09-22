import type { ReactElement } from 'react';
import type { Activity, Category } from '../data/schema';
import { CATEGORY_LABEL } from '../data/schema';
import { closedDaysLabel, openState } from '../lib/time';

export function categoryColor(c: Category): string {
  return `var(--cat-${c})`;
}

export function CategoryChip({ category }: { category: Category }) {
  return (
    <span className="chip cat" style={{ ['--cat' as string]: categoryColor(category) }}>
      {CATEGORY_LABEL[category]}
    </span>
  );
}

interface Props {
  activity: Activity;
  date: string;
  minutes: number;
  /** When true, only the state chip is shown (no "closed Sun"). */
  compact?: boolean;
}

/** Open now / closes 17:00 / closed today / closed Sun chips. */
export function StatusChips({ activity, date, minutes, compact }: Props) {
  const s = openState(activity, date, minutes);
  const chips: ReactElement[] = [];
  switch (s.kind) {
    case 'closed-today':
      chips.push(<span key="s" className="chip bad">Closed today</span>);
      break;
    case 'open':
      chips.push(
        <span key="s" className={`chip ${s.closingSoon ? 'soon' : 'ok'}`}>
          {s.closingSoon ? `Closes ${s.closesAt}` : `Open · closes ${s.closesAt}`}
        </span>,
      );
      break;
    case 'not-yet':
      chips.push(<span key="s" className="chip">Opens {s.opensAt}</span>);
      break;
    case 'closed-now':
      chips.push(<span key="s" className="chip soon">Closed at {s.closedAt}</span>);
      break;
    case 'all-day':
      chips.push(<span key="s" className="chip ok">Open all day</span>);
      break;
    case 'unknown':
      if (!compact) chips.push(<span key="s" className="chip">By arrangement</span>);
      break;
  }
  if (!compact) {
    const closed = closedDaysLabel(activity);
    if (closed && s.kind !== 'closed-today') chips.push(<span key="c" className="chip">{closed}</span>);
  }
  return <>{chips}</>;
}
