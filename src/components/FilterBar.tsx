import { AREAS, AREA_LABEL, CATEGORIES, CATEGORY_LABEL } from '../data/schema';
import { useApp } from '../lib/app-context';
import { DEFAULT_FILTERS } from '../lib/store';
import { categoryColor } from './StatusChips';

export function FilterBar() {
  const { filters, location, requestLocation, lodging, originIsUser } = useApp();
  const f = filters.filters;

  const isDefault =
    f.categories.length === 0 &&
    f.areas.length === 0 &&
    f.openNow === DEFAULT_FILTERS.openNow &&
    f.nearMe === DEFAULT_FILTERS.nearMe &&
    f.hideDoneSkipped === DEFAULT_FILTERS.hideDoneSkipped;

  const onNearMe = () => {
    const next = !f.nearMe;
    filters.update({ nearMe: next });
    if (next && location.kind !== 'granted') requestLocation();
  };

  return (
    <div className="filterbar" role="region" aria-label="Filters">
      <div className="rows">
        <div className="chip-row" aria-label="Toggles">
          <button
            type="button"
            className="fchip toggle"
            aria-pressed={f.openNow}
            onClick={() => filters.update({ openNow: !f.openNow })}
          >
            Open now
          </button>
          <button
            type="button"
            className="fchip toggle"
            aria-pressed={f.nearMe}
            onClick={onNearMe}
            disabled={location.kind === 'loading'}
          >
            {location.kind === 'loading' ? 'Locating…' : 'Near me'}
          </button>
          <button
            type="button"
            className="fchip toggle"
            aria-pressed={f.hideDoneSkipped}
            onClick={() => filters.update({ hideDoneSkipped: !f.hideDoneSkipped })}
          >
            Hide done/skipped
          </button>
          {!isDefault && (
            <button type="button" className="fchip reset" onClick={filters.reset}>
              Reset
            </button>
          )}
        </div>
        <div className="chip-row" aria-label="Categories">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              className="fchip"
              aria-pressed={f.categories.includes(c)}
              onClick={() => filters.toggleCategory(c)}
              style={{ ['--cat' as string]: categoryColor(c) }}
            >
              <span className="dot" />
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        <div className="chip-row" aria-label="Areas">
          {AREAS.map((a) => (
            <button
              type="button"
              key={a}
              className="fchip"
              aria-pressed={f.areas.includes(a)}
              onClick={() => filters.toggleArea(a)}
            >
              {AREA_LABEL[a]}
            </button>
          ))}
        </div>
      </div>
      {f.nearMe && (
        <div className={`location-note${originIsUser ? '' : ' warn'}`}>
          {location.kind === 'granted' && <span>Distances from your location.</span>}
          {location.kind === 'loading' && <span>Getting your location…</span>}
          {location.kind === 'denied' && (
            <span>Location denied — distances are from {lodging.name.split(' — ')[0]} instead.</span>
          )}
          {location.kind === 'unavailable' && (
            <span>Location unavailable — distances are from {lodging.name.split(' — ')[0]} instead.</span>
          )}
          {location.kind === 'idle' && <span>Distances from {lodging.name.split(' — ')[0]}.</span>}
          {(location.kind === 'denied' || location.kind === 'unavailable') && (
            <button type="button" className="fchip" onClick={requestLocation}>
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
