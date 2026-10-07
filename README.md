# DevPulse — Developer Productivity Command Center

DevPulse is a GitHub portfolio auditor. It reviews public repository basics and turns gaps—such as a missing README, description, license, or topic tags—into concrete next steps. It demonstrates a React interface, an Express API, GitHub REST API integration, and PostgreSQL-backed account watchlists.

> **Portfolio project:** This is an independently built learning project, not professional employment experience.

## Live demo

[Open DevPulse](https://devpulse-command-center.onrender.com)

The free web service may take about a minute to wake after being idle.

## Features

- Audit a GitHub user's public repositories
- See repository-level checks for README, description, license, topics, automated workflows, and recent activity
- Get specific improvement suggestions instead of a single opaque portfolio score
- Re-run an audit for accounts in a browser-specific watchlist
- Search repositories by name, description, or language
- Sort repositories by latest update or star count
- View follower and public repository counts
- See a language breakdown by repository count
- Responsive layout with loading, empty, and error states
- Readable API errors for missing users and GitHub rate limits

Watchlist entries are isolated by an anonymous, HttpOnly browser cookie. They persist across visits in that browser, but are not synced across devices; clearing the site's cookies starts a new list. README and workflow checks are limited to the 12 most recently updated original repositories per lookup to conserve GitHub's unauthenticated API quota; uninspected repositories are clearly marked.

The current version reads public GitHub data. It does not sign users in or access private repositories.

## Stack

- **Client:** React, Vite, JavaScript
- **API:** Node.js, Express 5
- **External API:** GitHub REST API
- **Database:** PostgreSQL via `pg`

## Project structure

```text
client/
  src/                 React UI and styles
  vite.config.js       Local API proxy
server/
  src/index.js          Express app and production static hosting
  src/db.js             PostgreSQL connection and saved-profile table setup
  src/routes/           Health and GitHub endpoints
  src/routes/savedProfiles.js  Private saved-profile API
render.yaml             Render web-service deployment blueprint
```

## Run locally

Prerequisites: Node.js 22.12 or newer and npm.

Create a PostgreSQL database (for example, a Neon project) and copy its pooled connection string. Save it as `DATABASE_URL` in `server/.env` (start from `.env.example`). The server enforces TLS with full certificate verification. Keep this file private; it is ignored by Git.

Open two terminals in the project root.

**Terminal 1 — API**

```sh
cd server
npm install
npm run dev
```

**Terminal 2 — client**

```sh
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite development server forwards `/api` requests to Express at `http://localhost:4000`.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Service health check |
| `GET` | `/api/github/:username` | Public profile, up to 100 repositories, and portfolio audit signals |
| `GET` | `/api/saved-profiles` | List profiles saved by this browser session |
| `POST` | `/api/saved-profiles` | Save a GitHub username (`{ "username": "octocat" }`) |
| `DELETE` | `/api/saved-profiles/:username` | Remove one saved profile |

GitHub API access is performed by the server, so the browser does not call GitHub directly. A server-side `GITHUB_TOKEN` can be configured later to increase API rate limits; never put that token in the client or commit it to Git.

## Deployment

The repository includes a Render Blueprint in `render.yaml`. It builds the Vite client and serves the generated static files from Express, so the UI and API share one service and origin. Set `DATABASE_URL` in Render under **Environment** to the hosted PostgreSQL connection string before saving a profile. This service was created from the public repository URL, so automatic deploys are not configured. After pushing changes, use **Manual Deploy** in Render to publish them. The current Blueprint uses Render's free plan.

## Roadmap

- [x] React and Express project shell
- [x] GitHub public profile and repository lookup
- [x] Repository search and sorting
- [x] Language breakdown
- [ ] Capture and add an application screenshot
- [x] Add repository portfolio checks and actionable improvement suggestions
- [x] Deploy the live demo
- [x] Add PostgreSQL persistence for saved GitHub profiles
- [ ] Add authenticated GitHub access for private repositories
- [ ] Add caching and a richer activity view

## License

No license has been selected yet. Add one before inviting others to reuse or redistribute the code.
