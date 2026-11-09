import { useEffect, useMemo, useState } from 'react';
import { api, fmtDate } from '../api.js';

const BENCHES = Array.from({ length: 10 }, (_, i) => i + 1);

export default function Lineup() {
  const [races, setRaces] = useState([]);
  const [members, setMembers] = useState([]);
  const [raceId, setRaceId] = useState('');
  const [a, setA] = useState({}); // seat -> member id
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/api/races'), api.get('/api/members')])
      .then(([r, m]) => {
        setRaces(r);
        setMembers(m);
        if (r[0]) setRaceId(String(r[0].id));
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!raceId) return;
    setMsg('');
    api.get(`/api/races/${raceId}/lineup`).then(setA).catch((e) => setError(e.message));
  }, [raceId]);

  const byId = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const used = new Set(Object.values(a).filter(Boolean).map(Number));
  const seated = [...used].map((id) => byId[id]).filter(Boolean);

  const side = (prefix) =>
    BENCHES.reduce((sum, n) => sum + (byId[a[prefix + n]]?.weight_kg || 0), 0);
  const left = side('L');
  const right = side('R');

  const setSeat = (seat, value) => {
    setMsg('');
    setA((prev) => ({ ...prev, [seat]: value }));
  };

  // Fill the 20 paddling seats with the top 20 by selection chance, alternating left/right.
  const autoFill = () => {
    const keep = {};
    ['drummer', 'steer'].forEach((s) => a[s] && (keep[s] = a[s]));
    const taken = new Set(Object.values(keep).map(Number));
    const pool = members
      .filter((m) => !taken.has(m.id))
      .sort((x, y) => y.selection_probability - x.selection_probability)
      .slice(0, 20);
    const next = { ...keep };
    pool.forEach((m, i) => {
      next[`${i % 2 ? 'R' : 'L'}${Math.floor(i / 2) + 1}`] = m.id;
    });
    setMsg('');
    setA(next);
  };

  const save = async () => {
    setError('');
    try {
      const res = await api.put(`/api/races/${raceId}/lineup`, { assignments: a });
      setMsg(`Line-up saved with ${res.saved} seats filled.`);
    } catch (e) {
      setError(e.message);
    }
  };

  const seat = (key, label) => (
    <select value={a[key] ?? ''} onChange={(e) => setSeat(key, e.target.value)} aria-label={label}>
      <option value="">Empty</option>
      {members.map((m) => (
        <option key={m.id} value={m.id} disabled={used.has(m.id) && Number(a[key]) !== m.id}>
          {m.name} ({m.selection_probability}%)
        </option>
      ))}
    </select>
  );

  const race = races.find((r) => String(r.id) === raceId);

  if (races.length === 0 && !error) {
    return (
      <>
        <header className="page-head"><div><h1>Line-up</h1></div></header>
        <p className="empty">Post a race first. Then you can assign paddlers to seats.</p>
      </>
    );
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Line-up</h1>
          <p className="muted">Assign paddlers seat by seat. The percentage beside each name is their selection chance.</p>
        </div>
      </header>

      <div className="lineup-bar">
        <label>
          Race
          <select value={raceId} onChange={(e) => setRaceId(e.target.value)}>
            {races.map((r) => (
              <option key={r.id} value={r.id}>{r.name} ({fmtDate(r.date)})</option>
            ))}
          </select>
        </label>
        <div className="row-gap">
          <button className="btn" onClick={autoFill}>Fill by selection chance</button>
          <button className="btn" onClick={() => { setMsg(''); setA({}); }}>Clear seats</button>
          <button className="btn primary" onClick={save}>Save line-up</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {msg && <p className="ok">{msg}</p>}

      <div className="lineup-grid">
        <div className="boat" aria-label={race ? `Boat for ${race.name}` : 'Boat'}>
          <div className="seat drum">
            <span>Drummer</span>
            {seat('drummer', 'Drummer')}
          </div>
          <div className="bench head"><span /><span>Left</span><span>Right</span></div>
          {BENCHES.map((n) => (
            <div className="bench" key={n}>
              <b>{n}</b>
              {seat('L' + n, `Bench ${n} left`)}
              {seat('R' + n, `Bench ${n} right`)}
            </div>
          ))}
          <div className="seat steer">
            <span>Steersperson</span>
            {seat('steer', 'Steersperson')}
          </div>
        </div>

        <aside className="balance">
          <h2>Boat check</h2>
          <dl>
            <dt>Seats filled</dt><dd>{used.size} of 22</dd>
            <dt>Men / women</dt>
            <dd>{seated.filter((m) => m.gender === 'Male').length} / {seated.filter((m) => m.gender === 'Female').length}</dd>
            <dt>Left side weight</dt><dd>{left ? `${left.toFixed(0)} kg` : '-'}</dd>
            <dt>Right side weight</dt><dd>{right ? `${right.toFixed(0)} kg` : '-'}</dd>
            <dt>Difference</dt>
            <dd className={Math.abs(left - right) > 15 ? 'warn' : ''}>
              {left || right ? `${Math.abs(left - right).toFixed(0)} kg` : '-'}
            </dd>
          </dl>
          {Math.abs(left - right) > 15 && <p className="warn">The boat leans to one side. Move a heavier paddler across.</p>}
        </aside>
      </div>
    </>
  );
}
