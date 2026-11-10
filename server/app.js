const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("./db");

const { q, one, run, batch } = db;
const app = express();
app.use(cors());
app.use(express.json());

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Make sure the database is ready before any request is handled.
app.use(
  wrap(async (req, res, next) => {
    await db.ready;
    next();
  }),
);

// Boat layout: drummer, 10 benches (left/right), steersperson.
const SEATS = [
  "drummer",
  ...Array.from({ length: 10 }, (_, i) => `L${i + 1}`),
  ...Array.from({ length: 10 }, (_, i) => `R${i + 1}`),
  "steer",
];

const bad = (res, message) => res.status(400).json({ error: message });
const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

/* ---------- login ---------- */

const COACH_USER = process.env.COACH_USERNAME || "coach";
const COACH_PASS = process.env.COACH_PASSWORD || "dragon123";
const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

if (
  process.env.VERCEL &&
  (!process.env.COACH_PASSWORD || !process.env.JWT_SECRET)
) {
  console.warn(
    "WARNING: set COACH_PASSWORD and JWT_SECRET in the Vercel environment variables.",
  );
}

const sameText = (a, b) => {
  const ha = crypto
    .createHash("sha256")
    .update(String(a ?? ""))
    .digest();
  const hb = crypto
    .createHash("sha256")
    .update(String(b ?? ""))
    .digest();
  return crypto.timingSafeEqual(ha, hb);
};

app.post(
  "/api/login",
  wrap(async (req, res) => {
    const { username, password } = req.body || {};
    const okUser = sameText(username, COACH_USER);
    const okPass = sameText(password, COACH_PASS);
    if (!(okUser && okPass)) {
      await new Promise((r) => setTimeout(r, 500)); // slows down password guessing
      return res.status(401).json({ error: "Incorrect username or password." });
    }
    const token = jwt.sign({ sub: COACH_USER }, SECRET, { expiresIn: "8h" });
    res.json({ token, username: COACH_USER });
  }),
);

// Everything below this line needs a valid token.
app.use("/api", (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Please sign in to continue." });
  }
});

app.get("/api/me", (req, res) => res.json({ username: req.user.sub }));

/* ---------- validation helpers ---------- */

function readFields(body, spec) {
  const value = {};
  for (const [key, type, label] of spec) {
    const x = String(body[key] ?? "").trim();
    if (!x) return { error: `${label} is required.` };
    if (type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(x))
      return { error: `${label} must be a valid date.` };
    if (type === "time" && !/^\d{2}:\d{2}$/.test(x))
      return { error: `${label} must be a valid time.` };
    value[key] = x;
  }
  return { value };
}

function readMember(b) {
  const name = String(b.name ?? "").trim();
  const age = Number(b.age);
  const rating = Number(b.rating ?? 3);
  const weight =
    b.weight_kg === "" || b.weight_kg == null ? null : Number(b.weight_kg);
  if (!name) return { error: "Name is required." };
  if (!["Male", "Female"].includes(b.gender))
    return { error: "Choose a gender." };
  if (!Number.isInteger(age) || age < 10 || age > 80)
    return { error: "Age must be a whole number from 10 to 80." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return { error: "Rating must be from 1 to 5." };
  if (weight !== null && !(weight > 20 && weight < 200))
    return { error: "Weight must be between 20 and 200 kg." };
  return { value: { name, gender: b.gender, age, rating, weight_kg: weight } };
}

/* ---------- members (with performance + selection probability) ---------- */

// Selection probability = 70% coach rating + 30% attendance rate.
async function memberStats() {
  const total = (
    await one("SELECT COUNT(DISTINCT session_id) AS n FROM attendance")
  ).n;
  const rows = await q(
    `SELECT m.*,
      (SELECT COUNT(*) FROM attendance a WHERE a.member_id = m.id AND a.present = 1) AS present_count
     FROM members m ORDER BY m.name`,
  );
  return rows.map((m) => {
    const rate = total ? m.present_count / total : 0;
    return {
      ...m,
      sessions_total: total,
      attendance_rate: Math.round(rate * 100),
      selection_probability: Math.round((m.rating / 5) * 70 + rate * 30),
    };
  });
}

app.get(
  "/api/members",
  wrap(async (req, res) => res.json(await memberStats())),
);

app.post(
  "/api/members",
  wrap(async (req, res) => {
    const r = readMember(req.body);
    if (r.error) return bad(res, r.error);
    const v = r.value;
    const { id } = await run(
      "INSERT INTO members (name, gender, age, weight_kg, rating) VALUES (?, ?, ?, ?, ?)",
      [v.name, v.gender, v.age, v.weight_kg, v.rating],
    );
    res.status(201).json({ id, ...v });
  }),
);

app.put(
  "/api/members/:id",
  wrap(async (req, res) => {
    const r = readMember(req.body);
    if (r.error) return bad(res, r.error);
    const v = r.value;
    const id = Number(req.params.id);
    const { changes } = await run(
      "UPDATE members SET name = ?, gender = ?, age = ?, weight_kg = ?, rating = ? WHERE id = ?",
      [v.name, v.gender, v.age, v.weight_kg, v.rating, id],
    );
    if (!changes) return res.status(404).json({ error: "Member not found." });
    res.json({ id, ...v });
  }),
);

app.delete(
  "/api/members/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const results = await batch([
      ["DELETE FROM attendance WHERE member_id = ?", [id]],
      ["DELETE FROM lineup WHERE member_id = ?", [id]],
      ["DELETE FROM members WHERE id = ?", [id]],
    ]);
    if (!results[2].rowsAffected)
      return res.status(404).json({ error: "Member not found." });
    res.status(204).end();
  }),
);

/* ---------- races and training sessions (same CRUD shape) ---------- */

// `cascade` lists [table, column] pairs whose rows are removed together with the parent row.
function crud(route, table, spec, listSql, cascade) {
  const cols = spec.map((s) => s[0]);

  app.get(
    route,
    wrap(async (req, res) => res.json(await q(listSql))),
  );

  app.post(
    route,
    wrap(async (req, res) => {
      const r = readFields(req.body, spec);
      if (r.error) return bad(res, r.error);
      const { id } = await run(
        `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
        cols.map((c) => r.value[c]),
      );
      res.status(201).json({ id, ...r.value });
    }),
  );

  app.put(
    `${route}/:id`,
    wrap(async (req, res) => {
      const r = readFields(req.body, spec);
      if (r.error) return bad(res, r.error);
      const id = Number(req.params.id);
      const { changes } = await run(
        `UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`,
        [...cols.map((c) => r.value[c]), id],
      );
      if (!changes) return res.status(404).json({ error: "Not found." });
      res.json({ id, ...r.value });
    }),
  );

  app.delete(
    `${route}/:id`,
    wrap(async (req, res) => {
      const id = Number(req.params.id);
      const statements = cascade.map(([t, c]) => [
        `DELETE FROM ${t} WHERE ${c} = ?`,
        [id],
      ]);
      statements.push([`DELETE FROM ${table} WHERE id = ?`, [id]]);
      const results = await batch(statements);
      if (!results[results.length - 1].rowsAffected)
        return res.status(404).json({ error: "Not found." });
      res.status(204).end();
    }),
  );
}

crud(
  "/api/races",
  "races",
  [
    ["name", "text", "Race name"],
    ["date", "date", "Date"],
    ["time", "time", "Time"],
    ["location", "text", "Location"],
    ["organizers", "text", "Organizers"],
  ],
  "SELECT * FROM races ORDER BY date, time",
  [["lineup", "race_id"]],
);

crud(
  "/api/sessions",
  "sessions",
  [
    ["title", "text", "Title"],
    ["date", "date", "Date"],
    ["time", "time", "Time"],
    ["location", "text", "Location"],
  ],
  `SELECT s.*,
     (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id AND a.present = 1) AS present_count,
     (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id) AS recorded
   FROM sessions s ORDER BY s.date, s.time`,
  [["attendance", "session_id"]],
);

/* ---------- attendance checklist ---------- */

app.get(
  "/api/sessions/:id/attendance",
  wrap(async (req, res) => {
    const rows = await q(
      `SELECT m.id AS member_id, m.name, COALESCE(a.present, 0) AS present
     FROM members m
     LEFT JOIN attendance a ON a.session_id = ? AND a.member_id = m.id
     ORDER BY m.name`,
      [Number(req.params.id)],
    );
    res.json(rows);
  }),
);

app.put(
  "/api/sessions/:id/attendance",
  wrap(async (req, res) => {
    const sessionId = Number(req.params.id);
    if (!(await one("SELECT 1 AS x FROM sessions WHERE id = ?", [sessionId]))) {
      return res.status(404).json({ error: "Session not found." });
    }
    const present = new Set((req.body.present || []).map(Number));
    const members = await q("SELECT id FROM members");
    await batch(
      members.map((m) => [
        "INSERT OR REPLACE INTO attendance (session_id, member_id, present) VALUES (?, ?, ?)",
        [sessionId, m.id, present.has(m.id) ? 1 : 0],
      ]),
    );
    res.json({ saved: members.length, present: present.size });
  }),
);

/* ---------- line-up (seat by seat) ---------- */

app.get(
  "/api/races/:id/lineup",
  wrap(async (req, res) => {
    const rows = await q(
      "SELECT seat, member_id FROM lineup WHERE race_id = ?",
      [Number(req.params.id)],
    );
    res.json(Object.fromEntries(rows.map((r) => [r.seat, r.member_id])));
  }),
);

app.put(
  "/api/races/:id/lineup",
  wrap(async (req, res) => {
    const raceId = Number(req.params.id);
    if (!(await one("SELECT 1 AS x FROM races WHERE id = ?", [raceId]))) {
      return res.status(404).json({ error: "Race not found." });
    }
    const entries = Object.entries(req.body.assignments || {}).filter(
      ([, v]) => v !== "" && v != null,
    );
    const ids = entries.map(([, v]) => Number(v));
    if (entries.some(([seat]) => !SEATS.includes(seat)))
      return bad(res, "Unknown seat in line-up.");
    if (new Set(ids).size !== ids.length)
      return bad(res, "A member can only take one seat.");
    const known = new Set((await q("SELECT id FROM members")).map((m) => m.id));
    if (ids.some((id) => !known.has(id)))
      return bad(res, "One of the selected members no longer exists.");

    await batch([
      ["DELETE FROM lineup WHERE race_id = ?", [raceId]],
      ...entries.map(([seat, id]) => [
        "INSERT INTO lineup (race_id, seat, member_id) VALUES (?, ?, ?)",
        [raceId, seat, Number(id)],
      ]),
    ]);
    res.json({ saved: entries.length });
  }),
);

/* ---------- dashboard summary ---------- */

app.get(
  "/api/dashboard",
  wrap(async (req, res) => {
    const members = await memberStats();
    const t = today();
    const nextRace =
      (await one(
        "SELECT * FROM races WHERE date >= ? ORDER BY date, time LIMIT 1",
        [t],
      )) || null;
    const nextSession =
      (await one(
        "SELECT * FROM sessions WHERE date >= ? ORDER BY date, time LIMIT 1",
        [t],
      )) || null;
    const avg = members.length
      ? Math.round(
          members.reduce((s, m) => s + m.attendance_rate, 0) / members.length,
        )
      : 0;
    res.json({
      memberCount: members.length,
      upcomingRaces: (
        await one("SELECT COUNT(*) AS n FROM races WHERE date >= ?", [t])
      ).n,
      upcomingSessions: (
        await one("SELECT COUNT(*) AS n FROM sessions WHERE date >= ?", [t])
      ).n,
      avgAttendance: avg,
      nextRace,
      nextSession,
      ranking: [...members]
        .sort((a, b) => b.selection_probability - a.selection_probability)
        .slice(0, 8),
    });
  }),
);

/* ---------- serve the built client (npm run build) when running locally ---------- */

const dist = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

module.exports = app;
