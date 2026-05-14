import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

dotenv.config({
  path: path.join(backendRoot, '.env'),
});

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCorsOrigins(value) {
  if (!value) {
    return ['http://localhost:5173', 'http://localhost:5174'];
  }

  return value.split(',').map((origin) => origin.trim()).filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseNumber(process.env.PORT, 3001),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseNumber(process.env.DB_PORT, 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'erp_transportes',
    connectionLimit: parseNumber(process.env.DB_CONNECTION_LIMIT, 10),
  },
};
