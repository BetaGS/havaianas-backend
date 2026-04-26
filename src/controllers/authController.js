const User = require('../models/User'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// IMPORTANTE: Em produção, defina JWT_SECRET nas variáveis de ambiente do Render
const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_jwt_super_seguro';

exports.register = async (req, res) => {
  try {
    const { username, password, cargo } = req.body;

    // 1. Validação básica
    if (!username || !password || !cargo) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    // 2. Verifica se o usuário já existe (usando collation para evitar problemas de maiúsculas/minúsculas)
    const userExists = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    if (userExists) {
      return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });
    }

    // 3. Criptografa a senha
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
      cargo: cargo.toLowerCase() // Normaliza para evitar erro de rota no React
    });

    // 4. Salva no MongoDB
    await newUser.save();
    
    res.status(201).json({ message: 'Funcionário cadastrado com sucesso!' });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno ao registrar funcionário.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Busca o usuário
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }

    // 2. Compara a senha
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }

    // 3. Gera o token (30 dias)
    // Incluímos 'funcao' no payload para bater com o que o seu App.jsx espera
    const token = jwt.sign(
      { id: user._id, cargo: user.cargo, username: user.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // 4. Resposta enviando cargo (que o React chama de funcao)
    res.json({
      token,
      username: user.username,
      cargo: user.cargo,
      funcao: user.cargo // Enviamos os dois para garantir compatibilidade
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao processar login.' });
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const { username, subscription } = req.body;
    
    if (!username || !subscription) {
      return res.status(400).json({ error: 'Dados de inscrição incompletos.' });
    }

    await User.findOneAndUpdate(
      { username },
      { pushSubscription: subscription },
      { new: true }
    );

    res.status(200).json({ message: 'Inscrição de push atualizada!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar inscrição de push.' });
  }
};