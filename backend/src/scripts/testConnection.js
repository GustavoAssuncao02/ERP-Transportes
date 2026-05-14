import { testDatabaseConnection } from '../config/database.js';

try {
  await testDatabaseConnection();
  console.log('Conexão com MySQL realizada com sucesso.');
  process.exit(0);
} catch (error) {
  console.error('Falha ao conectar no MySQL.');
  console.error(error.message);
  process.exit(1);
}
