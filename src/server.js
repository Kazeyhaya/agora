// src/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./models/db');

// Importações de Segurança
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// --- CONFIGURAÇÃO INICIAL ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const port = process.env.PORT || 3000;

// --- 🔒 SEGURANÇA ---

// 1. CORS
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. Rate Limiting (AJUSTADO PARA NÃO BLOQUEAR VOCÊ)
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 3000, // ⚠️ AUMENTEI DE 100 PARA 3000 (Para não travar nos testes)
	message: { error: "Muitas requisições. Calma lá, cowboy!" },
	standardHeaders: true,
	legacyHeaders: false,
});

// Aplica o limite apenas nas rotas de API
app.use('/api/', apiLimiter);

// --- MIDDLEWARES ---
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// Injeta o socket.io nas requisições
app.use((req, res, next) => {
    req.io = io;
    next();
});

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});


// --- ROTAS DA API ---
const postRoutes = require('./routes/post.routes');
app.use('/api/posts', postRoutes);

const profileRoutes = require('./routes/profile.routes');
app.use('/api', profileRoutes);

const testimonialRoutes = require('./routes/testimonial.routes');
app.use('/api/testimonials', testimonialRoutes);

const { communitiesRouter, communityRouter } = require('./routes/community.routes');
app.use('/api/communities', communitiesRouter);
app.use('/api/community', communityRouter);


// --- ROTA PRINCIPAL ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'agora.html')); 
});

// --- CHAT ---
const { initializeSocket } = require('./socket/chat.handler');
initializeSocket(io);


// --- START ---
if (require.main === module) {
  db.setupDatabase().then(() => {
    server.listen(port, () => {
      console.log(`🚀 Agora a rodar na porta ${port}`);
      console.log(`🛡️ Segurança: Limite de requisições aumentado para desenvolvimento.`);
    });
  }).catch(err => {
      console.error("Falha crítica ao iniciar a base de dados:", err);
      process.exit(1);
  });
}

module.exports = app;