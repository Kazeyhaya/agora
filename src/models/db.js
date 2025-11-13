// src/models/db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Função para criar E MIGRAR tabelas
async function setupDatabase() {
  const client = await pool.connect();
  try {
    // --- 1. CRIAÇÃO DE TABELAS (para novas BDs) ---
    await client.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, channel TEXT NOT NULL, "user" TEXT NOT NULL, message TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS posts (id SERIAL PRIMARY KEY, "user" TEXT NOT NULL, text TEXT NOT NULL, likes INT DEFAULT 0, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS profiles ("user" TEXT PRIMARY KEY, bio TEXT)`); // Começa sem o 'mood'
    await client.query(`CREATE TABLE IF NOT EXISTS testimonials (id SERIAL PRIMARY KEY, "from_user" TEXT NOT NULL, "to_user" TEXT NOT NULL, text TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS comments (id SERIAL PRIMARY KEY, post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, "user" TEXT NOT NULL, text TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS follows (id SERIAL PRIMARY KEY, follower_user TEXT NOT NULL, following_user TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW(), UNIQUE(follower_user, following_user))`);
    await client.query(`CREATE TABLE IF NOT EXISTS communities (id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT, emoji TEXT, members INT DEFAULT 0, timestamp TIMESTAMVITZ DEFAULT NOW())`); // Corrigido TIMESTAMVITZ
    await client.query(`CREATE TABLE IF NOT EXISTS community_members (id SERIAL PRIMARY KEY, user_name TEXT NOT NULL, community_id INT NOT NULL REFERENCES communities(id) ON DELETE CASCADE, timestamp TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_name, community_id))`);
    await client.query(`CREATE TABLE IF NOT EXISTS community_posts (id SERIAL PRIMARY KEY, community_id INT NOT NULL REFERENCES communities(id) ON DELETE CASCADE, "user" TEXT NOT NULL, title TEXT NOT NULL, content TEXT, likes INT DEFAULT 0, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS channels (id SERIAL PRIMARY KEY, community_id INT NOT NULL REFERENCES communities(id) ON DELETE CASCADE, name TEXT NOT NULL, is_voice BOOLEAN DEFAULT FALSE, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    
    console.log('Tabelas verificadas/criadas.');

    // --- 2. MIGRAÇÃO DA BD (para BDs existentes) ---
    // Esta secção corrige a tua BD no Render
    try {
        // Tenta adicionar a coluna 'mood' se ela não existir
        await client.query('ALTER TABLE profiles ADD COLUMN mood TEXT');
        console.log('MIGRAÇÃO DA BD: Coluna "mood" adicionada a "profiles".');
    } catch (e) {
        // Se o erro for "column ... already exists" (código '42701'),
        // isso é normal e significa que a migração já correu.
        if (e.code === '42701') {
            console.log('Coluna "mood" já existe em "profiles" (MIGRAÇÃO OK).');
        } else {
            // Se for outro erro, regista-o
            console.error('Erro na migração da coluna "mood":', e.message);
        }
    }
    // --- FIM DA MIGRAÇÃO ---

    await seedDatabase(client); // Chama a função de popular
    
  } catch (err) {
    console.error('Erro geral em setupDatabase:', err);
  } finally {
    client.release();
  }
}

// (O resto do teu ficheiro db.js, incluindo seedDatabase, fica igual)
async function seedDatabase(client) {
  try {
    const res = await client.query('SELECT 1 FROM communities LIMIT 1');
    if (res.rows.length === 0) {
      console.log('Populando o banco de dados com comunidades de teste...');
      // (Toda a tua lógica de 'seedDatabase' vem para aqui)
      const tech = await client.query(`INSERT INTO communities (name, description, emoji, members) VALUES ('Tecnologia 💻', 'A comunidade oficial para falar de hardware, software e programação.', '💻', 1) RETURNING id`);
      const music = await client.query(`INSERT INTO communities (name, description, emoji, members) VALUES ('Música 🎵', 'Do Rock ao Pop, partilhe as suas batidas favoritas.', '🎵', 1) RETURNING id`);
      const games = await client.query(`INSERT INTO communities (name, description, emoji, members) VALUES ('Games 🎮', 'Discussão geral, do retro ao moderno. Encontre o seu "x1" aqui.', '🎮', 1) RETURNING id`);
      
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

// Exportamos o 'pool' para que os 'Modelos' o possam usar, e o 'setupDatabase' para o server.js
module.exports = {
  query: (text, params) => pool.query(text, params),
  setupDatabase
};