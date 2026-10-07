import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import healthRouter from './routes/health.js';
import githubRouter from './routes/github.js';
import savedProfilesRouter from './routes/savedProfiles.js';

const app = express();
const port = Number(process.env.PORT) || 4000;
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const clientBuildDirectory = join(currentDirectory, '../../client/dist');

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
if (existsSync(clientBuildDirectory)) app.use(express.static(clientBuildDirectory));
app.use('/api/health', healthRouter);
app.use('/api/github', githubRouter);
app.use('/api/saved-profiles', savedProfilesRouter);

app.use((error, _req, res, _next) => {
  console.error('API request failed:', error.message);
  res.status(500).json({ error: { message: 'Something went wrong while processing the request.' } });
});

app.use((req, res) => {
  if (!req.path.startsWith('/api/') && existsSync(join(clientBuildDirectory, 'index.html'))) {
    return res.sendFile(join(clientBuildDirectory, 'index.html'));
  }
  res.status(404).json({ error: { message: 'Route not found' } });
});

app.listen(port, () => {
  console.log(`DevPulse API listening on http://localhost:${port}`);
});
