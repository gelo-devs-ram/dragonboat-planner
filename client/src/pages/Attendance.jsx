import { useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';

export default function Attendance({ session, onClose, onSaved }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/api/sessions/${session.id}/attendance`).then(setRows).catch((e) => setError(e.message));
  }, [session.id]);

  const toggle = (id) => setRows(rows.map((r) => (r.member_id === id ? { ...r, present: r.present ? 0 : 1 } : r)));
  const setAll = (v) => setRows(rows.map((r) => ({ ...r, present: v })));

  const save = async () => {
    try {
      await api.put(`/api/sessions/${session.id}/attendance`, {
        present: rows.filter((r) => r.present).map((r) => r.member_id),
      });
      onSaved();
    } catch (e) {
      setError(e.message);
    }
  };

  const count = rows ? rows.filter((r) => r.present).length : 0;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog wide" onClick={(e) => e.stopPropagation()}>
        <h2>{session.title}</h2>
        <p className="muted">{fmtDate(session.date)}. Tick everyone who attended.</p>
        {error && <p className="error">{error}</p>}
        {!rows && !error && <p className="muted">Loading members...</p>}
        {rows && rows.length === 0 && <p className="empty">Add members first, then come back to take attendance.</p>}
        {rows && rows.length > 0 && (
          <>
            <div className="checklist-tools">
              <span>
                <b>{count}</b> of {rows.length} present
              </span>
              <span>
                <button className="btn" onClick={() => setAll(1)}>Mark all present</button>
                <button className="btn" onClick={() => setAll(0)}>Clear all</button>
              </span>
            </div>
            <ul className="checklist">
              {rows.map((r) => (
                <li key={r.member_id}>
                  <label>
                    <input type="checkbox" checked={!!r.present} onChange={() => toggle(r.member_id)} />
                    {r.name}
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="dialog-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={!rows || rows.length === 0}>
            Save attendance
          </button>
        </div>
      </div>
    </div>
  );
}
