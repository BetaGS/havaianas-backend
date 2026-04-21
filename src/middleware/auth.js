const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ msg: 'Acesso negado' });

  try {
    const decoded = jwt.verify(token, 'SEU_SEGREDO_JWT');
    req.user = decoded; // Coloca os dados do usuário na requisição
    next();
  } catch (e) {
    res.status(400).json({ msg: 'Token inválido' });
  }
};