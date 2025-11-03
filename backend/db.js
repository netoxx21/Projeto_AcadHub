const dotenv = require('dotenv');
const path = require('path');
const { Pool } = require('pg');

// Carrega as variáveis de ambiente do .env na raiz do projeto
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Configurações de conexão usando as variáveis do .env
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Teste de Conexão do servidor com o PostgreSQL
pool.connect()
  .then(client => {
    console.log('Conexão com o PostgreSQL estabelecida com sucesso!');
    client.release(); // Libera o cliente de volta para o pool
  })
  .catch(err => {
    console.error('ERRO FATAL: Falha de Conexão com o PostgreSQL.');
    console.error('Detalhe do Erro:', err.message);
    console.error('Verifique: 1) Se o serviço PostgreSQL está rodando. 2) As credenciais no seu arquivo .env.');
    process.exit(1);
  });

// ✅ Exporta apenas o pool, não um objeto com pool dentro
module.exports = pool;
