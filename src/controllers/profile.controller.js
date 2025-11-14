// src/controllers/profile.controller.js
const Profile = require('../models/profile.class');

// [GET] /api/profile/:username
const getProfileBio = async (req, res) => {
    try {
        const { username } = req.params;
        const profile = await Profile.findByUser(username);
        res.json(profile); 
    } catch (err) {
        console.error("Erro no controlador getProfileBio:", err);
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
};

// [POST] /api/profile
const updateProfileBio = async (req, res) => {
    try {
        const { user, bio } = req.body;
        
        // --- VALIDAÇÃO ---
        if (!user || bio === undefined) {
            return res.status(400).json({ error: 'Utilizador e bio são obrigatórios' });
        }
        if (bio.length > 150) {
            return res.status(400).json({ error: 'A bio não pode exceder 150 caracteres.' });
        }
        // --- FIM DA VALIDAÇÃO ---

        const profile = await Profile.findByUser(user);
        profile.bio = bio;
        await profile.save();
        
        res.status(200).json(profile);
    } catch (err) {
        console.error("Erro no controlador updateProfileBio:", err);
        res.status(500).json({ error: 'Erro ao atualizar bio' });
    }
};

// [POST] /api/profile/mood
const updateUserMood = async (req, res) => {
    try {
        const { user, mood } = req.body;
        
        // --- VALIDAÇÃO ---
        if (!user || mood === undefined) {
            return res.status(400).json({ error: 'Utilizador e mood são obrigatórios' });
        }
        if (mood.length > 30) {
             return res.status(400).json({ error: 'O mood não pode exceder 30 caracteres.' });
        }
        // --- FIM DA VALIDAÇÃO ---

        const newMood = await Profile.updateMood(user, mood);
        res.status(200).json({ mood: newMood });
    } catch (err) {
        console.error("Erro no controlador updateUserMood:", err);
        res.status(500).json({ error: 'Erro ao atualizar mood' });
    }
};

// [POST] /api/profile/avatar
const updateUserAvatar = async (req, res) => {
    try {
        const { file, body } = req; 
        
        if (!file) {
            return res.status(400).json({ error: 'Nenhum ficheiro enviado.' });
        }
        if (!body.user) {
            return res.status(400).json({ error: 'Utilizador não especificado.' });
        }

        const newAvatarUrl = await Profile.updateAvatar(body.user, file.path);
        
        res.status(200).json({ avatar_url: newAvatarUrl });

    } catch (err) {
        console.error("Erro no controlador updateUserAvatar:", err);
        res.status(500).json({ error: 'Erro ao guardar o avatar.' });
    }
};

// [GET] /api/following/:username
const getFollowingList = async (req, res) => {
    try {
        const { username } = req.params;
        const profile = await Profile.findByUser(username);
        const followingList = await profile.getFollowing();
        res.json({ following: followingList });
    } catch (err) {
        console.error("Erro no controlador getFollowingList:", err);
        res.status(500).json({ error: 'Erro ao buscar amigos' });
    }
};

// [GET] /api/isfollowing/:username
const getIsFollowing = async (req, res) => {
    try {
        const { username: userToCheck } = req.params;
        const { follower: currentUsername } = req.query;
        if (!currentUsername) {
            return res.status(400).json({ error: "Follower não especificado" });
        }
        const profile = await Profile.findByUser(currentUsername);
        const isFollowing = await profile.isFollowing(userToCheck);
        res.json({ isFollowing });
    } catch (err) {
        console.error("Erro no controlador getIsFollowing:", err);
        res.status(500).json({ error: 'Erro ao verificar' });
    }
};

// [POST] /api/follow
const addFollow = async (req, res) => {
    try {
        const { follower, following } = req.body;
        if (!follower || !following) {
            return res.status(400).json({ error: 'Follower e Following são obrigatórios' });
        }
        const profile = await Profile.findByUser(follower);
        await profile.follow(following);
        res.status(201).json({ success: true });
    } catch (err) {
        console.error("Erro no controlador addFollow:", err);
        res.status(500).json({ error: 'Erro ao seguir' });
    }
};

// [POST] /api/unfollow
const removeFollow = async (req, res) => {
    try {
        const { follower, following } = req.body;
        if (!follower || !following) {
            return res.status(400).json({ error: 'Follower e Following são obrigatórios' });
        }
        const profile = await Profile.findByUser(follower);
        await profile.unfollow(following);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Erro no controlador removeFollow:", err);
        res.status(500).json({ error: 'Erro ao deixar de seguir' });
    }
};

module.exports = {
  getProfileBio,
  updateProfileBio,
  updateUserMood,
  updateUserAvatar,
  getFollowingList,
  getIsFollowing,
  addFollow,
  removeFollow
};