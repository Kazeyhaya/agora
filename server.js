const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: { origin: '*' }
});

// Servir arquivos estáticos a partir do diretório atual
app.use(express.static(path.join(__dirname)));

// Rota raiz para servir o index.html do front-end
app.get('/', (_req, res) => {
	res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
	// Usuário entra em um canal (sala)
	socket.on('joinChannel', (channel) => {
		if (typeof channel !== 'string' || !channel.trim()) return;
		socket.join(channel);
	});

	// Recebe mensagem e retransmite para todos na sala (exceto o remetente)
	socket.on('sendMessage', (payload) => {
		const { channel, text } = payload || {};
		if (typeof channel !== 'string' || !channel.trim()) return;
		if (typeof text !== 'string' || !text.trim()) return;
		io.to(channel).except(socket.id).emit('message', {
			channel,
			text,
			ts: Date.now()
		});
	});
});

server.listen(PORT, () => {
	console.log(`OrkCord backend running on http://localhost:${PORT}`);
});


