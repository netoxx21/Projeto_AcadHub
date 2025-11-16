const express = require('express');// framework para criar servidor HTTP e rotas
const cors = require('cors');// permite que o frontend acesse o backend (Cross-Origin)
const bcrypt = require('bcrypt');// usado para criptografar e comparar senhas
const jwt = require('jsonwebtoken');// usado para gerar e verificar tokens JWT (autenticação)
const multer = require('multer');// usado para fazer upload de arquivos
const path = require('path');// módulo do Node para lidar com caminhos de arquivos
const pool = require('./db');// conexão com o banco de dados PostgreSQL
require('dotenv').config();// carrega variáveis de ambiente do arquivo .env

// Cria o app Express
const app = express();

// Middleware para permitir CORS e JSON no corpo das requisições
app.use(cors());
app.use(express.json());

// Define a pasta 'uploads' como pública para servir arquivos enviados
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


//Configuração do Multer (upload de arquivos)

// Define onde e como os arquivos enviados serão armazenados
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    
    cb(null, 'uploads/');// pasta onde os arquivos serão salvos
  },
  filename: (req, file, cb) => {
    // define o nome do arquivo como a data atual + extensão original (ex: teste.pdf)
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

//Rota de cadastro de usuário
app.post('/api/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;

  // Verifica se todos os campos foram enviados
  if (!nome || !email || !senha)
    return res.status(400).json({ message: 'Preencha todos os campos.' });

  try {
    // Criptografa a senha antes de salvar no banco
    const hashed = await bcrypt.hash(senha, 10);
    const result = await pool.query(

        // Insere o usuário no banco (nome, email e senha criptografada)
      'INSERT INTO users (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, nome, email',
      [nome, email, hashed]
    );

    // Retorna resposta de sucesso com o novo usuário
    res.status(201).json({ message: 'Usuário cadastrado com sucesso!', user: result.rows[0] });
  } catch (err) {
    //  mensagem erro 23505 = violação de unique (email já cadastrado no Postgres)
    if (err.code === '23505') {
      return res.status(409).json({ message: 'E-mail já cadastrado.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
});

//Login de usuário (SUBSTITUIR rota /login -> /api/login)

app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;

  // Verifica se os campos estão preenchidos
  if (!email || !senha)
    return res.status(400).json({ message: 'Preencha todos os campos.' });

  try {
    // Busca o usuário pelo e-mail
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    // Caso não exista o e-mail no banco
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    // Compara a senha digitada com a senha criptografada no banco
    const valid = await bcrypt.compare(senha, user.senha_hash);
    if (!valid) return res.status(401).json({ message: 'Senha incorreta.' });

    // Gera um token JWT contendo o ID do usuário
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const token = jwt.sign({ id: user.id }, secret, { expiresIn: '1h' });

    // Retorna o token e mensagem de sucesso
    res.json({ message: 'Login realizado com sucesso!', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
});

//Upload de resumo

app.post('/api/upload', upload.single('arquivo'), async (req, res) => {
  try {
    console.log('--- upload recebendo ---');
    console.log('headers.authorization:', req.headers.authorization);
    console.log('body:', req.body);
    console.log('file:', req.file);

    const { titulo, descricao, curso } = req.body;
    const arquivo = req.file ? req.file.filename : null;

    // Verifica se o token JWT foi enviado
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer '))
      return res.status(401).json({ message: 'Token ausente.' });

    // Extrai e valida o token
    const token = auth.split(' ')[1];
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    } catch (err) {
      console.error('jwt verify error:', err);
      return res.status(401).json({ message: 'Token inválido.' });
    }
    const user_id = payload.id;// pega o ID do usuário autenticado

    // Valida campos obrigatórios
    if (!titulo || !arquivo)
      return res.status(400).json({ message: 'Campos obrigatórios faltando.' });

    // Insere o resumo no banco de dados
    await pool.query(
      'INSERT INTO resumos (titulo, descricao, curso, arquivo, user_id) VALUES ($1, $2, $3, $4, $5)',
      [titulo, descricao, curso, arquivo, user_id]
    );

    console.log('Resumo gravado no banco para user_id=', user_id);
    res.status(201).json({ message: 'Resumo enviado com sucesso!' });
  } catch (err) {
    console.error('Erro na rota /api/upload:', err);
    res.status(500).json({ message: 'Erro ao enviar resumo.' });
  }
});


// GET /api/resumos -> retorna resumos com URL do arquivo
app.get('/api/resumos', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.titulo, r.descricao, r.curso, r.arquivo, r.created_at, u.id AS user_id, u.nome AS uploader
       FROM resumos r
       LEFT JOIN users u ON u.id = r.user_id
       ORDER BY r.created_at DESC`
    );

    const rows = result.rows.map(r => ({
      id: r.id,
      titulo: r.titulo,
      descricao: r.descricao,
      curso: r.curso,
      arquivo: r.arquivo,
      url: r.arquivo ? `${req.protocol}://${req.get('host')}/uploads/${r.arquivo}` : null,
      created_at: r.created_at,
      uploader: r.uploader,
      user_id: r.user_id
    }));

    res.json(rows);
  } catch (err) {
    console.error('Erro /api/resumos:', err);
    res.status(500).json({ message: 'Erro ao buscar resumos.' });
  }
});

//Rota de teste (opcional)
app.get('/', (req, res) => {
  res.send('Servidor rodando corretamente');
});

// Inicialização do servidor

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));