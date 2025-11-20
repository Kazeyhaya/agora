// src/models/profile.class.js
const db = require('./db');

class Profile {
    
    // Adicionado 'cover_url'
    constructor({ user, bio, mood, avatar_url, cover_url }) {
        this.user = user;
        this.bio = bio || "Nenhuma bio definida.";
        this.mood = mood || "✨ novo por aqui!";
        this.avatar_url = avatar_url || null;
        this.cover_url = cover_url || null;
    }

    async save() {
        // Atualizado para salvar cover_url
        const result = await db.query(
            'INSERT INTO profiles ("user", bio, mood, avatar_url, cover_url) VALUES ($1, $2, $3, $4, $5) ON CONFLICT ("user") DO UPDATE SET bio = $2, mood = $3, avatar_url = $4, cover_url = $5 RETURNING *',
            [this.user, this.bio, this.mood, this.avatar_url, this.cover_url]
        );
        this.bio = result.rows[0].bio;
        this.mood = result.rows[0].mood;
        this.avatar_url = result.rows[0].avatar_url;
        this.cover_url = result.rows[0].cover_url;
        return this;
    }

    // ... (follow, unfollow, getFollowing, isFollowing, getRatings, recordVisit, getRecentVisitors, getDailyVibe continuam IGUAIS) ...

    async follow(userToFollow) { await db.query('INSERT INTO follows (follower_user, following_user) VALUES ($1, $2) ON CONFLICT DO NOTHING', [this.user, userToFollow]); return true; }
    async unfollow(userToUnfollow) { await db.query('DELETE FROM follows WHERE follower_user = $1 AND following_user = $2', [this.user, userToUnfollow]); return true; }
    async getFollowing() { const r = await db.query(`SELECT f.following_user, p.avatar_url FROM follows f LEFT JOIN profiles p ON f.following_user = p."user" WHERE f.follower_user = $1`, [this.user]); return r.rows.map(row => ({ user: row.following_user, avatar_url: row.avatar_url })); }
    async isFollowing(u) { const r = await db.query('SELECT 1 FROM follows WHERE follower_user = $1 AND following_user = $2', [this.user, u]); return r.rows.length > 0; }
    
    async getRatings(viewer) {
        const tRes = await db.query(`SELECT rating_type, COUNT(*) as count FROM profile_ratings WHERE to_user = $1 GROUP BY rating_type`, [this.user]);
        const totals = { confiavel: 0, legal: 0, divertido: 0, falso: 0, chato: 0, toxico: 0 };
        for (const row of tRes.rows) if (totals[row.rating_type] !== undefined) totals[row.rating_type] = parseInt(row.count, 10);
        let userVotes = [];
        if (viewer) {
            const vRes = await db.query(`SELECT rating_type FROM profile_ratings WHERE to_user = $1 AND from_user = $2`, [this.user, viewer]);
            userVotes = vRes.rows.map(row => row.rating_type);
        }
        return { totals, userVotes };
    }
    async recordVisit(v) { if(v === this.user) return; await db.query(`INSERT INTO profile_visits (visitor_user, visited_user, timestamp) VALUES ($1, $2, NOW()) ON CONFLICT (visitor_user, visited_user) DO UPDATE SET timestamp = NOW()`, [v, this.user]); }
    async getRecentVisitors() { const r = await db.query(`SELECT pv.visitor_user, p.avatar_url, pv.timestamp FROM profile_visits pv LEFT JOIN profiles p ON pv.visitor_user = p."user" WHERE pv.visited_user = $1 ORDER BY pv.timestamp DESC LIMIT 5`, [this.user]); return r.rows.map(row => ({ user: row.visitor_user, avatar_url: row.avatar_url, timestamp: row.timestamp })); }
    
    static async getDailyVibe(username) {
        const today = new Date().toISOString().split('T')[0];
        const result = await db.query(`SELECT * FROM profile_vibes WHERE user_name = $1 AND vibe_date = $2`, [username, today]);
        if (result.rows[0]) return result.rows[0];
        const vibesList = [{ msg: "Sorte!", color: "#4caf50" }, { msg: "Cautela.", color: "#ef5350" }, { msg: "Criatividade.", color: "#ffeb3b" }, { msg: "Mistério.", color: "#673ab7" }];
        const randomVibe = vibesList[Math.floor(Math.random() * vibesList.length)];
        await db.query(`INSERT INTO profile_vibes (user_name, vibe_date, message, color) VALUES ($1, $2, $3, $4)`, [username, today, randomVibe.msg, randomVibe.color]);
        return { user_name: username, vibe_date: today, message: randomVibe.msg, color: randomVibe.color };
    }

    static async findByUser(username) {
        const result = await db.query('SELECT * FROM profiles WHERE "user" = $1', [username]);
        if (result.rows[0]) {
            return new Profile(result.rows[0]);
        }
        return new Profile({ user: username });
    }

    static async updateMood(username, newMood) {
        const result = await db.query('INSERT INTO profiles ("user", mood) VALUES ($1, $2) ON CONFLICT ("user") DO UPDATE SET mood = $2 RETURNING mood', [username, newMood]);
        return result.rows[0].mood;
    }
    
    static async updatePassword(username, newPassword) {
        await db.query('UPDATE profiles SET password = $1 WHERE "user" = $2', [newPassword, username]);
        return true;
    }

    static async updateAvatar(username, avatarUrl) {
         const result = await db.query('INSERT INTO profiles ("user", avatar_url) VALUES ($1, $2) ON CONFLICT ("user") DO UPDATE SET avatar_url = $2 RETURNING avatar_url', [username, avatarUrl]);
        return result.rows[0].avatar_url;
    }

    // 👇 NOVO: Atualizar Capa 👇
    static async updateCover(username, coverUrl) {
         const result = await db.query('INSERT INTO profiles ("user", cover_url) VALUES ($1, $2) ON CONFLICT ("user") DO UPDATE SET cover_url = $2 RETURNING cover_url', [username, coverUrl]);
        return result.rows[0].cover_url;
    }

    static async addRating(from, to, type) { await db.query(`INSERT INTO profile_ratings (from_user, to_user, rating_type) VALUES ($1, $2, $3) ON CONFLICT (from_user, to_user, rating_type) DO NOTHING`, [from, to, type]); return { success: true }; }
    static async removeRating(from, to, type) { await db.query(`DELETE FROM profile_ratings WHERE from_user = $1 AND to_user = $2 AND rating_type = $3`, [from, to, type]); return { success: true }; }
}

module.exports = Profile;