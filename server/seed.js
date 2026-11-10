// Fills the database with sample data for the demo. Run: npm run seed
// Uses the same database settings as the server (a local file, or Turso if the env vars are set).
const db = require("./db");
const { seed } = require("./seedData");

db.ready
  .then(() => seed(db))
  .then((n) => {
    console.log(
      `Seeded ${n.members} members, ${n.races} races, ${n.sessions} sessions.`,
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
