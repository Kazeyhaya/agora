// src/models/profile.class.js
const db = require('./db');

class Profile {
    
    // O "nascimento" de um perfil
    constructor({ user, bio }) {
        this.user = user;
        this.bio = bio || "Nenhuma bio definida.";
    }

    // --- MÉTODOS DE INSTÂNCIA ---

    // Salva (atualiza) a bio deste perfil na BD
    async save() {
        // "Upsert": Insere se não existir, atualiza se existir
        const result = await db.query(
            'INSERT INTO profiles ("user", bio) VALUES ($1, $2) ON CONFLICT ("user") DO UPDATE SET bio = $2 RETURNING bio',
            [this.user, this.bio]
        );
        this.bio = result.rows[0].bio; // Garante que o objeto tem o dado da BD
        return this;
    }

    // Este perfil (this.user) começa a seguir outro utilizador
    async follow(userToFollow) {
        await db.query(
            'INSERT INTO follows (follower_user, following_user) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [this.user, userToFollow]
        );
        return true;
    }

    // Este perfil (this.user) deixa de seguir outro utilizador
    async unfollow(userToUnfollow) {
        await db.query(
            'DELETE FROM follows WHERE follower_user = $1 AND following_user = $2',
            [this.user, userToUnfollow]
        );
        return true;
    }

    // Obtém a lista de quem este perfil (this.user) segue
    async getFollowing() {
        const result = await db.query('SELECT following_user FROM follows WHERE follower_user = $1', [this.user]);
        return result.rows.map(r => r.following_user); // Retorna ['ana', 'rui']
    }

    // Verifica se este perfil (this.user) segue um utilizador específico
    async isFollowing(userToCheck) {
        const result = await db.query('SELECT 1 FROM follows WHERE follower_user = $1 AND following_user = $2', [this.user, userToCheck]);
        return result.rows.length > 0;
    }

    // --- MÉTODOS ESTÁTICOS ("Fábricas") ---
    
    // Encontra um perfil por nome de utilizador
    static async findByUser(username) {
        const result = await db.query('SELECT * FROM profiles WHERE "user" = $1', [username]);
        if (result.rows[0]) {
            return new Profile(result.rows[0]); // Retorna um objeto Profile
        }
        // Se não houver 'bio' na BD, criamos um perfil "virtual"
        return new Profile({ user: username, bio: "Nenhuma bio definida." });
    }
}

module.exports = Profile;