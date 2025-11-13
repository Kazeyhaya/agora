const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
// 👇 MUDANÇA: O caminho agora usa 'path.join' para ser à prova de erros
const db = require(path.join(__dirname, 'src', 'models', 'db'));

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// --- ROTAS DA API ---
// 👇 MUDANÇA: O caminho agora usa 'path.join'
const postRoutes = require(path.join(__dirname, 'src', 'routes', 'post.routes'));
app.use('/api/posts', postRoutes);

// (O resto das rotas de perfil, comunidade, etc. ainda estão aqui)
// (Vamos migrá-las depois que isto funcionar)


// --- ROTA PRINCIPAL (O HTML) ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'agora.html')); 
});

// --- Lógica do Socket.IO (Chat) ---
// (A lógica de Socket.IO e setupDatabase ainda está aqui)
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
db.setupDatabase().then(() => {
  server.listen(port, () => {
    console.log(`Agora a rodar na porta ${port}`);
  });
});