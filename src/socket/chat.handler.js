// src/socket/chat.handler.js

// Importa a nossa nova Classe de Mensagem
const Message = require('../models/message.class');

// O 'channelsHistory' em memória foi REMOVIDO.

function initializeSocket(io) {

  io.on('connection', (socket) => {
    console.log(`Um utilizador conectou-se: ${socket.id}`);
    
    // Quando um utilizador entra num canal
    socket.on('joinChannel', async (data) => {
      try {
        const { channel, user } = data;
        socket.join(channel);
        console.log(`${user} entrou no canal: ${channel}`);
        
        // Vai buscar o histórico à BASE DE DADOS
        const history = await Message.getHistory(channel);
        
        // Envia o histórico (da BD) apenas para este socket
        socket.emit('loadHistory', history);
        
      } catch (err) {
        console.error("Erro em 'joinChannel':", err);
      }
    });
    
    // Quando um utilizador envia uma mensagem
    socket.on('sendMessage', async (data) => {
      try {
        const { channel, user, message } = data;
        
        // Cria um novo objeto Message (ignora o timestamp do cliente)
        const newMessage = new Message({ channel, user, message });
        
        // Salva a mensagem na BASE DE DADOS
        await newMessage.save(); // O 'save' atualiza o objeto com o timestamp da BD
        
        // Envia a nova mensagem (agora com o timestamp da BD)
        // para todos nesse canal
        io.to(channel).emit('newMessage', newMessage);

      } catch (err) {
         console.error("Erro em 'sendMessage':", err);
      }
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