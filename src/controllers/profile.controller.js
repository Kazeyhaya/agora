// src/controllers/profile.controller.js
const Profile = require('../models/profile.class');
const db = require('../models/db');

const login = async (req, res) => {
    try {
        const { user, password } = req.body;
        if (!user || !password) return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });

        const result = await db.query('SELECT * FROM profiles WHERE "user" = $1', [user]);
        const existingUser = result.rows[0];

        if (existingUser) {
            if (!existingUser.password) {
                await db.query('UPDATE profiles SET password = $1 WHERE "user" = $2', [password, user]);
                return res.json({ success: true, message: 'Senha definida! Bem-vindo de volta.' });
            } else {
                if (existingUser.password === password) {
                    return res.json({ success: true, message: 'Login realizado!' });
                } else {
                    return res.status(401).json({ error: 'Senha incorreta.' });
                }
            }
        } else {
            await db.query('INSERT INTO profiles ("user", password, bio, mood) VALUES ($1, $2, $3, $4)', 
                [user, password, 'Olá, estou no Agora!', '✨ novo']);
            return res.json({ success: true, message: 'Conta criada com sucesso!' });
        }
    } catch (err) {
        console.error("Erro no login:", err);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// 👇 NOVA FUNÇÃO: ATUALIZAR SENHA 👇
const updateUserPassword = async (req, res) => {
    try {
        const { user, password } = req.body;
        
        if (!user || !password) {
            return res.status(400).json({ error: 'Senha inválida.' });
        }
        
        if (password.length < 4) {
             return res.status(400).json({ error: 'A senha deve ter pelo menos 4 caracteres.' });
        }

        await Profile.updatePassword(user, password);
        res.status(200).json({ success: true, message: 'Senha alterada com sucesso!' });

    } catch (err) {
        console.error("Erro no controlador updateUserPassword:", err);
        res.status(500).json({ error: 'Erro ao atualizar senha.' });
    }
};
// 👆 FIM NOVA FUNÇÃO 👆

const getProfileBio = async (req, res) => {
    try {
        const { username } = req.params;
        const { viewer } = req.query;
        const profile = await Profile.findByUser(username);
        if (viewer && viewer !== username) await profile.recordVisit(viewer);
        const ratings = await profile.getRatings(viewer); 
        const visitors = await profile.getRecentVisitors(); 
        res.json({ profile, ratings, visitors }); 
    } catch (err) { res.status(500).json({ error: 'Erro ao buscar perfil' }); }
};

const updateProfileBio = async (req, res) => {
    try {
        const { user, bio } = req.body;
        if (!user || bio === undefined) return res.status(400).json({ error: 'Utilizador e bio são obrigatórios' });
        if (bio.length > 150) return res.status(400).json({ error: 'A bio não pode exceder 150 caracteres.' });
        const profile = await Profile.findByUser(user);
        profile.bio = bio;
        await profile.save();
        res.status(200).json(profile);
    } catch (err) { res.status(500).json({ error: 'Erro.' }); }
};

const updateUserMood = async (req, res) => {
    try {
        const { user, mood } = req.body;
        if (!user || mood === undefined) return res.status(400).json({ error: 'Utilizador e mood são obrigatórios' });
        if (mood.length > 30) return res.status(400).json({ error: 'O mood não pode exceder 30 caracteres.' });
        const newMood = await Profile.updateMood(user, mood);
        res.status(200).json({ mood: newMood });
    } catch (err) { res.status(500).json({ error: 'Erro.' }); }
};

const updateUserAvatar = async (req, res) => {
    try {
        const { file, body } = req; 
        if (!file || !body.user) return res.status(400).json({ error: 'Erro.' });
        const newAvatarUrl = await Profile.updateAvatar(body.user, file.path);
        res.status(200).json({ avatar_url: newAvatarUrl });
    } catch (err) { res.status(500).json({ error: 'Erro.' }); }
};

const addProfileRating = async (req, res) => {
    try {
        const { from_user, to_user, rating_type } = req.body;
        if (!from_user || !to_user || !rating_type) return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
        if (from_user === to_user) return res.status(400).json({ error: 'Não pode avaliar a si mesmo.' });
        await Profile.addRating(from_user, to_user, rating_type);
        if (req.io) req.io.emit('rating_update', { target_user: to_user });
        res.status(201).json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const removeProfileRating = async (req, res) => {
    try {
        const { from_user, to_user, rating_type } = req.body;
        if (!from_user || !to_user || !rating_type) return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
        await Profile.removeRating(from_user, to_user, rating_type);
        if (req.io) req.io.emit('rating_update', { target_user: to_user });
        res.status(200).json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getDailyVibe = async (req, res) => {
    try {
        const { username } = req.params;
        const vibe = await Profile.getDailyVibe(username);
        res.json({ vibe });
    } catch (err) { res.status(500).json({ error: 'Erro.' }); }
};

const getFollowingList = async (req, res) => {
    try {
        const { username } = req.params;
        const profile = await Profile.findByUser(username);
        const followingList = await profile.getFollowing();
        res.json({ following: followingList });
    } catch (err) { res.status(500).json({ error: 'Erro.' }); }
};

const getIsFollowing = async (req, res) => {
    try {
        const { username: userToCheck } = req.params;
        const { follower: currentUsername } = req.query;
        const profile = await Profile.findByUser(currentUsername);
        const isFollowing = await profile.isFollowing(userToCheck);
        res.json({ isFollowing });
    } catch (err) { res.status(500).json({ error: 'Erro.' }); }
};

const addFollow = async (req, res) => {
    try {
        const { follower, following } = req.body;
        const profile = await Profile.findByUser(follower);
        await profile.follow(following);
        res.status(201).json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Erro.' }); }
};

const removeFollow = async (req, res) => {
    try {
        const { follower, following } = req.body;
        const profile = await Profile.findByUser(follower);
        await profile.unfollow(following);
        res.status(200).json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Erro.' }); }
};

module.exports = {
  login,
  updateUserPassword, // <-- Exporta a nova função
  getProfileBio,
  updateProfileBio,
  updateUserMood,
  updateUserAvatar,
  addProfileRating,
  removeProfileRating,
  getDailyVibe,
  getFollowingList,
  getIsFollowing,
  addFollow,
  removeFollow
};