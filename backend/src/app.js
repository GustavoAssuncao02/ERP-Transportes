import compression from 'compression';
import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import morgan from 'morgan';
import { env } from './config/env.js';
import { getHealth } from './controllers/healthController.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { requestContext } from './middleware/requestContext.js';
import routes from './routes/index.js';
import { logger } from './utils/logger.js';

const app = express();
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '../..');
const clientDistPath = path.join(projectRoot, 'frontend', 'dist');
const indexHtmlPath = path.join(clientDistPath, 'index.html');
const hasClientBuild = fs.existsSync(indexHtmlPath);

app.set('trust proxy', 1);
app.use(requestContext);
app.use(compression());
app.use(cors({ origin: env.corsOrigins }));
app.use(express.json());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

app.use('/api', routes);
app.get('/health', getHealth);

if (hasClientBuild) {
  app.use(express.static(clientDistPath, {
    index: false,
    setHeaders(response, filePath) {
      const normalizedPath = filePath.replace(/\\/g, '/');

      if (normalizedPath.includes('/assets/')) {
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return;
      }

      response.setHeader('Cache-Control', 'no-cache');
    },
  }));

  app.use((request, response, next) => {
    if (request.method !== 'GET' || request.path.startsWith('/api') || path.extname(request.path)) {
      next();
      return;
    }

    response.setHeader('Cache-Control', 'no-cache');
    response.sendFile(indexHtmlPath);
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
