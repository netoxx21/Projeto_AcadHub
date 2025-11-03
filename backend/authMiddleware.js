const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

//Carrega o segredo do JWT do arquivo .env
dotenv.config({ path: '../.env' }); 

const JWT_SECRET = process.env.JWT_SECRET;

/**
  Middleware para verificar se o usuário está autenticado via Token JWT.
  Se o token for válido: - Adiciona o objeto 'user' (contendo o id) à requisição (req.user).
  Chama next() para prosseguir com a rota. Se o token for inválido/ausente: - Retorna uma resposta de erro 401 (Não Autorizado).
 */
const protect = (req, res, next) => {
    let token;

    //Verificar se o token existe no cabeçalho "Authorization"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            //Extrair apenas o token (ignorar "Bearer ")
            token = req.headers.authorization.split(' ')[1];

            //Decodificar e verificar o token usando o segredo
            const decoded = jwt.verify(token, JWT_SECRET);

            //Adicionar o ID do usuário (payload) à requisição
            req.user = decoded; 

            //Prosseguir para a próxima função da rota
            next();
            
        } catch (error) {
            console.error('Erro na verificação do token:', error);
            //Token inválido (expirado, modificado ou segredo incorreto)
            return res.status(401).json({ error: 'Não autorizado, token falhou ou expirou.' });
        }
    }

    //Se não houver token no cabeçalho
    if (!token) {
        return res.status(401).json({ error: 'Não autorizado, nenhum token fornecido.' });
    }
};

module.exports = { protect };
