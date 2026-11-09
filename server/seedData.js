// Sample data for demos. Used by `npm run seed` and by auto-seeding.
const people = [
  ['Mark Villanueva', 'Male', 24, 68, 5], ['Joy Dela Cruz', 'Female', 22, 54, 4],
  ['Carlo Reyes', 'Male', 26, 72, 4], ['Angel Santos', 'Female', 21, 52, 5],
  ['Paolo Mendoza', 'Male', 23, 70, 3], ['Bea Fernandez', 'Female', 20, 50, 4],
  ['Jerome Castillo', 'Male', 27, 78, 4], ['Kristine Ramos', 'Female', 24, 56, 3],
  ['Nathan Bautista', 'Male', 22, 66, 5], ['Lea Navarro', 'Female', 23, 53, 4],
  ['Rico Aquino', 'Male', 25, 74, 3], ['Trisha Gonzales', 'Female', 21, 51, 3],
  ['Dennis Garcia', 'Male', 28, 80, 4], ['Mika Torres', 'Female', 22, 55, 5],
  ['Ian Lopez', 'Male', 24, 69, 2], ['Shane Flores', 'Female', 20, 49, 3],
  ['Ryan Pascual', 'Male', 26, 73, 4], ['Hannah Cruz', 'Female', 23, 54, 4],
  ['Luis Domingo', 'Male', 22, 67, 3], ['Gaile Salazar', 'Female', 24, 57, 2],
  ['Ken Alvarez', 'Male', 25, 71, 4], ['Rose Manalo', 'Female', 21, 52, 3],
  ['Vince Soriano', 'Male', 23, 65, 2], ['Faith Ocampo', 'Female', 22, 53, 4],
];

const races = [
  ['Iloilo Dragon Boat Festival', '2026-11-22', '08:00', 'Iloilo River Esplanade', 'Iloilo City Tourism Office'],
  ['Boracay Regatta Cup', '2026-12-13', '07:30', 'Bulabog Beach, Boracay', 'Malay Sports Council'],
  ['Western Visayas Paddlers Open', '2027-01-24', '09:00', 'Roxas City Bay', 'WV Paddlers Association'],
];

const sessions = [
  ['Endurance paddling', '2026-10-27', '05:30', 'Iloilo River'],
  ['Start and pace drills', '2026-10-31', '05:30', 'Iloilo River'],
  ['Strength and core', '2026-11-03', '16:30', 'University gym'],
  ['Full-boat timing', '2026-11-06', '05:30', 'Iloilo River'],
  ['Race simulation', '2026-11-14', '05:30', 'Iloilo River'],
  ['Technique review', '2026-11-18', '16:30', 'Boat house'],
];

async function seed({ batch }) {
  const stmts = [
    ['DELETE FROM lineup'],
    ['DELETE FROM attendance'],
    ['DELETE FROM sessions'],
    ['DELETE FROM races'],
    ['DELETE FROM members'],
    ["DELETE FROM sqlite_sequence WHERE name IN ('members','races','sessions')"],
  ];
  people.forEach((p) => stmts.push(['INSERT INTO members (name, gender, age, weight_kg, rating) VALUES (?, ?, ?, ?, ?)', p]));
  races.forEach((r) => stmts.push(['INSERT INTO races (name, date, time, location, organizers) VALUES (?, ?, ?, ?, ?)', r]));
  sessions.forEach((s) => stmts.push(['INSERT INTO sessions (title, date, time, location) VALUES (?, ?, ?, ?)', s]));
  // Attendance for the four sessions already held (deterministic, so demos look the same every time).
  for (let s = 1; s <= 4; s++) {
    for (let m = 1; m <= people.length; m++) {
      stmts.push(['INSERT INTO attendance (session_id, member_id, present) VALUES (?, ?, ?)', [s, m, (m * 7 + s * 5) % 9 === 0 ? 0 : 1]]);
    }
  }
  await batch(stmts);
  return { members: people.length, races: races.length, sessions: sessions.length };
}

module.exports = { seed };
