import { lazy, Suspense } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { DetailSheet } from './components/DetailSheet';
import { AppProvider } from './lib/app-context';
import { Browse } from './routes/Browse';
import { Today } from './routes/Today';

// Leaflet is only needed on the map route; keep it out of the first paint.
const MapRoute = lazy(() => import('./routes/Map').then((m) => ({ default: m.MapRoute })));

function Nav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      <NavLink to="/" end>
        <span className="ico" aria-hidden="true">☼</span>Today
      </NavLink>
      <NavLink to="/all">
        <span className="ico" aria-hidden="true">≡</span>Browse
      </NavLink>
      <NavLink to="/map">
        <span className="ico" aria-hidden="true">◎</span>Map
      </NavLink>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <AppProvider>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/all" element={<Browse />} />
            <Route
              path="/map"
              element={
                <Suspense fallback={<div className="page empty">Loading map…</div>}>
                  <MapRoute />
                </Suspense>
              }
            />
            <Route path="*" element={<Today />} />
          </Routes>
        </main>
        <DetailSheet />
        <Nav />
      </AppProvider>
    </BrowserRouter>
  );
}
