import app from './app.js';
import { env } from './config/env.js';

app.listen(env.port, env.host, () => {
  const displayHost = env.host === '0.0.0.0' ? 'localhost' : env.host;
  console.log(`ERP rodando em http://${displayHost}:${env.port}`);
});
