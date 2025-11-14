// src/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./models/db'); // Importa o nosso módulo de BD

// --- CONFIGURAÇÃO INICIAL ---
const app = express();
const server = http.createServer(app);
const io = new Server(server); // Cria o servidor Socket.IO
const port = process.env.PORT || 3000;

// --- MIDDLEWARES ---
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));


// --- ROTAS DA API (TOTALMENTE REATORADAS) ---

// 1. ROTAS DE POSTS (Feed, Likes, Comentários)
const postRoutes = require('./routes/post.routes');
app.use('/api/posts', postRoutes);

// 2. ROTAS DE PERFIL (Perfil, Seguir, Amigos)
const profileRoutes = require('./routes/profile.routes');
app.use('/api', profileRoutes); // Monta em /api para apanhar /api/profile, /api/follow, etc.

// 3. ROTAS DE DEPOIMENTOS
const testimonialRoutes = require('./routes/testimonial.routes');
app.use('/api/testimonials', testimonialRoutes);

// 4. ROTAS DE COMUNIDADES (Plural e Singular)
const { communitiesRouter, communityRouter } = require('./routes/community.routes');
app.use('/api/communities', communitiesRouter); // Rotas no plural (ex: /api/communities/explore)
app.use('/api/community', communityRouter);   // Rotas no singular (ex: /api/community/join)


// --- ROTA PRINCIPAL (O HTML) ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'agora.html')); 
});

// --- LÓGICA DO SOCKET.IO (REATORADO) ---
// Importa o nosso novo "gestor" de chat
const { initializeSocket } = require('./socket/chat.handler');
// Passa o nosso servidor 'io' para ele, para que ele possa "ligar-se"
initializeSocket(io);


// --- INICIAR O SERVIDOR ---
db.setupDatabase().then(() => {
  server.listen(port, () => {
    console.log(`🚀 Agora a rodar na porta ${port}`);
  });
}).catch(err => {
    console.error("Falha crítica ao iniciar a base de dados:", err);
    process.exit(1);
});