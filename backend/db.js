const dotenv = require('dotenv');
const path = require('path');
const { Pool } = require('pg');

// Carrega o arquivo .env na raiz do projeto
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
}


// Se houver DATABASE_URL (ambiente de produção), usa ela
// Senão, usa as variáveis locais (ambiente de desenvolvimento)
const isProduction = process.env.DATABASE_URL ? true : false;

const pool = new Pool(
  isProduction
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // obrigatório no Supabase/Render
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
