import { useEffect, useState } from 'react';
import { api, fmtDate, fmtTime } from '../api.js';
import { Chance } from './Members.jsx';

export default function Dashboard({ go }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/dashboard').then(setD).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!d) return <p className="muted">Loading dashboard...</p>;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Coach dashboard</h1>
          <p className="muted">
            {d.memberCount} paddlers, {d.upcomingRaces} upcoming races, {d.upcomingSessions} upcoming sessions,{' '}
            {d.avgAttendance}% average attendance.
          </p>
        </div>
      </header>

      <section className="next">
        <div className="next-race">
          <p className="muted">Next race</p>
          {d.nextRace ? (
            <>
              <h2>{d.nextRace.name}</h2>
              <p>
                {fmtDate(d.nextRace.date)} at {fmtTime(d.nextRace.time)}
              </p>
              <p className="muted">
                {d.nextRace.location}. Organized by {d.nextRace.organizers}.
              </p>
              <button className="btn primary" onClick={() => go('lineup')}>
                Build line-up
              </button>
            </>
          ) : (
            <>
              <h2>No race scheduled</h2>
              <button className="btn primary" onClick={() => go('races')}>Post a race</button>
            </>
          )}
        </div>
        <div className="next-session">
          <p className="muted">Next training</p>
          {d.nextSession ? (
            <>
              <h3>{d.nextSession.title}</h3>
              <p>
                {fmtDate(d.nextSession.date)} at {fmtTime(d.nextSession.time)}
              </p>
              <p className="muted">{d.nextSession.location}</p>
            </>
          ) : (
            <>
              <h3>Nothing scheduled</h3>
              <button className="btn" onClick={() => go('training')}>Schedule training</button>
            </>
          )}
        </div>
      </section>

      <h2 className="section-title">Who is most likely to race</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Paddler</th>
              <th>Rating</th>
              <th>Attendance</th>
              <th>Selection chance</th>
            </tr>
          </thead>
          <tbody>
            {d.ranking.length === 0 && (
              <tr><td colSpan="4" className="empty">Add members to see the ranking.</td></tr>
            )}
            {d.ranking.map((m) => (
              <tr key={m.id}>
                <td><strong>{m.name}</strong></td>
                <td>{m.rating} / 5</td>
                <td>{m.attendance_rate}%</td>
                <td><Chance value={m.selection_probability} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
