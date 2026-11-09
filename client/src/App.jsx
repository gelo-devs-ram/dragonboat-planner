import { useEffect, useState } from 'react';
import { getToken, getUser, logout } from './api.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Races from './pages/Races.jsx';
import Members from './pages/Members.jsx';
import Training from './pages/Training.jsx';
import Lineup from './pages/Lineup.jsx';

const PAGES = [
  { id: 'dashboard', label: 'Dashboard', View: Dashboard },
  { id: 'races', label: 'Races', View: Races },
  { id: 'members', label: 'Members', View: Members },
  { id: 'training', label: 'Training and attendance', View: Training },
  { id: 'lineup', label: 'Line-up', View: Lineup },
];

export default function App() {
  const [signedIn, setSignedIn] = useState(!!getToken());
  const [page, setPage] = useState('dashboard');

  // The API client fires this when the server says the login has expired.
  useEffect(() => {
    const expired = () => setSignedIn(false);
    window.addEventListener('auth-expired', expired);
    return () => window.removeEventListener('auth-expired', expired);
  }, []);

  if (!signedIn) return <Login onSuccess={() => { setPage('dashboard'); setSignedIn(true); }} />;

  const { View } = PAGES.find((p) => p.id === page);

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <img src="/favicon.svg" alt="" className="brand-logo" />
          Dragonboat Planner
        </div>
        <nav>
          {PAGES.map((p) => (
            <button key={p.id} className={p.id === page ? 'nav on' : 'nav'} onClick={() => setPage(p.id)}>
              {p.label}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <span>Signed in as {getUser()}</span>
          <button className="btn" onClick={() => { logout(); setSignedIn(false); }}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <View go={setPage} />
      </main>
    </div>
  );
}
