require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const dir = path.join(__dirname, '..', '..', 'migrations');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

(async () => {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    await pool.query(fs.readFileSync(path.join(dir, f), 'utf8'));
    console.log('OK  ', f);
  }
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' ORDER BY 1`);
  console.log('Bang hien co:', rows.map(r => r.table_name).join(', '));
  await pool.end();
})().catch(e => { console.error('LOI:', e.message); process.exit(1); });