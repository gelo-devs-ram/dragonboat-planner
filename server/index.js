// Local / traditional hosting entry. On Vercel, api/index.js is used instead.
const app = require('./app');

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
