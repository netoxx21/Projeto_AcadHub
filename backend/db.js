const dotenv = require('dotenv');
const path = require('path');
const { Pool } = require('pg');

// Carrega .env SOMENTE quando não estiver no Render
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
}

const isProduction = Boolean(process.env.DATABASE_URL);

const pool = new Pool(
  isProduction
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        password: process.env.PGPASSWORD,
        port: process.env.PGPORT
      }
);

// Teste de conexão
pool.connect()
  .then(client => {
    console.log('Conexão com PostgreSQL bem-sucedida!');
    client.release();
  })
  .catch(err => {
    console.error('ERRO FATAL: Não foi possível conectar ao banco.');
    console.error('Detalhe:', err.message);
    process.exit(1);
  });

module.exports = pool;