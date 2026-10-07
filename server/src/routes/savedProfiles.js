import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import { ensureDatabase, getPool } from '../db.js';

const router = Router();
const cookieName = 'devpulse_session';
const cookieMaxAge = 60 * 60 * 24 * 365;

function readCookie(request, name) {
  const entry = request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

function getSession(request, response) {
  let token = readCookie(request, cookieName);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    token = randomBytes(32).toString('hex');
    response.cookie(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge * 1000,
      path: '/',
    });
  }
  return createHash('sha256').update(token).digest('hex');
}

function validateUsername(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(value);
}

router.use(async (_request, response, next) => {
  try {
    if (!(await ensureDatabase())) {
      return response.status(503).json({ error: { message: 'Saved profiles need a database. Set DATABASE_URL on the server.' } });
    }
    next();
  } catch (error) {
    console.error('Saved profiles database unavailable:', error.message);
    response.status(503).json({ error: { message: 'Saved profiles are temporarily unavailable.' } });
  }
});

router.get('/', async (request, response, next) => {
  try {
    const sessionHash = getSession(request, response);
    const { rows } = await getPool().query(
      'SELECT username, created_at AS "createdAt" FROM saved_profiles WHERE session_hash = $1 ORDER BY created_at DESC',
      [sessionHash],
    );
    response.json({ profiles: rows });
  } catch (error) { next(error); }
});

router.post('/', async (request, response, next) => {
  try {
    const username = typeof request.body?.username === 'string' ? request.body.username.trim().toLowerCase() : '';
    if (!validateUsername(username)) return response.status(400).json({ error: { message: 'Enter a valid GitHub username.' } });
    const sessionHash = getSession(request, response);
    const { rows } = await getPool().query(
      'INSERT INTO saved_profiles (session_hash, username) VALUES ($1, $2) ON CONFLICT (session_hash, username) DO UPDATE SET username = EXCLUDED.username RETURNING username, created_at AS "createdAt"',
      [sessionHash, username],
    );
    response.status(201).json({ profile: rows[0] });
  } catch (error) { next(error); }
});

router.delete('/:username', async (request, response, next) => {
  try {
    const username = decodeURIComponent(request.params.username);
    if (!validateUsername(username)) return response.status(400).json({ error: { message: 'Invalid GitHub username.' } });
    const sessionHash = getSession(request, response);
    const result = await getPool().query(
      'DELETE FROM saved_profiles WHERE session_hash = $1 AND LOWER(username) = LOWER($2)',
      [sessionHash, username],
    );
    if (!result.rowCount) return response.status(404).json({ error: { message: 'Saved profile not found.' } });
    response.status(204).end();
  } catch (error) { next(error); }
});

export default router;
