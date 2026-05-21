import { env } from '../config/env.js';
import { pool } from '../config/database.js';

export async function getHealth(_request, response, next) {
  if (!env.db.enabled) {
    response.json({
      status: 'ok',
      database: 'disabled',
    });
    return;
  }

  try {
    const [rows] = await pool.query('SELECT 1 AS connected');

    response.json({
      status: 'ok',
      database: rows[0]?.connected === 1 ? 'connected' : 'unknown',
    });
  } catch (error) {
    next(error);
  }
}
