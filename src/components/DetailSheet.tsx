import { useEffect, useRef } from 'react';
import { activityById } from '../data';
import { AREA_LABEL, WEEKDAYS, WEEKDAY_LABEL } from '../data/schema';
import { useApp } from '../lib/app-context';
import { formatDistance, googleDirectionsUrl, telUrl, whatsappUrl } from '../lib/geo';
import { hoursKnown, isAllDay, weekdayOf } from '../lib/time';
import { CategoryChip, StatusChips } from './StatusChips';

export function DetailSheet() {
  const { selectedId, closeDetail, openDetail, date, now, marks, distanceTo, originIsUser } = useApp();
  const activity = selectedId ? activityById[selectedId] : undefined;
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock body scroll and close on Escape while open.
  useEffect(() => {
    if (!activity) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeDetail();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [activity, closeDetail]);

  // Swipe down to dismiss. Starts only when the sheet is scrolled to the top so
  // normal content scrolling still works. Native listeners because React's
  // touch events are passive and can't preventDefault the scroll.
  useEffect(() => {
    const el = sheetRef.current;
    if (!el || !activity) return;
    el.style.transform = '';
    el.style.transition = '';
    let startY = 0;
    let dy = 0;
    let dragging = false;
    let fromTop = false;
    const onStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      dy = 0;
      dragging = false;
      fromTop = el.scrollTop <= 0;
      el.style.transition = 'none';
    };
    const onMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY - startY;
      if (!dragging) {
        if (fromTop && y > 8) dragging = true;
        else return;
      }
      dy = Math.max(0, y);
      el.style.transform = `translateY(${dy}px)`;
      if (e.cancelable) e.preventDefault();
    };
    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      el.style.transition = 'transform 200ms ease-out';
      if (dy > 110) {
        el.style.transform = 'translateY(100%)';
        window.setTimeout(closeDetail, 180);
      } else {
        el.style.transform = '';
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [activity, closeDetail]);

  if (!activity) return null;

  const m = marks.get(activity.id);
  const km = distanceTo(activity);
  const todayKey = weekdayOf(date);
  const phone = activity.booking?.phone;
  const wa = activity.booking?.whatsapp;
  const related = (ids: string[] | undefined) => (ids ?? []).map((id) => activityById[id]).filter(Boolean);

  return (
    <>
      <div className="sheet-backdrop" onClick={closeDetail} aria-hidden="true" />
      <div className="sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="grabber" aria-hidden="true" />
        <button type="button" className="icon-btn close" onClick={closeDetail} aria-label="Close">
          ✕
        </button>
        <h2 id="sheet-title">{activity.name}</h2>

        <div className="meta-row">
          <CategoryChip category={activity.category} />
          <span className="chip">{AREA_LABEL[activity.area]}</span>
          <span className="chip dist" title={originIsUser ? 'From your location' : 'From your lodging'}>
            {formatDistance(km)}
            {!originIsUser && ' · from lodging'}
          </span>
          <StatusChips activity={activity} date={date} minutes={now.minutes} />
        </div>

        <div className="actions-row">
          <a
            className="action primary"
            href={googleDirectionsUrl(activity)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="ico">➤</span>Directions
          </a>
          {phone && (
            <a className="action" href={telUrl(phone)}>
              <span className="ico">☏</span>Call
            </a>
          )}
          {wa && (
            <a className="action" href={whatsappUrl(wa)} target="_blank" rel="noopener noreferrer">
              <span className="ico">✆</span>WhatsApp
            </a>
          )}
          {activity.website && (
            <a className="action" href={activity.website} target="_blank" rel="noopener noreferrer">
              <span className="ico">⌂</span>Website
            </a>
          )}
          {activity.booking?.url && (
            <a className="action" href={activity.booking.url} target="_blank" rel="noopener noreferrer">
              <span className="ico">✓</span>Book
            </a>
          )}
        </div>

        <div className="toggles">
          <button
            type="button"
            className="toggle-btn"
            aria-pressed={m.done}
            onClick={() => marks.toggle(activity.id, 'done')}
          >
            {m.done ? '✓ Done' : 'Done'}
          </button>
          <button
            type="button"
            className="toggle-btn"
            aria-pressed={m.skipped}
            onClick={() => marks.toggle(activity.id, 'skipped')}
          >
            {m.skipped ? '✓ Skipped' : 'Skip'}
          </button>
          <button
            type="button"
            className="toggle-btn fav"
            aria-pressed={m.favorite}
            onClick={() => marks.toggle(activity.id, 'favorite')}
          >
            {m.favorite ? '♥ Favorite' : '♡ Favorite'}
          </button>
        </div>

        <p>{activity.description}</p>
        {activity.highlights.length > 0 && (
          <ul className="bullets">
            {activity.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}
        {activity.notes && <div className="notes">{activity.notes}</div>}

        <dl className="facts">
          {activity.price && (
            <>
              <dt>Price</dt>
              <dd>{activity.price}</dd>
            </>
          )}
          {activity.duration && (
            <>
              <dt>Duration</dt>
              <dd>{activity.duration}</dd>
            </>
          )}
          <dt>Booking</dt>
          <dd>
            {activity.requiresBooking ? 'Required' : 'Not required'}
            {activity.bookingLeadTime ? ` · ${activity.bookingLeadTime}` : ''}
          </dd>
          {activity.booking?.method && (
            <>
              <dt>How</dt>
              <dd>{activity.booking.method}</dd>
            </>
          )}
          {activity.booking?.email && (
            <>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${activity.booking.email}`}>{activity.booking.email}</a>
              </dd>
            </>
          )}
          {activity.bestDays.length > 0 && (
            <>
              <dt>Best on</dt>
              <dd>{activity.bestDays.map((d) => d.slice(5).replace('-', '/')).join(', ')}</dd>
            </>
          )}
        </dl>

        {hoursKnown(activity) && (
          <>
            <h3>Hours</h3>
            <table className="hours-table">
              <tbody>
                {WEEKDAYS.map((w) => {
                  const r = activity.hours[w];
                  return (
                    <tr key={w} className={w === todayKey ? 'today' : undefined}>
                      <td>{WEEKDAY_LABEL[w]}</td>
                      <td className={r === null ? 'closed' : undefined}>
                        {r === undefined
                          ? '—'
                          : r === null
                            ? 'Closed'
                            : isAllDay(r)
                              ? 'All day'
                              : `${r[0]} – ${r[1]}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {related(activity.pairsWith).length > 0 && (
          <>
            <h3>Pairs with</h3>
            <div className="related">
              {related(activity.pairsWith).map((r) => (
                <button type="button" key={r.id} onClick={() => openDetail(r.id)}>
                  {r.name}
                </button>
              ))}
            </div>
          </>
        )}
        {related(activity.alternatives).length > 0 && (
          <>
            <h3>Alternatives (pick one)</h3>
            <div className="related">
              {related(activity.alternatives).map((r) => (
                <button type="button" key={r.id} onClick={() => openDetail(r.id)}>
                  {r.name}
                </button>
              ))}
            </div>
          </>
        )}
        {activity.tags.length > 0 && (
          <>
            <h3>Tags</h3>
            <div className="chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {activity.tags.map((t) => (
                <span className="chip" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
