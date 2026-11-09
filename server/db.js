const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@libsql/client');
const { seed } = require('./seedData');

// Local: a SQLite file. Vercel: a Turso (libSQL, SQLite-compatible) database.
// Without Turso on Vercel, it falls back to a temporary file that resets on cold starts.
const onVercel = !!process.env.VERCEL;
const usingTemp = onVercel && !process.env.TURSO_DATABASE_URL;
const url =
  process.env.TURSO_DATABASE_URL ||
  (onVercel ? 'file:/tmp/dragonboat.db' : 'file:' + path.join(__dirname, 'dragonboat.db'));

const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });

const q = async (sql, args = []) => (await client.execute({ sql, args })).rows.map((r) => ({ ...r }));
const one = async (sql, args = []) => (await q(sql, args))[0];
const run = async (sql, args = []) => {
  const r = await client.execute({ sql, args });
  return { changes: r.rowsAffected, id: r.lastInsertRowid != null ? Number(r.lastInsertRowid) : null };
};
// statements: [[sql, args?], ...] run together in one transaction
const batch = (statements) => client.batch(statements.map(([sql, args = []]) => ({ sql, args })), 'write');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS members (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL,
  gender    TEXT NOT NULL CHECK (gender IN ('Male','Female')),
  age       INTEGER NOT NULL CHECK (age BETWEEN 10 AND 80),
  weight_kg REAL,
  rating    INTEGER NOT NULL DEFAULT 3 CHECK (rating BETWEEN 1 AND 5)
);
CREATE TABLE IF NOT EXISTS races (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  date       TEXT NOT NULL,
  time       TEXT NOT NULL,
  location   TEXT NOT NULL,
  organizers TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  title    TEXT NOT NULL,
  date     TEXT NOT NULL,
  time     TEXT NOT NULL,
  location TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attendance (
  session_id INTEGER NOT NULL,
  member_id  INTEGER NOT NULL,
  present    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, member_id)
);
CREATE TABLE IF NOT EXISTS lineup (
  race_id   INTEGER NOT NULL,
  seat      TEXT NOT NULL,
  member_id INTEGER NOT NULL,
  PRIMARY KEY (race_id, seat),
  UNIQUE (race_id, member_id)
);
`;

const helpers = { q, one, run, batch };

// Runs once per server start: create tables, optionally load sample data.
const ready = (async () => {
  await client.executeMultiple(SCHEMA);
  const autoSeed = process.env.AUTO_SEED === 'true' || usingTemp;
  if (autoSeed && (await one('SELECT COUNT(*) AS n FROM members')).n === 0) await seed(helpers);
})();

module.exports = { ...helpers, ready };
