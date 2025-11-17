const dotenv = require('dotenv');
const path = require('path');
const { Pool } = require('pg');

// Só carrega o arquivo .env local **quando necessário**
// Nunca força caminho no Render
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
}

// Verifica se está em produção (Render)
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

// Teste de Conexão
pool.connect()
  .then(client => {
    console.log('Conexão estabelecida com sucesso!');
    client.release();
  })
  .catch(err => {
    console.error('ERRO FATAL: Falha de Conexão.');
    console.error('Detalhe:', err.message);
    process.exit(1);
  });

module.exports = pool;
