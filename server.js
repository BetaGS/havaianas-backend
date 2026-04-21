const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const webpush = require('web-push');
const mongoose = require('mongoose');

// Importação das rotas e controllers (Certifique-se de criar os arquivos abaixo)
const authRoutes = require('./src/routes/authRoutes');
const User = require('./src/models/User'); 

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO WEB PUSH ---
const publicVapidKey = 'BGJ6TON0nIcsUzfW7oD-mjyziRuEIz7WbRen612Ke6S7GmS_AbzZuQ8wKeIYNZsLUmzXNqfnQHWIyvRLKYDVhSM';
const privateVapidKey = '0_PV3hASQU70wlmus8i9gBGBovXvrt4Av4qJSxe6GkY';

webpush.setVapidDetails(
  'mailto:seu-email@exemplo.com',
  publicVapidKey,
  privateVapidKey
);

// --- CONEXÃO COM BANCO DE DADOS ---
// No Render, adicione a variável de ambiente MONGO_URI
const MONGO_URI = process.env.MONGO_URI || "SUA_URL_DO_MONGODB_ATLAS_AQUI"; 

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Conectado"))
  .catch(err => console.error("❌ Erro ao conectar MongoDB:", err));

// --- ROTAS ---
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Havaianas Backend Online com Auth! 🚀');
});

const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ['polling', 'websocket']
});

// --- LÓGICA DE EVENTOS (SOCKET + PUSH) ---
io.on('connection', (socket) => {
  console.log(`Dispositivo conectado: ${socket.id}`);

  socket.on('novo_pedido', async (pedido) => {
    console.log('Pedido recebido:', pedido);
    
    // 1. Socket (Tempo real - App aberto)
    io.emit('atualizar_pedidos', pedido);

    // 2. Push Notification (Apenas para ESTOQUISTAS logados)
    try {
      const estoquistas = await User.find({ 
        cargo: 'estoquista', 
        pushSubscription: { $ne: null } 
      });

      const payload = JSON.stringify({
        title: '📦 Novo Pedido Havaianas!',
        body: `${pedido.solicitante} enviou uma nova solicitação.`,
        url: '/estoque',
        pedido: pedido
      });

      estoquistas.forEach(user => {
        webpush.sendNotification(user.pushSubscription, payload, {
          TTL: 60,
          urgency: 'high'
        }).catch(err => {
          // Se o token for inválido (410 GONE), removemos do banco
          if (err.statusCode === 410 || err.statusCode === 404) {
            User.findByIdAndUpdate(user._id, { pushSubscription: null }).exec();
          }
        });
      });
      console.log(`Push enviado para ${estoquistas.length} estoquistas.`);
    } catch (error) {
      console.error("Erro ao processar notificações push:", error);
    }
  });

  socket.on('status_pedido', (dados) => {
    io.emit('pedido_atualizado', dados);
  });

  socket.on('disconnect', () => console.log("Dispositivo desconectado"));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});