const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const webpush = require('web-push'); // Adicionado para notificações Push

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO WEB PUSH ---
// Substitua essas chaves pelas suas (Gere com: webpush.generateVAPIDKeys())
const publicVapidKey = 'BGJ6TON0nIcsUzfW7oD-mjyziRuEIz7WbRen612Ke6S7GmS_AbzZuQ8wKeIYNZsLUmzXNqfnQHWIyvRLKYDVhSM';
const privateVapidKey = '0_PV3hASQU70wlmus8i9gBGBovXvrt4Av4qJSxe6GkY';

webpush.setVapidDetails(
  'mailto:seu-email@exemplo.com',
  publicVapidKey,
  privateVapidKey
);

// Armazenamento temporário de inscrições (Em produção, use um Banco de Dados)
let subscriptions = [];

// Rota para o celular se inscrever nas notificações
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  
  // Evitar duplicados
  const exists = subscriptions.find(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    subscriptions.push(subscription);
    console.log('✅ Novo dispositivo inscrito para notificações push');
  }
  
  res.status(201).json({});
});

// --- ROTA DE HEALTH CHECK ---
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
  console.log(`Novo dispositivo conectado: ${socket.id}`);

  // Evento: Novo pedido criado (Vendedor -> Estoquista)
  socket.on('novo_pedido', (pedido) => {
    console.log('Pedido recebido:', pedido);
    
    // 1. Envia via Socket (Para quem estiver com o app aberto na mão)
    io.emit('atualizar_pedidos', pedido);

    // 2. Dispara Push Notification (Para quem estiver com celular no bolso/bloqueado)
    const payload = JSON.stringify({
      title: '📦 Novo Pedido Havaianas!',
      body: `${pedido.solicitante} solicitou ${pedido.itens.length} item(s).`,
      url: '/estoque' // URL que abrirá ao clicar
    });

    subscriptions.forEach(sub => {
      webpush.sendNotification(sub, payload).catch(err => {
        console.error('Erro ao enviar Push:', err.endpoint);
        // Remove inscrição inválida/expirada
        if (err.statusCode === 410) {
          subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
        }
      });
    });
  });

  // Evento: Status atualizado (Estoquista -> Vendedor)
  socket.on('status_pedido', (dados) => {
    console.log('Atualização de status:', dados);
    io.emit('pedido_atualizado', dados);

    // Opcional: Enviar push para o vendedor avisando que o pedido está pronto
  });

  socket.on('disconnect', (reason) => {
    console.log(`Dispositivo desconectado: ${socket.id} - ${reason}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});