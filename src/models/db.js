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
    // --- TABELAS ---
    await client.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, channel TEXT NOT NULL, "user" TEXT NOT NULL, message TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS posts (id SERIAL PRIMARY KEY, "user" TEXT NOT NULL, text TEXT NOT NULL, image_url TEXT, likes INT DEFAULT 0, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS profiles ("user" TEXT PRIMARY KEY, bio TEXT, mood TEXT, avatar_url TEXT, password TEXT)`);
    await client.query(`CREATE TABLE IF NOT EXISTS testimonials (id SERIAL PRIMARY KEY, "from_user" TEXT NOT NULL, "to_user" TEXT NOT NULL, text TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS comments (id SERIAL PRIMARY KEY, post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, "user" TEXT NOT NULL, text TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS follows (id SERIAL PRIMARY KEY, follower_user TEXT NOT NULL, following_user TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW(), UNIQUE(follower_user, following_user))`);
    await client.query(`CREATE TABLE IF NOT EXISTS communities (id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT, emoji TEXT, members INT DEFAULT 0, timestamp TIMESTAMPTZ DEFAULT NOW(), owner_user TEXT)`);
    await client.query(`CREATE TABLE IF NOT EXISTS community_members (id SERIAL PRIMARY KEY, user_name TEXT NOT NULL, community_id INT NOT NULL REFERENCES communities(id) ON DELETE CASCADE, timestamp TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_name, community_id))`);
    await client.query(`CREATE TABLE IF NOT EXISTS community_posts (id SERIAL PRIMARY KEY, community_id INT NOT NULL REFERENCES communities(id) ON DELETE CASCADE, "user" TEXT NOT NULL, title TEXT NOT NULL, content TEXT, likes INT DEFAULT 0, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS channels (id SERIAL PRIMARY KEY, community_id INT NOT NULL REFERENCES communities(id) ON DELETE CASCADE, name TEXT NOT NULL, is_voice BOOLEAN DEFAULT FALSE, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS profile_ratings (id SERIAL PRIMARY KEY, from_user TEXT NOT NULL, to_user TEXT NOT NULL, rating_type TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW(), UNIQUE(from_user, to_user, rating_type))`);
    await client.query(`CREATE TABLE IF NOT EXISTS profile_vibes (user_name TEXT NOT NULL, vibe_date DATE NOT NULL, message TEXT NOT NULL, color TEXT NOT NULL, PRIMARY KEY (user_name, vibe_date))`);
    await client.query(`CREATE TABLE IF NOT EXISTS profile_visits (visitor_user TEXT NOT NULL, visited_user TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY (visitor_user, visited_user))`);
    
    console.log('Tabelas verificadas.');

    // --- MIGRAÇÕES ---
    const migrations = [
        'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mood TEXT',
        'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT',
        'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT',
        'ALTER TABLE communities ADD COLUMN IF NOT EXISTS owner_user TEXT',
        'ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url TEXT' // <-- NOVO
    ];

    for (let query of migrations) {
        try { await client.query(query); } catch (e) { /* Ignora erro se coluna já existir */ }
    }

    await seedDatabase(client);
    
  } catch (err) {
    console.error('Erro no DB:', err);
  } finally {
    client.release();
  }
}

async function seedDatabase(client) {
  try {
    const res = await client.query('SELECT 1 FROM communities LIMIT 1');
    if (res.rows.length === 0) {
      console.log('Populando dados iniciais...');
      const tech = await client.query(`INSERT INTO communities (name, description, emoji, members, owner_user) VALUES ('Tecnologia 💻', 'Hardware e Dev.', '💻', 1, 'Admin') RETURNING id`);
      const music = await client.query(`INSERT INTO communities (name, description, emoji, members, owner_user) VALUES ('Música 🎵', 'Batidas favoritas.', '🎵', 1, 'Admin') RETURNING id`);
      const tId = tech.rows[0].id, mId = music.rows[0].id;
      await client.query(`INSERT INTO channels (community_id, name) VALUES ($1, 'geral'), ($2, 'geral')`, [tId, mId]);
    }
  } catch (err) { console.error('Erro seed:', err); }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  setupDatabase
};