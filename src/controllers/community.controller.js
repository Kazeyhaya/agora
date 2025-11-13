// src/controllers/community.controller.js
const Community = require('../models/community.class'); // MUDANÇA: Importa a Classe

// [GET] /api/communities/joined
const getJoined = async (req, res) => {
    try {
        const { user_name } = req.query;
        if (!user_name) return res.status(400).json({ error: 'user_name é obrigatório' });
        
        const communities = await Community.findJoined(user_name);
        res.json({ communities });
    } catch (err) {
        console.error("Erro no controlador getJoined:", err);
        res.status(500).json({ error: 'Erro ao buscar comunidades' });
    }
};

// [GET] /api/communities/explore
const getExplore = async (req, res) => {
    try {
        const { user_name } = req.query;
        if (!user_name) return res.status(400).json({ error: 'user_name é obrigatório' });

        const communities = await Community.findExplore(user_name);
        res.json({ communities });
    } catch (err) {
        console.error("Erro no controlador getExplore:", err);
        res.status(500).json({ error: 'Erro ao explorar comunidades' });
    }
};

// [POST] /api/community/join
const join = async (req, res) => {
    try {
        const { user_name, community_id } = req.body;
        if (!user_name || !community_id) {
            return res.status(400).json({ error: 'user_name e community_id são obrigatórios' });
        }
        
        // 1. Encontra a comunidade
        const community = await Community.findById(community_id);
        if (!community) {
            return res.status(404).json({ error: 'Comunidade não encontrada' });
        }
        
        // 2. Diz-lhe para adicionar o membro
        await community.addMember(user_name);
        
        res.status(201).json({ community });
    } catch (err) {
        console.error("Erro no controlador join:", err);
        res.status(500).json({ error: 'Erro ao entrar na comunidade' });
    }
};

// [POST] /api/communities/create
const create = async (req, res) => {
    try {
        const { name, emoji, creator } = req.body;
        if (!name || !creator) {
            return res.status(400).json({ error: 'Nome e criador são obrigatórios' });
        }
        
        // 1. Cria o objeto
        const community = new Community({ name, emoji, members: 1 });
        // 2. Salva-o (para obter o ID)
        await community.save();
        // 3. Adiciona o criador como primeiro membro
        await community.addMember(creator);

        res.status(201).json({ community });
    } catch (err) {
        console.error("Erro no controlador create:", err);
        res.status(500).json({ error: 'Erro ao criar comunidade' });
    }
};

// [GET] /api/community/:id/posts
const getPosts = async (req, res) => {
    try {
        const { id } = req.params;
        
        const community = await Community.findById(id);
        if (!community) {
            return res.status(404).json({ error: 'Comunidade não encontrada' });
        }
        
        // Pede os posts à instância da comunidade
        const posts = await community.getPosts();
        
        res.json({ posts });
    } catch (err) {
        console.error("Erro no controlador getPosts:", err);
        res.status(500).json({ error: 'Erro ao buscar posts da comunidade' });
    }
};

module.exports = {
  getJoined,
  getExplore,
  join,
  create,
  getPosts
};