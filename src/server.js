// src/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./models/db');

// 👇 NOVAS IMPORTAÇÕES DE SEGURANÇA 👇
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// --- CONFIGURAÇÃO INICIAL ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  // Configura o CORS também para o Socket (Chat)
  cors: {
    origin: "*", // ⚠️ Em produção, mude '*' para o seu domínio: 'https://agora-vcnz.onrender.com'
    methods: ["GET", "POST"]
  }
});
const port = process.env.PORT || 3000;

// --- 🔒 CAMADA DE SEGURANÇA (NOVO) ---

// 1. CORS (Controla QUEM pode acessar)
// Impede que sites piratas usem sua API via navegador
app.use(cors({
  origin: '*', // ⚠️ IMPORTANTE: Quando terminar de testar, troque '*' pelo link do seu site no Render
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. Rate Limiting (Controla a VELOCIDADE)
// Impede ataques de força bruta (adivinhar senhas) e spam
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // Janela de 15 minutos
	max: 100, // Limite de 100 requisições por IP a cada 15 min
	message: { error: "Muitas requisições. Tente novamente mais tarde." },
	standardHeaders: true,
	legacyHeaders: false,
});

// Aplica o limitador apenas nas rotas da API (deixa o HTML/CSS livres)
app.use('/api/', apiLimiter);

// --- MIDDLEWARES ---
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// Middleware para injetar o 'io' nas requisições
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


// --- ROTA PRINCIPAL (O HTML) ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'agora.html')); 
});

// --- LÓGICA DO SOCKET.IO ---
const { initializeSocket } = require('./socket/chat.handler');
initializeSocket(io);


// --- INICIAR O SERVIDOR ---
if (require.main === module) {
  db.setupDatabase().then(() => {
    server.listen(port, () => {
      console.log(`🚀 Agora a rodar na porta ${port}`);
      console.log(`🛡️ Segurança ativada: CORS e Rate Limit`);
    });
  }).catch(err => {
      console.error("Falha crítica ao iniciar a base de dados:", err);
      process.exit(1);
  });
}

module.exports = app;