// src/socket/chat.handler.js

// Armazena o histórico de mensagens em memória (enquanto o servidor estiver ligado)
const channelsHistory = { 
    'geral': [], 
    'scraps': [], 
    'testimonials': [], 
    'albums': [], 
    'voz-g1': [], 
    'voz-music': [] 
  };
  
  // Esta função irá "ligar" a lógica ao servidor Socket.IO principal
  function initializeSocket(io) {
  
    // Isto é o que estava no server.js:
    io.on('connection', (socket) => {
      console.log(`Um utilizador conectou-se: ${socket.id}`);
      
      // Quando um utilizador entra num canal
      socket.on('joinChannel', (data) => {
        const { channel, user } = data;
        socket.join(channel);
        console.log(`${user} entrou no canal: ${channel}`);
        
        // Envia o histórico (se existir) apenas para este socket
        if (channelsHistory[channel]) {
          socket.emit('loadHistory', channelsHistory[channel]);
        }
      });
      
      // Quando um utilizador envia uma mensagem
      socket.on('sendMessage', (data) => {
        const { channel } = data;
        
        // Guarda a mensagem no histórico do canal
        if (!channelsHistory[channel]) channelsHistory[channel] = [];
        channelsHistory[channel].push(data);
        
        // Limita o histórico para as últimas 50 mensagens
        if (channelsHistory[channel].length > 50) {
          channelsHistory[channel].shift();
        }
        
        // Envia a nova mensagem para todos nesse canal
        io.to(channel).emit('newMessage', data);
      });
  
      // Quando o utilizador se desconecta
      socket.on('disconnect', () => {
        console.log(`Utilizador desconectou-se: ${socket.id}`);
      });
    });
  }
  
  // Exportamos a função de inicialização
  module.exports = {
    initializeSocket
  };