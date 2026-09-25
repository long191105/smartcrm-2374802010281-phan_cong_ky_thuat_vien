const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const { Pool } = require('pg');
 
const app = express();
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});
 
app.get('/', (req, res) => res.send('Hello Smart CRM'));
 
app.get('/db-check', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS server_time');
    res.json({ status: 'OK', ...result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
});
 
const port = process.env.APP_PORT || 3000;
app.listen(port, () => console.log('Server chạy tại http://localhost:' + port));
