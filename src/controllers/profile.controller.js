// src/controllers/profile.controller.js
const Profile = require('../models/profile.class');
const db = require('../models/db');

// ... (login, getProfileBio... continuam iguais) ...
const login = async (req, res) => {
    try {
        const { user, password } = req.body;
        if (!user || !password) return res.status(400).json({ error: 'Campos obrigatórios' });
        const result = await db.query('SELECT * FROM profiles WHERE "user" = $1', [user]);
        const existingUser = result.rows[0];
        if (existingUser) {
            if (!existingUser.password) {
                await db.query('UPDATE profiles SET password = $1 WHERE "user" = $2', [password, user]);
                return res.json({ success: true, message: 'Senha definida!' });
            } else {
                if (existingUser.password === password) return res.json({ success: true });
                else return res.status(401).json({ error: 'Senha incorreta.' });
            }
        } else {
            await db.query('INSERT INTO profiles ("user", password) VALUES ($1, $2)', [user, password]);
            return res.json({ success: true, message: 'Conta criada!' });
        }
    } catch (err) { res.status(500).json({ error: 'Erro login' }); }
};

const getProfileBio = async (req, res) => {
    try {
        const { username } = req.params;
        const { viewer } = req.query;
        const profile = await Profile.findByUser(username);
        if (viewer && viewer !== username) await profile.recordVisit(viewer);
        const ratings = await profile.getRatings(viewer); 
        const visitors = await profile.getRecentVisitors(); 
        res.json({ profile, ratings, visitors }); 
    } catch (err) { res.status(500).json({ error: 'Erro perfil' }); }
};

const updateProfileBio = async (req, res) => {
    try {
        const { user, bio } = req.body;
        if (!user) return res.status(400).json({ error: 'Erro.' });
        const profile = await Profile.findByUser(user);
        profile.bio = bio;
        await profile.save();
        res.status(200).json(profile);
    } catch (err) { res.status(500).json({ error: 'Erro bio' }); }
};

const updateUserMood = async (req, res) => {
    try {
        const { user, mood } = req.body;
        if (!user) return res.status(400).json({ error: 'Erro.' });
        const newMood = await Profile.updateMood(user, mood);
        res.status(200).json({ mood: newMood });
    } catch (err) { res.status(500).json({ error: 'Erro mood' }); }
};

const updateUserPassword = async (req, res) => {
    try {
        const { user, password } = req.body;
        if (!user || password.length < 4) return res.status(400).json({ error: 'Senha curta' });
        await Profile.updatePassword(user, password);
        res.status(200).json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Erro senha' }); }
};

const updateUserAvatar = async (req, res) => {
    try {
        const { file, body } = req; 
        if (!file || !body.user) return res.status(400).json({ error: 'Erro.' });
        // Base64 conversão
        const b64 = Buffer.from(file.buffer).toString('base64');
        const dataUrl = `data:${file.mimetype};base64,${b64}`;
        
        const newUrl = await Profile.updateAvatar(body.user, dataUrl);
        res.status(200).json({ avatar_url: newUrl });
    } catch (err) { res.status(500).json({ error: 'Erro avatar' }); }
};

// 👇 NOVA FUNÇÃO: CAPA (BANNER) 👇
const updateUserCover = async (req, res) => {
    try {
        const { file, body } = req; 
        if (!file || !body.user) return res.status(400).json({ error: 'Erro.' });
        
        const b64 = Buffer.from(file.buffer).toString('base64');
        const dataUrl = `data:${file.mimetype};base64,${b64}`;
        
        const newUrl = await Profile.updateCover(body.user, dataUrl);
        res.status(200).json({ cover_url: newUrl });
    } catch (err) { res.status(500).json({ error: 'Erro capa' }); }
};

// ... (ratings, follow, vibe continuam iguais) ...
const addProfileRating = async (req, res) => { try { await Profile.addRating(req.body.from_user, req.body.to_user, req.body.rating_type); if (req.io) req.io.emit('rating_update', { target_user: req.body.to_user }); res.status(201).json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } };
const removeProfileRating = async (req, res) => { try { await Profile.removeRating(req.body.from_user, req.body.to_user, req.body.rating_type); if (req.io) req.io.emit('rating_update', { target_user: req.body.to_user }); res.status(200).json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } };
const getDailyVibe = async (req, res) => { try { const v = await Profile.getDailyVibe(req.params.username); res.json({ vibe: v }); } catch (err) { res.status(500).json({ error: 'Erro' }); } };
const getFollowingList = async (req, res) => { try { const p = await Profile.findByUser(req.params.username); const l = await p.getFollowing(); res.json({ following: l }); } catch (err) { res.status(500).json({ error: 'Erro' }); } };
const getIsFollowing = async (req, res) => { try { const p = await Profile.findByUser(req.query.follower); const i = await p.isFollowing(req.params.username); res.json({ isFollowing: i }); } catch (err) { res.status(500).json({ error: 'Erro' }); } };
const addFollow = async (req, res) => { try { const p = await Profile.findByUser(req.body.follower); await p.follow(req.body.following); res.status(201).json({ success: true }); } catch (err) { res.status(500).json({ error: 'Erro' }); } };
const removeFollow = async (req, res) => { try { const p = await Profile.findByUser(req.body.follower); await p.unfollow(req.body.following); res.status(200).json({ success: true }); } catch (err) { res.status(500).json({ error: 'Erro' }); } };

module.exports = {
  login,
  getProfileBio,
  updateProfileBio,
  updateUserMood,
  updateUserPassword,
  updateUserAvatar,
  updateUserCover, // Exporta nova função
  addProfileRating,
  removeProfileRating,
  getDailyVibe,
  getFollowingList,
  getIsFollowing,
  addFollow,
  removeFollow
};