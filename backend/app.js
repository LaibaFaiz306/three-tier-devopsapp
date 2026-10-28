const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { randomPosition, SEED_STARS } = require('./galaxy');

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'galaxydb',
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Liveness: process is up (no DB needed)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Readiness: DB reachable
app.get('/api/health/db', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (e) {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

app.get('/api/stars', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, message, color, x, y, z, created_at FROM stars ORDER BY id ASC LIMIT 500');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Could not load stars' });
  }
});

app.post('/api/stars', async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 40);
  const message = String(req.body.message || '').trim().slice(0, 140);
  const color = String(req.body.color || '#ffd166');

  if (!name || !message) return res.status(400).json({ error: 'Name and message are required' });
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return res.status(400).json({ error: 'Invalid color' });

  const { x, y, z } = randomPosition();
  try {
    const { rows } = await pool.query(
      `INSERT INTO stars (name, message, color, x, y, z)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, message, color, x, y, z, created_at`,
      [name, message, color, x, y, z]);
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Could not plant star' });
  }
});

// Create the table (and seed a few stars) - retries until the DB is ready.
// An advisory lock stops multiple backend replicas from seeding twice.
async function initDb(retries = 25) {
  for (let i = 1; i <= retries; i++) {
    let client;
    try {
      client = await pool.connect();
      await client.query('SELECT pg_advisory_lock(7777)');
      try {
        await client.query(`CREATE TABLE IF NOT EXISTS stars (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          message TEXT NOT NULL,
          color TEXT NOT NULL DEFAULT '#ffd166',
          x DOUBLE PRECISION NOT NULL,
          y DOUBLE PRECISION NOT NULL,
          z DOUBLE PRECISION NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )`);
        const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM stars');
        if (rows[0].n === 0) {
          for (const s of SEED_STARS) {
            const p = randomPosition();
            await client.query(
              'INSERT INTO stars (name, message, color, x, y, z) VALUES ($1,$2,$3,$4,$5,$6)',
              [s.name, s.message, s.color, p.x, p.y, p.z]);
          }
          console.log('Seeded galaxy with starter stars');
        }
      } finally {
        await client.query('SELECT pg_advisory_unlock(7777)').catch(() => {});
      }
      client.release();
      console.log('Database ready');
      return;
    } catch (e) {
      if (client) client.release(true);
      console.log(`DB not ready (${i}/${retries}): ${e.message}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error('Could not connect to database');
}

module.exports = { app, initDb };
