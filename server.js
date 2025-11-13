const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
// 👇 MUDANÇA: Caminho corrigido para a nova estrutura
const db = require('./src/models/db'); 

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// --- ROTAS DA API ---
// 👇 MUDANÇA: Caminho corrigido para a nova estrutura
const postRoutes = require('./src/routes/post.routes');
app.use('/api/posts', postRoutes);

// (Aqui vamos adicionar as outras rotas - /api/profile, /api/community, etc. - no futuro)


// --- ROTA PRINCIPAL (O HTML) ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'agora.html')); 
});

// --- Lógica do Socket.IO (Chat) ---
// (Por agora, a lógica do Socket.IO e das tabelas que não são "posts" 
// ainda pode viver aqui, até a migrarmos)
io.on('connection', (socket) => {
  console.log(`Um utilizador conectou-se: ${socket.id}`);
  
  socket.on('joinChannel', async (data) => {
    // ... (lógica do joinChannel) ...
  });
  
  socket.on('sendMessage', async (data) => {
    // ... (lógica do sendMessage) ...
  });

  socket.on('disconnect', () => {
    console.log(`Utilizador desconectou-se: ${socket.id}`);
  });
});

// --- Iniciar o Servidor ---
// (A lógica de 'setupDatabase' e 'seedDatabase' foi movida para db.js)
db.setupDatabase().then(() => {
  server.listen(port, () => {
    console.log(`Agora a rodar na porta ${port}`);
  });
});