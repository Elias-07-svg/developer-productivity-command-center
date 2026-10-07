import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import healthRouter from './routes/health.js';
import githubRouter from './routes/github.js';

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/api/health', healthRouter);
app.use('/api/github', githubRouter);

app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found' } });
});

app.listen(port, () => {
  console.log(`DevPulse API listening on http://localhost:${port}`);
});
