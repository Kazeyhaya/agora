const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Pool } = require('pg'); // Importa o 'pg' (PostgreSQL)

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;
app.use(express.json());

// --- Configuração do Banco de Dados PostgreSQL ---
// O 'pg' automaticamente usa a variável de ambiente DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necessário para conexões no Render
  }
});

// Função para criar a tabela se ela não existir
// Função para criar a tabela se ela não existir
async function setupDatabase() {
	const client = await pool.connect();
	try {
	  // Tabela de Mensagens (do Chat)
	  await client.query(`
		CREATE TABLE IF NOT EXISTS messages (
		  id SERIAL PRIMARY KEY,
		  channel TEXT NOT NULL,
		  "user" TEXT NOT NULL, 
		  message TEXT NOT NULL,
		  timestamp TIMESTAMPTZ DEFAULT NOW()
		)
	  `);
  
	  // NOVA Tabela de Posts (do Feed)
	  await client.query(`
		CREATE TABLE IF NOT EXISTS posts (
		  id SERIAL PRIMARY KEY,
		  "user" TEXT NOT NULL,
		  text TEXT NOT NULL,
		  likes INT DEFAULT 0,
		  timestamp TIMESTAMPTZ DEFAULT NOW()
		)
	  `);
	  
	  console.log('Tabelas "messages" e "posts" verificadas/criadas com sucesso.');
  
	} catch (err) {
	  console.error('Erro ao criar tabelas:', err);
	} finally {
	  client.release();
	}
  }


// --- Servir o Frontend ---
app.get('/api/posts', async (req, res) => {
	try {
	  const result = await pool.query(
		`SELECT * FROM posts ORDER BY timestamp DESC LIMIT 30`
	  );
	  // Envia os posts de volta como JSON
	  res.json({ posts: result.rows });
	} catch (err) {
	  console.error('Erro ao buscar posts:', err);
	  res.status(500).json({ error: 'Erro no servidor' });
	}
  });
  
  // [POST] Rota para CRIAR um novo post no Feed
  app.post('/api/posts', async (req, res) => {
	// O "app.use(express.json())" que você adicionou lá em cima
	// permite que a gente leia o req.body
	const { user, text } = req.body;
  
	if (!user || !text) {
	  return res.status(400).json({ error: 'Usuário e texto são obrigatórios' });
	}
  
	try {
	  const result = await pool.query(
		`INSERT INTO posts ("user", text, timestamp) VALUES ($1, $2, NOW()) RETURNING *`,
		[user, text]
	  );
	  // Envia o post recém-criado de volta
	  res.status(201).json(result.rows[0]);
	} catch (err) {
	  console.error('Erro ao criar post:', err);
	  res.status(500).json({ error: 'Erro no servidor' });
	}
  });

// --- Lógica do Socket.IO com PostgreSQL ---
io.on('connection', (socket) => {
  console.log(`Um utilizador conectou-se: ${socket.id}`);

  // 1. OUVIR QUANDO O UTILIZADOR MUDA DE CANAL
  socket.on('joinChannel', async (channelName) => {
    try {
      console.log(`Utilizador ${socket.id} entrou no canal ${channelName}`);
      socket.join(channelName); 

      // Carrega o histórico do banco de dados
      const result = await pool.query(
        `SELECT * FROM messages WHERE channel = $1 ORDER BY timestamp ASC LIMIT 50`, 
        [channelName]
      );
      
      // Converte o formato do timestamp para o frontend (se necessário)
      const history = result.rows.map(row => ({
        ...row,
        user: row.user, // 'user' é uma palavra reservada, pode precisar de aspas
        timestamp: new Date(row.timestamp).toLocaleString('pt-BR')
      }));

      socket.emit('loadHistory', history);

    } catch (err) {
      console.error('Erro em joinChannel:', err);
    }
  });

  // 2. OUVIR QUANDO O UTILIZADOR ENVIA UMA MENSAGEM
  socket.on('sendMessage', async (data) => {
    const { channel, user, message } = data;
    const timestamp = new Date();

    try {
      // Guarda a nova mensagem no banco de dados
      await pool.query(
        `INSERT INTO messages (channel, "user", message, timestamp) VALUES ($1, $2, $3, $4)`,
        [channel, user, message, timestamp]
      );

      // Prepara os dados para enviar de volta (com timestamp formatado)
      const broadcastData = {
        ...data,
        timestamp: timestamp.toLocaleString('pt-BR')
      };

      // Emite a nova mensagem para TODOS na sala (canal)
      io.to(channel).emit('newMessage', broadcastData);

    } catch (err) {
      console.error('Erro ao guardar mensagem:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Utilizador desconectou-se: ${socket.id}`);
  });
});

// --- Iniciar o Servidor ---
setupDatabase().then(() => {
  server.listen(port, () => {
    console.log(`OrkCord a rodar na porta ${port}`);
  });
});