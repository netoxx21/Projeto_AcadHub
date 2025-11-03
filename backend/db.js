const dotenv = require('dotenv');//Importa o pacote dotenv para carregar variáveis de ambiente do arquivo .env
const path = require('path');//Importa o módulo path do Node para lidar com caminhos de arquivos
const { Pool } = require('pg');//Importa o Pool do pacote pg para conectar ao PostgreSQL

// Carrega as variáveis de ambiente do arquivo .env que está na raiz do projeto
// path.resolve garante que o caminho seja absoluto e correto independente do SO
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Configurações de conexão usando as variáveis do .env
const pool = new Pool({
  user: process.env.PGUSER,// usuário do PostgreSQL
  host: process.env.PGHOST,// host do banco (ex: localhost)
  database: process.env.PGDATABASE,// nome do banco de dados
  password: process.env.PGPASSWORD,// senha do banco
  port: process.env.PGPORT,// porta do banco (geralmente 5432)
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
    process.exit(1);// Encerra o processo do Node caso a conexão não seja possível
  });

//Exporta apenas o pool, não um objeto com pool dentro
module.exports = pool;
