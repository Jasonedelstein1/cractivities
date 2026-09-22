import type { Activity } from '../data/schema';
import { AREA_LABEL } from '../data/schema';
import { useApp } from '../lib/app-context';
import { formatDistance } from '../lib/geo';
import { isClosedOnDate } from '../lib/time';
import { CategoryChip, StatusChips, categoryColor } from './StatusChips';

interface Props {
  activity: Activity;
  /** Show distance chip (requires an origin — always true since lodging is the fallback). */
  showDistance?: boolean;
}

export function ActivityCard({ activity, showDistance = true }: Props) {
  const { date, now, marks, distanceTo, openDetail } = useApp();
  const m = marks.get(activity.id);
  const closed = isClosedOnDate(activity, date);
  const km = distanceTo(activity);

  const cls = ['card'];
  if (closed) cls.push('is-closed');
  if (m.done) cls.push('is-done');
  if (m.skipped) cls.push('is-skipped');

  return (
    <button
      type="button"
      className={cls.join(' ')}
      style={{ ['--cat' as string]: categoryColor(activity.category) }}
      onClick={() => openDetail(activity.id)}
      aria-label={`${activity.name}, ${AREA_LABEL[activity.area]}`}
    >
      <div className="row">
        <span className="name">{activity.name}</span>
        {m.favorite && <span className="fav" aria-label="Favorite">♥</span>}
        {m.done && <span className="chip state">Done</span>}
        {m.skipped && <span className="chip state">Skipped</span>}
      </div>
      <div className="desc">{activity.description}</div>
      <div className="chips">
        <CategoryChip category={activity.category} />
        <span className="chip">{AREA_LABEL[activity.area]}</span>
        <StatusChips activity={activity} date={date} minutes={now.minutes} compact />
        {showDistance && <span className="chip dist">{formatDistance(km)}</span>}
        {activity.requiresBooking && <span className="chip">Book ahead</span>}
      </div>
    </button>
  );
}
