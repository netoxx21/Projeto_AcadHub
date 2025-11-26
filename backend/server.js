// IMPORTS
const express = require('express');       // Framework para servidor HTTP e rotas
const cors = require('cors');             // Libera acesso entre frontend e backend (CORS)
const bcrypt = require('bcrypt');         // Criptografia de senhas
const jwt = require('jsonwebtoken');      // Tokens de autenticação
const multer = require('multer');         // Upload de arquivos
const path = require('path');             // Manipulação de caminhos
const pool = require('./db');             // Conexão com PostgreSQL
require('dotenv').config();               // Variáveis ambiente (.env)

// CONFIGURAÇÕES INICIAIS
const app = express();

// Habilita CORS e JSON
app.use(cors());
app.use(express.json());

// Torna a pasta "uploads" pública
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CONFIGURAÇÃO DE UPLOAD (Multer)
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, 'uploads/'),
  filename: (_, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

// ROTA: CADASTRAR USUÁRIO
app.post('/api/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha)
    return res.status(400).json({ message: 'Preencha todos os campos.' });

  try {
    // Criptografa a senha
    const hashed = await bcrypt.hash(senha, 10);

    const result = await pool.query(
      'INSERT INTO users (nome, email, senha_hash) VALUES ($1,$2,$3) RETURNING id,nome,email',
      [nome, email, hashed]
    );

    res.status(201).json({
      message: 'Usuário cadastrado com sucesso!',
      user: result.rows[0]
    });

  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ message: 'E-mail já cadastrado.' });

    console.error('Erro /api/cadastro:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
});

// ROTA: LOGIN
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha)
    return res.status(400).json({ message: 'Preencha todos os campos.' });

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    // Validação da senha
    const valid = await bcrypt.compare(senha, user.senha_hash);
    if (!valid) return res.status(401).json({ message: 'Senha incorreta.' });

    // Criação do token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '1h' }
    );

    res.json({ message: 'Login realizado com sucesso!', token });

  } catch (err) {
    console.error('Erro /api/login:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
});

// ROTA: UPLOAD DE RESUMO
app.post('/api/upload', upload.single('arquivo'), async (req, res) => {
  try {
    const { titulo, descricao, curso } = req.body;
    const arquivo = req.file?.filename;

    // Verificação de token
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
      return res.status(401).json({ message: 'Token ausente.' });

    let user_id;
    try {
      const token = auth.split(' ')[1];
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET || 'dev-secret'
      );
      user_id = payload.id;
    } catch (err) {
      return res.status(401).json({ message: 'Token inválido.' });
    }

    // Campos obrigatórios
    if (!titulo || !arquivo)
      return res.status(400).json({ message: 'Campos obrigatórios faltando.' });

    // Salva no banco
    await pool.query(
      'INSERT INTO resumos (titulo, descricao, curso, arquivo, user_id) VALUES ($1,$2,$3,$4,$5)',
      [titulo, descricao, curso, arquivo, user_id]
    );

    res.status(201).json({ message: 'Resumo enviado com sucesso!' });

  } catch (err) {
    console.error('Erro /api/upload:', err);
    res.status(500).json({ message: 'Erro ao enviar resumo.' });
  }
});

// ROTA: LISTAR RESUMOS
app.get('/api/resumos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.titulo, r.descricao, r.curso, r.arquivo,
             r.created_at, u.id AS user_id, u.nome AS uploader
      FROM resumos r
      LEFT JOIN users u ON u.id = r.user_id
      ORDER BY r.created_at DESC
    `);

    const data = result.rows.map(r => ({
      ...r,
      url: r.arquivo
        ? `${req.protocol}://${req.get('host')}/uploads/${r.arquivo}`
        : null
    }));

    res.json(data);

  } catch (err) {
    console.error('Erro /api/resumos:', err);
    res.status(500).json({ message: 'Erro ao buscar resumos.' });
  }
});

// ROTA DE TESTE
app.get('/', (_, res) => {
  res.send('Servidor rodando corretamente');
});

// INICIALIZA O SERVIDOR
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
