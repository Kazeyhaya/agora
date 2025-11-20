// src/controllers/post.controller.js
const Post = require('../models/post.class'); 

const getFeed = async (req, res) => {
  const { user } = req.query;
  if (!user) return res.status(400).json({ error: 'Usuário obrigatório' });
  try {
    const posts = await Post.getPersonalizedFeed(user);
    res.json({ posts });
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
};

const getExplore = async (req, res) => {
  try {
    const posts = await Post.getGlobalFeed();
    res.json({ posts });
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
};

// 👇 CRIAR POST COM IMAGEM 👇
const createNewPost = async (req, res) => {
  const { user, text } = req.body;
  const file = req.file; // Arquivo vindo do multer
  
  if (!user || !text) return res.status(400).json({ error: 'Usuário e texto obrigatórios' });
  if (text.length > 500) return res.status(400).json({ error: 'Texto muito longo.' });

  try {
    let imageUrl = null;
    
    // Converte Buffer para Base64 (para salvar no banco direto)
    if (file) {
        const b64 = Buffer.from(file.buffer).toString('base64');
        imageUrl = `data:${file.mimetype};base64,${b64}`;
    }

    const post = new Post({ user, text, image_url: imageUrl });
    await post.save(); 
    res.status(201).json(post);
  } catch (err) {
    console.error('Erro ao criar post:', err);
    res.status(500).json({ error: 'Erro ao salvar post.' });
  }
};
// 👆 ----------------------- 👆

const addLike = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id); 
    if (!post) return res.status(404).json({ error: 'Post não encontrado' });
    await post.addLike(); 
    res.status(200).json(post);
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
};

const removeLike = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: 'Post não encontrado' });
    await post.removeLike();
    res.status(200).json(post);
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
};

const getPostComments = async (req, res) => {
    try {
        const { id } = req.params;
        const comments = await Post.getComments(id);
        res.json({ comments });
    } catch (err) { res.status(500).json({ error: 'Erro ao buscar comentários' }); }
};

const addPostComment = async (req, res) => {
    try {
        const { id } = req.params; 
        const { user, text } = req.body;
        if (!user || !text) return res.status(400).json({ error: 'Campos obrigatórios' });
        
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ error: 'Post não encontrado' });
        
        const newComment = await Post.createComment(id, user, text);
        res.status(201).json(newComment);
    } catch (err) { res.status(500).json({ error: 'Erro ao criar comentário' }); }
};

const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { user, text } = req.body; 
        if (!user || !text) return res.status(400).json({ error: 'Campos obrigatórios.' });
        
        const updatedPost = await Post.update(id, user, text);
        res.json(updatedPost);
    } catch (err) {
        if (err.message === 'Não autorizado') return res.status(403).json({ error: 'Sem permissão.' });
        res.status(500).json({ error: 'Erro ao atualizar' });
    }
};

module.exports = {
  getFeed, getExplore, createNewPost, addLike, removeLike, getPostComments, addPostComment, updatePost 
};