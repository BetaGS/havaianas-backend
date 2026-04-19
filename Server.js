const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rota de teste para o Health Check do Render
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
  transports: ['websocket', 'polling']
});

// Lógica de Eventos do Socket.io
io.on('connection', (socket) => {
  console.log(`Novo usuário conectado: ${socket.id}`);

  // Evento: Novo pedido criado (Vendedor/Gerente -> Estoquista)
  socket.on('novo_pedido', (pedido) => {
    console.log('Pedido recebido:', pedido);
    io.emit('atualizar_pedidos', pedido);
  });

  // Evento: Status atualizado (Estoquista -> Todos)
  socket.on('status_pedido', (dados) => {
    console.log('Atualização de status:', dados);
    io.emit('pedido_atualizado', dados);
  });

  socket.on('disconnect', () => {
    console.log('Usuário desconectado');
  });
});

// Porta dinâmica para o Render
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});