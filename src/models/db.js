// src/models/db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupDatabase() {
  const client = await pool.connect();
  try {
    // --- 1. CRIAÇÃO DE TABELAS ---
    await client.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, channel TEXT NOT NULL, "user" TEXT NOT NULL, message TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS posts (id SERIAL PRIMARY KEY, "user" TEXT NOT NULL, text TEXT NOT NULL, likes INT DEFAULT 0, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS profiles ("user" TEXT PRIMARY KEY, bio TEXT, mood TEXT, avatar_url TEXT)`);
    await client.query(`CREATE TABLE IF NOT EXISTS testimonials (id SERIAL PRIMARY KEY, "from_user" TEXT NOT NULL, "to_user" TEXT NOT NULL, text TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS comments (id SERIAL PRIMARY KEY, post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, "user" TEXT NOT NULL, text TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS follows (id SERIAL PRIMARY KEY, follower_user TEXT NOT NULL, following_user TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW(), UNIQUE(follower_user, following_user))`);
    await client.query(`CREATE TABLE IF NOT EXISTS communities (id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT, emoji TEXT, members INT DEFAULT 0, timestamp TIMESTAMPTZ DEFAULT NOW(), owner_user TEXT)`);
    await client.query(`CREATE TABLE IF NOT EXISTS community_members (id SERIAL PRIMARY KEY, user_name TEXT NOT NULL, community_id INT NOT NULL REFERENCES communities(id) ON DELETE CASCADE, timestamp TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_name, community_id))`);
    await client.query(`CREATE TABLE IF NOT EXISTS community_posts (id SERIAL PRIMARY KEY, community_id INT NOT NULL REFERENCES communities(id) ON DELETE CASCADE, "user" TEXT NOT NULL, title TEXT NOT NULL, content TEXT, likes INT DEFAULT 0, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS channels (id SERIAL PRIMARY KEY, community_id INT NOT NULL REFERENCES communities(id) ON DELETE CASCADE, name TEXT NOT NULL, is_voice BOOLEAN DEFAULT FALSE, timestamp TIMESTAMPTZ DEFAULT NOW())`);

    // Tabela de Avaliações
    await client.query(`CREATE TABLE IF NOT EXISTS profile_ratings (
        id SERIAL PRIMARY KEY,
        from_user TEXT NOT NULL,
        to_user TEXT NOT NULL,
        rating_type TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(from_user, to_user, rating_type)
    )`);

    // Tabela de Vibe do Dia
    await client.query(`CREATE TABLE IF NOT EXISTS profile_vibes (
        user_name TEXT NOT NULL,
        vibe_date DATE NOT NULL,
        message TEXT NOT NULL,
        color TEXT NOT NULL,
        PRIMARY KEY (user_name, vibe_date)
    )`);

    // 👇 NOVA TABELA: Quem visitou seu perfil 👇
    // Usamos PRIMARY KEY composta para que um visitante só apareça uma vez na lista (atualizando a data)
    await client.query(`CREATE TABLE IF NOT EXISTS profile_visits (
        visitor_user TEXT NOT NULL,
        visited_user TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (visitor_user, visited_user)
    )`);
    
    console.log('Tabelas verificadas/criadas.');

    // --- 2. MIGRAÇÃO DA BD ---
    try { await client.query('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mood TEXT'); } catch (e) {}
    try { await client.query('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT'); } catch (e) {}
    try { await client.query('ALTER TABLE communities ADD COLUMN IF NOT EXISTS owner_user TEXT'); } catch (e) {}

    await seedDatabase(client);
    
  } catch (err) {
    console.error('Erro geral em setupDatabase:', err);
  } finally {
    client.release();
  }
}

async function seedDatabase(client) {
  try {
    const res = await client.query('SELECT 1 FROM communities LIMIT 1');
    if (res.rows.length === 0) {
      console.log('Populando o banco de dados com comunidades de teste...');
      
      const tech = await client.query(`INSERT INTO communities (name, description, emoji, members, owner_user) VALUES ('Tecnologia 💻', 'A comunidade oficial para falar de hardware, software e programação.', '💻', 1, 'Admin') RETURNING id`);
      const music = await client.query(`INSERT INTO communities (name, description, emoji, members, owner_user) VALUES ('Música 🎵', 'Do Rock ao Pop, partilhe as suas batidas favoritas.', '🎵', 1, 'Admin') RETURNING id`);
      const games = await client.query(`INSERT INTO communities (name, description, emoji, members, owner_user) VALUES ('Games 🎮', 'Discussão geral, do retro ao moderno. Encontre o seu "x1" aqui.', '🎮', 1, 'Admin') RETURNING id`);
      
      const techId = tech.rows[0].id;
      const musicId = music.rows[0].id;
      const gamesId = games.rows[0].id;

      await client.query(`INSERT INTO channels (community_id, name) VALUES ($1, 'geral'), ($1, 'programacao'), ($2, 'geral'), ($2, 'musica-pop'), ($3, 'geral'), ($3, 'retrogaming')`, [techId, musicId, gamesId]);
      await client.query(`INSERT INTO community_posts (community_id, "user", title, content) VALUES ($1, 'Admin', 'Bem-vindos ao fórum Tech!', 'O que estão a programar hoje?'), ($2, 'Admin', 'Qual é a vossa música do momento?', 'Eu estou a ouvir muito Rock dos anos 90.'), ($3, 'Admin', 'Torneio de SF3?', 'Vamos organizar um torneio de Street Fighter 3.')`, [techId, musicId, gamesId]);

      console.log('Comunidades, canais e posts de teste inseridos.');
    }
  } catch (err) {
    console.error('Erro ao popular dados:', err);
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  setupDatabase
};