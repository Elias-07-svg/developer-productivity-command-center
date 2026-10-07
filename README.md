# DevPulse — Developer Productivity Command Center

A portfolio project for exploring GitHub repository and activity data from one responsive dashboard.

## Stack

- React + Vite (client)
- Node.js + Express (API)
- PostgreSQL + Prisma (persistence, added in a later milestone)
- GitHub REST API (public repository data first)

## Current structure

```text
client/                 React app
  src/                  UI entry point and styles
server/                 Express API
  src/                  API entry point and routes
  prisma/               Database schema and migrations
```

## Prerequisites

- Node.js 22 or newer
- npm
- PostgreSQL for the database milestone (not needed for the initial health-check milestone)

## Run locally

Open two terminals from this directory.

```sh
cd server
npm install
npm run dev
```

Then in the second terminal:

```sh
cd client
npm install
npm run dev
```

The client runs at `http://localhost:5173`; the API health check is at `http://localhost:4000/api/health`.

## Planned milestones

1. Project shell and client/server connection. **Complete**
2. GitHub username lookup and public repository dashboard. **Complete**
3. Repository search, sorting, and language breakdown. **Complete**
4. PostgreSQL persistence for saved accounts and preferences.
5. Caching, polish, deployment, and portfolio documentation.

This repository is a learning and portfolio project, not professional employment experience.
