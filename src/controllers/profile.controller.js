// src/controllers/profile.controller.js
const Profile = require('../models/profile.class'); // MUDANÇA: Importa a Classe

// [GET] /api/profile/:username
const getProfileBio = async (req, res) => {
    try {
        const { username } = req.params;
        const profile = await Profile.findByUser(username); // Encontra o perfil
        res.json({ bio: profile.bio }); // Retorna a bio dele
    } catch (err) {
        console.error("Erro no controlador getProfileBio:", err);
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
};

// [POST] /api/profile
const updateProfileBio = async (req, res) => {
    try {
        const { user, bio } = req.body;
        if (!user || bio === undefined) {
            return res.status(400).json({ error: 'Utilizador e bio são obrigatórios' });
        }
        
        const profile = await Profile.findByUser(user); // 1. Encontra
        profile.bio = bio; // 2. Modifica o objeto
        await profile.save(); // 3. Diz-lhe para se salvar
        
        res.status(200).json(profile);
    } catch (err) {
        console.error("Erro no controlador updateProfileBio:", err);
        res.status(500).json({ error: 'Erro ao atualizar bio' });
    }
};

// [GET] /api/following/:username
const getFollowingList = async (req, res) => {
    try {
        const { username } = req.params;
        const profile = await Profile.findByUser(username); // 1. Encontra
        const followingList = await profile.getFollowing(); // 2. Pede-lhe a lista
        
        res.json({ following: followingList });
    } catch (err) {
        console.error("Erro no controlador getFollowingList:", err);
        res.status(500).json({ error: 'Erro ao buscar amigos' });
    }
};

// [GET] /api/isfollowing/:username
const getIsFollowing = async (req, res) => {
    try {
        const { username: userToCheck } = req.params; // Quem o utilizador está a ver
        const { follower: currentUsername } = req.query; // O utilizador atual
        
        if (!currentUsername) {
            return res.status(400).json({ error: "Follower não especificado" });
        }

        const profile = await Profile.findByUser(currentUsername); // 1. Encontra o perfil do utilizador ATUAL
        const isFollowing = await profile.isFollowing(userToCheck); // 2. Pergunta-lhe se ele segue o outro
        
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
        
        const profile = await Profile.findByUser(follower); // 1. Encontra o perfil
        await profile.follow(following); // 2. Diz-lhe para seguir
        
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
        
        const profile = await Profile.findByUser(follower); // 1. Encontra o perfil
        await profile.unfollow(following); // 2. Diz-lhe para deixar de seguir
        
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Erro no controlador removeFollow:", err);
        res.status(500).json({ error: 'Erro ao deixar de seguir' });
    }
};

module.exports = {
  getProfileBio,
  updateProfileBio,
  getFollowingList,
  getIsFollowing,
  addFollow,
  removeFollow
};