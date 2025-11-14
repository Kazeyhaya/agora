// src/models/post.class.js
const db = require('./db');

class Post {
    
    // Adicionado avatar_url ao construtor
    constructor({ id, user, text, likes, timestamp, avatar_url }) {
        this.id = id;
        this.user = user;
        this.text = text;
        this.likes = likes || 0;
        this.timestamp = timestamp || new Date();
        this.avatar_url = avatar_url || null; // Opcional, vindo do JOIN
    }

    // --- MÉTODOS DE INSTÂNCIA (save, addLike, removeLike) ---
    
    async save() {
        // Se não tiver ID, é um post novo (INSERT)
        if (!this.id) {
            const result = await db.query(
                `INSERT INTO posts ("user", text, timestamp, likes) VALUES ($1, $2, $3, $4) RETURNING *`,
                [this.user, this.text, this.timestamp, this.likes]
            );
            this.id = result.rows[0].id; // Atualiza o objeto com o novo ID
        } else {
            // Se já tem ID, é uma atualização (UPDATE)
            await db.query(
                `UPDATE posts SET "user" = $1, text = $2, likes = $3 WHERE id = $4`,
                [this.user, this.text, this.likes, this.id]
            );
        }
        return this; // Retorna o próprio objeto atualizado
    }

    async addLike() {
        this.likes++; // Atualiza o estado do objeto na memória
        // E atualiza na base de dados
        await db.query(`UPDATE posts SET likes = $1 WHERE id = $2`, [this.likes, this.id]);
        return this;
    }

    async removeLike() {
        this.likes = Math.max(0, this.likes - 1); // Atualiza o estado
        // E atualiza na base de dados
        await db.query(`UPDATE posts SET likes = $1 WHERE id = $2`, [this.likes, this.id]);
        return this;
    }


    // --- MÉTODOS ESTÁTICOS ("Fábricas") ---

    // Encontra um post por ID e retorna um objeto Post
    static async findById(postId) {
        const result = await db.query('SELECT * FROM posts WHERE id = $1', [postId]);
        if (!result.rows[0]) return null;
        
        // Converte a linha da BD num objeto da nossa classe
        return new Post(result.rows[0]); 
    }

    // Query atualizada com LEFT JOIN para buscar avatar_url
    static async getPersonalizedFeed(userName) {
        const result = await db.query(
            `SELECT p.*, prof.avatar_url
             FROM posts p
             LEFT JOIN follows f ON p."user" = f.following_user
             LEFT JOIN profiles prof ON p."user" = prof."user"
             WHERE f.follower_user = $1 OR p."user" = $1
             ORDER BY p.timestamp DESC
             LIMIT 30`,
            [userName]
        );
        // Converte cada linha da BD num objeto Post
        return result.rows.map(row => new Post(row));
    }
    
    // Query atualizada com LEFT JOIN para buscar avatar_url
    static async getGlobalFeed() {
        const result = await db.query(
            `SELECT p.*, prof.avatar_url
             FROM posts p
             LEFT JOIN profiles prof ON p."user" = prof."user"
             ORDER BY p.timestamp DESC 
             LIMIT 30`
        );
        return result.rows.map(row => new Post(row));
    }

    // --- MÉTODOS ESTÁTICOS PARA COMENTÁRIOS ---

    static async getComments(postId) {
        const result = await db.query(
            'SELECT "user", text FROM comments WHERE post_id = $1 ORDER BY timestamp ASC', 
            [postId]
        );
        return result.rows;
    }

    static async createComment(postId, user, text) {
        const result = await db.query(
            'INSERT INTO comments (post_id, "user", text) VALUES ($1, $2, $3) RETURNING *', 
            [postId, user, text]
        );
        return result.rows[0];
    }
}

// Exportamos a Classe 'Post'
module.exports = Post;