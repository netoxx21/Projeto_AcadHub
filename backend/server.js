const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const pool = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===========================
// 🔹 Configuração do Multer (upload de arquivos)
// ===========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ===========================
// 🔹 Cadastro de usuário
// ===========================
app.post('/api/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha)
    return res.status(400).json({ message: 'Preencha todos os campos.' });

  try {
    const hashed = await bcrypt.hash(senha, 10);
    const result = await pool.query(
      'INSERT INTO users (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, nome, email',
      [nome, email, hashed]
    );

    res.status(201).json({ message: 'Usuário cadastrado com sucesso!', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ message: 'Email já cadastrado.' });
    } else {
      console.error(err);
      res.status(500).json({ message: 'Erro no servidor.' });
    }
  }
});

// ===========================
// 🔹 Login de usuário
// ===========================
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha)
    return res.status(400).json({ message: 'Preencha todos os campos.' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const valid = await bcrypt.compare(senha, user.senha_hash);
    if (!valid) return res.status(401).json({ message: 'Senha incorreta.' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login realizado com sucesso!', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
});

// ===========================
// 🔹 Upload de resumo
// ===========================
app.post('/upload', upload.single('arquivo'), async (req, res) => {
  const { titulo, descricao, curso, user_id } = req.body;
  const arquivo = req.file ? req.file.filename : null;

  if (!titulo || !arquivo || !user_id)
    return res.status(400).json({ message: 'Campos obrigatórios faltando.' });

  try {
    await pool.query(
      'INSERT INTO resumos (titulo, descricao, curso, arquivo, user_id) VALUES ($1, $2, $3, $4, $5)',
      [titulo, descricao, curso, arquivo, user_id]
    );
    res.status(201).json({ message: 'Resumo enviado com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao enviar resumo.' });
  }
});

// ===========================
// 🔹 Rota de teste (opcional)
// ===========================
app.get('/', (req, res) => {
  res.send('Servidor rodando corretamente 🚀');
});

// ===========================
// 🔹 Inicialização do servidor
// ===========================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));