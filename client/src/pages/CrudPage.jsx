import { useEffect, useState } from 'react';
import { api } from '../api.js';

// Generic list + add/edit/delete page used by Races, Members and Training.
export default function CrudPage({ title, intro, endpoint, noun, fields, columns, rowActions, children }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get(endpoint).then(setRows).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [endpoint]);

  const startNew = () => {
    setError('');
    setForm(Object.fromEntries(fields.map((f) => [f.key, f.default ?? ''])));
  };
  const startEdit = (row) => {
    setError('');
    setForm({ ...row });
  };
  const change = (f, value) =>
    setForm({ ...form, [f.key]: f.type === 'number' && value !== '' ? Number(value) : value });

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (form.id) await api.put(`${endpoint}/${form.id}`, form);
      else await api.post(endpoint, form);
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete this ${noun}? This cannot be undone.`)) return;
    try {
      await api.del(`${endpoint}/${row.id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{title}</h1>
          <p className="muted">{intro}</p>
        </div>
        <button className="btn primary" onClick={startNew}>
          Add {noun}
        </button>
      </header>

      {error && !form && <p className="error">{error}</p>}
      {children && children(rows, load)}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.label}>{c.label}</th>
              ))}
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="empty">
                  No {noun}s yet. Select "Add {noun}" to create the first one.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={c.label}>{c.render(row)}</td>
                ))}
                <td className="actions">
                  {rowActions && rowActions(row, load)}
                  <button className="btn" onClick={() => startEdit(row)}>
                    Edit
                  </button>
                  <button className="btn danger" onClick={() => remove(row)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="overlay" onClick={() => setForm(null)}>
          <form className="dialog" onSubmit={save} onClick={(e) => e.stopPropagation()}>
            <h2>
              {form.id ? 'Edit' : 'Add'} {noun}
            </h2>
            {fields.map((f) => (
              <label key={f.key}>
                {f.label}
                {f.type === 'select' ? (
                  <select value={form[f.key]} onChange={(e) => change(f, e.target.value)} required={f.required !== false}>
                    {f.placeholder && <option value="">{f.placeholder}</option>}
                    {f.options.map((o) => (
                      <option key={o.value ?? o} value={o.value ?? o}>
                        {o.label ?? o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    value={form[f.key] ?? ''}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    required={f.required !== false}
                    onChange={(e) => change(f, e.target.value)}
                  />
                )}
              </label>
            ))}
            {error && <p className="error">{error}</p>}
            <div className="dialog-actions">
              <button type="button" className="btn" onClick={() => setForm(null)}>
                Cancel
              </button>
              <button type="submit" className="btn primary">
                Save {noun}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
