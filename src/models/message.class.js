// src/models/message.class.js
const db = require('./db');

class Message {
    
    constructor({ id, channel, user, message, timestamp }) {
        this.id = id;
        this.channel = channel;
        this.user = user;
        this.message = message;
        // Se a BD nos der um timestamp, usa-o. Senão, usa o atual.
        this.timestamp = timestamp || new Date(); 
    }

    // --- MÉTODOS DE INSTÂNCIA ---
    
    // Guarda esta mensagem nova na BD
    async save() {
        const result = await db.query(
            `INSERT INTO messages (channel, "user", message, timestamp) 
             VALUES ($1, $2, $3, NOW()) 
             RETURNING id, timestamp`, // Pede à BD o ID e o timestamp real
            [this.channel, this.user, this.message]
        );
        
        // Atualiza o nosso objeto com os dados da BD
        this.id = result.rows[0].id;
        this.timestamp = result.rows[0].timestamp;
        
        return this;
    }

    // --- MÉTODOS ESTÁTICOS ("Fábricas") ---
    
    // Encontra as últimas 50 mensagens de um canal
    static async getHistory(channelName) {
        const result = await db.query(
            `SELECT * FROM (
                SELECT * FROM messages 
                WHERE channel = $1 
                ORDER BY timestamp DESC 
                LIMIT 50
            ) AS subquery 
             ORDER BY timestamp ASC`, // Re-ordena para o frontend (antigo > novo)
            [channelName]
        );
        
        // Converte cada linha da BD num objeto Message
        return result.rows.map(row => new Message(row));
    }
}

module.exports = Message;