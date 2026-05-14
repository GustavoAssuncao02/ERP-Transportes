import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import routes from './routes/index.js';

const app = express();

app.use(cors({ origin: env.corsOrigins }));
app.use(express.json());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
