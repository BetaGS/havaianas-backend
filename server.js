const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const webpush = require('web-push');
const mongoose = require('mongoose');

// Tenta carregar o dotenv apenas se ele estiver instalado (evita erro MODULE_NOT_FOUND)
try {
    require('dotenv').config();
} catch (e) {
    console.log("Aviso: dotenv não encontrado, usando variáveis de ambiente do sistema.");
}

// IMPORTANTE: Confira se no VS Code as pastas se chamam exatamente 'src', 'routes' e 'models'
// E se os arquivos são 'authRoutes.js' e 'User.js'
const authRoutes = require('./src/routes/authRoutes');
const User = require('./src/models/User'); 

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO WEB PUSH ---
const publicVapidKey = process.env.PUBLIC_VAPID_KEY || 'BGJ6TON0nIcsUzfW7oD-mjyziRuEIz7WbRen612Ke6S7GmS_AbzZuQ8wKeIYNZsLUmzXNqfnQHWIyvRLKYDVhSM';
const privateVapidKey = process.env.PRIVATE_VAPID_KEY || '0_PV3hASQU70wlmus8i9gBGBovXvrt4Av4qJSxe6GkY';

webpush.setVapidDetails(
  'mailto:suporte@seudominio.com',
  publicVapidKey,
  privateVapidKey
);

// --- CONEXÃO COM BANCO DE DADOS ---
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://BetaGS:Bielssmv711@cluster0.sgrja1k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"; 

// Opções de conexão para maior estabilidade
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Conectado (BetaGS Cluster)"))
  .catch(err => {
    console.error("❌ Erro crítico ao conectar MongoDB:", err.message);
    process.exit(1); // Fecha o app se não conseguir conectar ao banco
  });

// --- ROTAS ---
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Havaianas Backend Online 🚀');
});

const server = http.createServer(app);

// --- CONFIGURAÇÃO SOCKET.IO ---
const io = socketIo(server, {
  cors: { 
    origin: "*", 
    methods: ["GET", "POST"] 
  },
  transports: ['websocket', 'polling']
});

// --- LÓGICA DE EVENTOS (SOCKET + PUSH) ---
io.on('connection', (socket) => {
  console.log(`📡 Novo dispositivo conectado: ${socket.id}`);

  socket.on('novo_pedido', async (pedido) => {
    console.log('📦 Pedido recebido no servidor:', pedido);
    
    // 1. Socket (Entrega em tempo real para quem está com o site aberto)
    io.emit('pedido_recebido', pedido);

    // 2. Push Notification (Acordar celular no bolso)
    try {
      // Busca estoquistas com inscrição ativa no banco
      const estoquistas = await User.find({ 
        cargo: 'estoquista', 
        pushSubscription: { $exists: true, $ne: null } 
      });

      if (estoquistas.length > 0) {
        const payload = JSON.stringify({
          title: '📦 NOVO PEDIDO!',
          body: `${pedido.solicitante || 'Um vendedor'} enviou uma nova lista.`,
          url: '/estoquista',
          pedido: pedido
        });

        estoquistas.forEach(user => {
          webpush.sendNotification(user.pushSubscription, payload, {
            TTL: 60,
            urgency: 'high'
          }).catch(err => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              console.log(`Limpando token expirado de: ${user.username}`);
              User.findByIdAndUpdate(user._id, { pushSubscription: null }).exec();
            }
          });
        });
        console.log(`🔔 Push enviado para ${estoquistas.length} dispositivos.`);
      }
    } catch (error) {
      console.error("❌ Erro no Push:", error);
    }
  });

  socket.on('confirmar_conclusao', (dados) => {
    io.emit('pedido_concluido', dados);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Dispositivo desconectado`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});