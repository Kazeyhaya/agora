// src/models/testimonial.class.js
const db = require('./db');

class Testimonial {
    
    // O "nascimento" de um depoimento
    constructor({ id, from_user, to_user, text, timestamp }) {
        this.id = id;
        this.from_user = from_user;
        this.to_user = to_user;
        this.text = text;
        this.timestamp = timestamp || new Date();
    }

    // --- MÉTODOS DE INSTÂNCIA ---
    
    // Guarda um NOVO depoimento na BD
    async save() {
        const result = await db.query(
            'INSERT INTO testimonials (from_user, to_user, text, timestamp) VALUES ($1, $2, $3, $4) RETURNING *', 
            [this.from_user, this.to_user, this.text, this.timestamp]
        );
        this.id = result.rows[0].id;
        this.timestamp = result.rows[0].timestamp;
        return this;
    }

    // --- MÉTODOS ESTÁTICOS ("Fábricas") ---
    
    // Encontra todos os depoimentos PARA um utilizador
    static async findForUser(username) {
        const result = await db.query(
            'SELECT * FROM testimonials WHERE to_user = $1 ORDER BY timestamp DESC', 
            [username]
        );
        // Converte cada linha da BD num objeto Testimonial
        return result.rows.map(row => new Testimonial(row));
    }
}

module.exports = Testimonial;