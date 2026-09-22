import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Activity, Day } from '../data/schema';
import { activityById, dayFor, lodgingFor } from '../data';
import { haversineKm, type LatLng } from './geo';
import { useFilters, useMarks } from './store';
import { isTripDate, nowCR, TRIP_START, type CRNow } from './time';

export type LocationState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'granted'; point: LatLng; at: number }
  | { kind: 'denied' }
  | { kind: 'unavailable' };

interface AppState {
  now: CRNow;
  /** ISO date being viewed. Equals now.date during the trip, else the picked date. */
  date: string;
  setDate: (iso: string) => void;
  isLive: boolean;
  day: Day | undefined;
  lodging: Activity;
  marks: ReturnType<typeof useMarks>;
  filters: ReturnType<typeof useFilters>;
  location: LocationState;
  requestLocation: () => void;
  /** Where distances are measured from: the phone, or the day's lodging. */
  origin: LatLng;
  originIsUser: boolean;
  distanceTo: (a: Activity) => number;
  selectedId: string | null;
  openDetail: (id: string) => void;
  closeDetail: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState<CRNow>(() => nowCR());
  useEffect(() => {
    const tick = () => setNow(nowCR());
    const id = window.setInterval(tick, 30_000);
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const isLive = isTripDate(now.date);
  const [pickedDate, setPickedDate] = useState<string>(TRIP_START);
  const date = isLive ? now.date : pickedDate;

  const day = useMemo(() => dayFor(date), [date]);
  const lodging = useMemo(() => lodgingFor(date), [date]);

  const marks = useMarks();
  const filters = useFilters();

  const [location, setLocation] = useState<LocationState>({ kind: 'idle' });
  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocation({ kind: 'unavailable' });
      return;
    }
    setLocation({ kind: 'loading' });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocation({
          kind: 'granted',
          point: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          at: Date.now(),
        }),
      (err) => setLocation({ kind: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }, []);

  // If "Near me" was persisted on, ask once on load.
  useEffect(() => {
    if (filters.filters.nearMe && location.kind === 'idle') requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const originIsUser = location.kind === 'granted';
  const origin: LatLng = originIsUser
    ? (location as Extract<LocationState, { kind: 'granted' }>).point
    : { lat: lodging.lat, lng: lodging.lng };

  const distanceTo = useCallback((a: Activity) => haversineKm(origin, a), [origin]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const openDetail = useCallback((id: string) => {
    if (activityById[id]) setSelectedId(id);
  }, []);
  const closeDetail = useCallback(() => setSelectedId(null), []);

  const value: AppState = {
    now,
    date,
    setDate: setPickedDate,
    isLive,
    day,
    lodging,
    marks,
    filters,
    location,
    requestLocation,
    origin,
    originIsUser,
    distanceTo,
    selectedId,
    openDetail,
    closeDetail,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}
