const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const webpush = require('web-push');

const app = express();

// Middlewares
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

// Armazenamento temporário de inscrições (Zera no restart do Render)
let subscriptions = [];

// Rota para o celular se inscrever
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  
  // Evitar duplicados por endpoint
  const exists = subscriptions.find(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    subscriptions.push(subscription);
    console.log('✅ Novo dispositivo inscrito para notificações push');
  }
  
  res.status(201).json({});
});

// Rota de Health Check
app.get('/', (req, res) => {
  res.send('Havaianas Backend Online! 🚀');
});

const server = http.createServer(app);

// Configuração do Socket.io
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket'], 
  pingTimeout: 60000,
  pingInterval: 25000
});

// --- LÓGICA DE EVENTOS ---
io.on('connection', (socket) => {
  console.log(`Dispositivo conectado: ${socket.id}`);

  socket.on('novo_pedido', (pedido) => {
    console.log('Pedido recebido:', pedido);
    
    // 1. Socket (Tempo real - Para quem está com app aberto)
    io.emit('atualizar_pedidos', pedido);

    // 2. Push Notification (Segundo plano - Atravessa o bloqueio de tela)
    const payload = JSON.stringify({
      title: '📦 Novo Pedido Havaianas!',
      body: `${pedido.solicitante} solicitou ${pedido.itens?.length || 0} item(s).`,
      url: '/',
      pedido: pedido // IMPORTANTE: Envia o objeto completo do pedido via Push
    });

    console.log(`Disparando Push para ${subscriptions.length} inscritos...`);

    subscriptions.forEach(sub => {
      webpush.sendNotification(sub, payload, {
        TTL: 60, 
        urgency: 'high'
      }).catch(err => {
        console.error('Erro ao enviar Push:', err.statusCode);
        if (err.statusCode === 410 || err.statusCode === 404) {
          subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
        }
      });
    });
  });

  socket.on('status_pedido', (dados) => {
    console.log('Atualização de status:', dados);
    io.emit('pedido_atualizado', dados);
  });

  socket.on('disconnect', (reason) => {
    console.log(`Dispositivo desconectado: ${socket.id} - ${reason}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});