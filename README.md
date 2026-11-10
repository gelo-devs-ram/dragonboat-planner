# Dragonboat Planner

Coach dashboard for planning dragon boat races, training, attendance and race line-ups.

**Stack:** React (Vite) + Express.js + SQLite (libSQL / Turso) with token-based login.

## Technologies used

| Layer | Technology | What it is used for |
| --- | --- | --- |
| Front end | **React 18** | Builds the dashboard screens (Dashboard, Races, Members, Training, Line-up, Login) from reusable components |
| Front end tooling | **Vite** | Development server and production build of the React app |
| Front end styling | **Plain CSS** | Custom layout, theme and responsive design; **Bricolage Grotesque** font via Google Fonts |
| Back end runtime | **Node.js** | Runs JavaScript on the server |
| Back end framework | **Express.js 4** | REST API routes for login, races, members, sessions, attendance, line-ups and the dashboard (`server/app.js`) |
| Database | **SQLite via libSQL (`@libsql/client`)** | Stores all data. Uses a local file in development and **Turso** (hosted SQLite) online |
| Authentication | **JSON Web Tokens (`jsonwebtoken`)** | Coach login; the server checks the token on every API route except login |
| Security helpers | **Node `crypto`**, **CORS** | Timing-safe credential comparison; cross-origin request handling |
| Configuration | **dotenv** | Loads settings from the `.env` file locally |
| Dev tooling | **concurrently** | Runs the API and the web app together with `npm run dev` |
| Version control | **Git and GitHub** | Stores and shares the source code |
| Hosting | **Vercel** (app and serverless API) and **Turso** (database) | Online deployment |

### How the parts connect

React (browser) -> sends requests with the login token -> Express REST API (`/api/...`) -> libSQL/SQLite database -> response back to React.

### Where each part lives

- `client/`: React + Vite front end (`client/src/pages/` holds each screen, `client/src/api.js` calls the API)
- `server/app.js`: Express app with all routes and the login check
- `server/index.js`: starts the Express server locally
- `api/index.js`: runs the same Express app as a Vercel serverless function
- `server/db.js`: database connection and tables
- `vercel.json`: Vercel build and routing settings

## Features

- **Login**: coach sign-in page; every API route except login needs a valid token (8-hour session)
- **Races**: create, edit, delete (name, date, time, location, organizers)
- **Members**: create, edit, delete (name, gender, age, optional weight, performance rating 1-5)
- **Selection chance**: 70% coach rating + 30% training attendance rate
- **Training sessions**: schedule, edit, delete
- **Attendance**: tick a checklist of members for each session
- **Line-up**: assign paddlers seat by seat (drummer, 10 benches left/right, steersperson), with gender count and left/right weight balance, plus auto-fill by selection chance
- **Dashboard**: next race, next training, ranking of most likely paddlers

## Run locally

Requires Node.js 20 or 22 (LTS).

```bash
npm run install:all     # installs server and client dependencies
cp .env.example .env    # then edit the coach password and JWT secret
npm run seed            # optional: loads sample members, races and sessions
npm run dev             # API on :3001, web app on http://localhost:5173
```

Default login if you skip `.env`: **coach / dragon123** (change this before deploying).
The local database is the file `server/dragonboat.db`, created automatically.

## Deploy to Vercel

Vercel cannot keep a SQLite file between requests, so online the app uses **Turso**, a free hosted SQLite-compatible database. The code is the same; only the environment variables change.

1. **Create the database** at https://turso.tech (free plan). Create a database, then copy its **URL** (starts with `libsql://`) and create an **auth token**.
2. **Load sample data** (optional). On your computer, put the URL and token in `.env`, then run `npm run seed`. This writes the sample data into Turso.
3. **Push the project to GitHub** (steps below).
4. **Import the repo in Vercel** (Add New > Project). Leave the Root Directory as the repo root. The included `vercel.json` sets the build and the `/api` routing, so no framework preset is needed.
5. **Add environment variables** in Project Settings > Environment Variables:

   | Name | Value |
   | --- | --- |
   | `TURSO_DATABASE_URL` | your `libsql://...` URL |
   | `TURSO_AUTH_TOKEN` | your Turso token |
   | `COACH_USERNAME` | the login name you want |
   | `COACH_PASSWORD` | a strong password |
   | `JWT_SECRET` | a long random string |

6. **Deploy**, then open the Vercel URL and sign in.

If you skip Turso, the app still runs on Vercel using a temporary database with sample data, but everything resets whenever Vercel restarts the function. That is fine for a quick look, not for the demo.

## REST API

All routes except `POST /api/login` need the header `Authorization: Bearer <token>`.

| Resource | Endpoints |
| --- | --- |
| Login | `POST /api/login` returns `{ token }`, `GET /api/me` |
| Members | `GET/POST /api/members`, `PUT/DELETE /api/members/:id` |
| Races | `GET/POST /api/races`, `PUT/DELETE /api/races/:id` |
| Sessions | `GET/POST /api/sessions`, `PUT/DELETE /api/sessions/:id` |
| Attendance | `GET/PUT /api/sessions/:id/attendance` |
| Line-up | `GET/PUT /api/races/:id/lineup` |
| Dashboard | `GET /api/dashboard` |

## Database

`members`, `races`, `sessions`, `attendance (session_id, member_id, present)`, `lineup (race_id, seat, member_id)`.
Deleting a member, race or session also removes its attendance and line-up rows.

## Push to GitHub

```bash
git init
git add .
git commit -m "Dragonboat Planner dashboard"
git branch -M main
git remote add origin https://github.com/<your-username>/dragonboat-planner.git
git push -u origin main
```

`.env` and the local database file are ignored by git, so no secrets are uploaded.
