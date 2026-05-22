import app from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';

function readHttpsOptions() {
  if (!env.https.enabled) return null;

  if (!env.https.keyPath || !env.https.certPath) {
    throw new Error('HTTPS_ENABLED=true exige HTTPS_KEY_PATH e HTTPS_CERT_PATH no backend/.env');
  }

  return {
    key: fs.readFileSync(env.https.keyPath),
    cert: fs.readFileSync(env.https.certPath),
  };
}

const httpsOptions = readHttpsOptions();
const protocol = httpsOptions ? 'https' : 'http';
const server = httpsOptions ? https.createServer(httpsOptions, app) : http.createServer(app);

server.listen(env.port, env.host, () => {
  const displayHost = env.host === '0.0.0.0' ? 'localhost' : env.host;
  logger.info(`ERP rodando em ${protocol}://${displayHost}:${env.port}`);
});
