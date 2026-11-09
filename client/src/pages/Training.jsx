import { useState } from 'react';
import CrudPage from './CrudPage.jsx';
import Attendance from './Attendance.jsx';
import { fmtDate, fmtTime } from '../api.js';

const fields = [
  { key: 'title', label: 'Session title', type: 'text' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'time', label: 'Time', type: 'time' },
  { key: 'location', label: 'Location', type: 'text' },
];

export default function Training() {
  const [session, setSession] = useState(null);
  const [version, setVersion] = useState(0); // bumps to refresh the table after saving attendance

  const columns = [
    { label: 'Session', render: (s) => <strong>{s.title}</strong> },
    { label: 'Date', render: (s) => fmtDate(s.date) },
    { label: 'Time', render: (s) => fmtTime(s.time) },
    { label: 'Location', render: (s) => s.location },
    { label: 'Attendance', render: (s) => (s.recorded ? `${s.present_count} of ${s.recorded} present` : 'Not taken yet') },
  ];

  return (
    <>
      <CrudPage
        key={version}
        title="Training and attendance"
        intro="Schedule sessions, then tick off who showed up."
        endpoint="/api/sessions"
        noun="session"
        fields={fields}
        columns={columns}
        rowActions={(s) => (
          <button className="btn accent" onClick={() => setSession(s)}>
            Take attendance
          </button>
        )}
      />
      {session && (
        <Attendance
          session={session}
          onClose={() => setSession(null)}
          onSaved={() => {
            setSession(null);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </>
  );
}
