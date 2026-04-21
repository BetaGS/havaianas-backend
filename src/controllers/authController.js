const User = require('../models/User'); // Certifique-se de que o caminho está correto
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Chave secreta para assinar o token (em produção, use process.env.JWT_SECRET)
const JWT_SECRET = 'seu_segredo_jwt_super_seguro';

exports.register = async (req, res) => {
  try {
    const { username, password, cargo } = req.body;

    // Verifica se o usuário já existe
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });
    }

    // Criptografa a senha
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
      cargo
    });

    await newUser.save();
    res.status(201).json({ message: 'Funcionário cadastrado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar funcionário.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Busca o usuário no banco
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }

    // Compara a senha digitada com a criptografada no banco
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }

    // Gera o token de acesso (válido por 30 dias)
    const token = jwt.sign(
      { id: user._id, cargo: user.cargo, username: user.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      username: user.username,
      cargo: user.cargo
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar login.' });
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const { username, subscription } = req.body;
    
    // Vincula a inscrição do navegador ao perfil do usuário no MongoDB
    await User.findOneAndUpdate(
      { username },
      { pushSubscription: subscription }
    );

    res.status(200).json({ message: 'Inscrição de push atualizada com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar inscrição de push.' });
  }
};