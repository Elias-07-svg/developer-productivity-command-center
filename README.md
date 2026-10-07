# DevPulse — Developer Productivity Command Center

DevPulse is a full-stack portfolio project that turns a GitHub username into a searchable dashboard of public repositories. It demonstrates a React interface, an Express API, and an external REST API integration.

> **Portfolio project:** This is an independently built learning project, not professional employment experience.

## Live demo

[Open DevPulse](https://devpulse-command-center.onrender.com)

The free web service may take about a minute to wake after being idle.

## Features

- Look up a GitHub user's public profile and repositories
- Search repositories by name, description, or language
- Sort repositories by latest update or star count
- View follower and public repository counts
- See a language breakdown by repository count
- Responsive layout with loading, empty, and error states
- Readable API errors for missing users and GitHub rate limits

The current version reads public GitHub data. It does not sign users in or access private repositories.

## Stack

- **Client:** React, Vite, JavaScript
- **API:** Node.js, Express 5
- **External API:** GitHub REST API
- **Planned persistence:** PostgreSQL and Prisma

## Project structure

```text
client/
  src/                 React UI and styles
  vite.config.js       Local API proxy
server/
  src/index.js          Express app and production static hosting
  src/routes/           Health and GitHub endpoints
  prisma/               Reserved for the database milestone
render.yaml             Render web-service deployment blueprint
```

## Run locally

Prerequisites: Node.js 22.12 or newer and npm.

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
| `GET` | `/api/github/:username` | Public profile and up to 100 recently updated repositories |

GitHub API access is performed by the server, so the browser does not call GitHub directly. A server-side `GITHUB_TOKEN` can be configured later to increase API rate limits; never put that token in the client or commit it to Git.

## Deployment

The repository includes a Render Blueprint in `render.yaml`. It builds the Vite client and serves the generated static files from Express, so the UI and API share one service and origin. Render deploys this repository's `main` branch. The current Blueprint uses Render's free plan.

## Roadmap

- [x] React and Express project shell
- [x] GitHub public profile and repository lookup
- [x] Repository search and sorting
- [x] Language breakdown
- [ ] Capture and add an application screenshot
- [x] Deploy the live demo
- [ ] Add database persistence for saved profiles and preferences
- [ ] Add authenticated GitHub access for private repositories
- [ ] Add caching and a richer activity view

## License

No license has been selected yet. Add one before inviting others to reuse or redistribute the code.
