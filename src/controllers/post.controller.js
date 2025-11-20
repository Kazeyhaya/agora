// src/controllers/post.controller.js
const Post = require('../models/post.class'); 

const getFeed = async (req, res) => {
  const { user } = req.query;
  if (!user) return res.status(400).json({ error: 'Utilizador não fornecido' });
  try {
    const posts = await Post.getPersonalizedFeed(user);
    res.json({ posts });
  } catch (err) {
    console.error('Erro no controlador getFeed:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

const getExplore = async (req, res) => {
  try {
    const posts = await Post.getGlobalFeed();
    res.json({ posts });
  } catch (err) {
    console.error('Erro no controlador getExplore:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

// 👇 CONTROLADOR DE CRIAR POST (ATUALIZADO) 👇
const createNewPost = async (req, res) => {
  // O 'multer' processa o form-data e coloca os campos de texto em req.body
  // e o arquivo em req.file
  const { user, text } = req.body;
  const file = req.file;
  
  if (!user || !text) {
    return res.status(400).json({ error: 'Usuário e texto são obrigatórios' });
  }
  if (text.length > 500) {
     return res.status(400).json({ error: 'O post não pode exceder 500 caracteres.' });
  }

  try {
    const imageUrl = file ? file.path : null; // Pega a URL do Cloudinary se existir

    const post = new Post({ 
        user: user, 
        text: text,
        image_url: imageUrl 
    });
    
    await post.save(); 
    res.status(201).json(post);
  } catch (err) {
    console.error('Erro no controlador createNewPost:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};
// 👆 FIM DA ATUALIZAÇÃO 👆

const addLike = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id); 
    if (!post) return res.status(404).json({ error: 'Post não encontrado' });
    await post.addLike(); 
    res.status(200).json(post);
  } catch (err) {
    console.error('Erro no controlador addLike:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

const removeLike = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: 'Post não encontrado' });
    await post.removeLike();
    res.status(200).json(post);
  } catch (err) {
    console.error('Erro no controlador removeLike:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

const getPostComments = async (req, res) => {
    try {
        const { id } = req.params;
        const comments = await Post.getComments(id);
        res.json({ comments });
    } catch (err) {
        console.error('Erro no controlador getPostComments:', err);
        res.status(500).json({ error: 'Erro ao buscar comentários' });
    }
};

const addPostComment = async (req, res) => {
    try {
        const { id } = req.params; 
        const { user, text } = req.body;

        if (!user || !text) return res.status(400).json({ error: 'Utilizador e texto são obrigatórios' });
        if (text.length > 280) return res.status(400).json({ error: 'O comentário não pode exceder 280 caracteres.' });
        
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ error: 'Post não encontrado' });
        
        const newComment = await Post.createComment(id, user, text);
        res.status(201).json(newComment);
    } catch (err) {
        console.error('Erro no controlador addPostComment:', err);
        res.status(500).json({ error: 'Erro ao criar comentário' });
    }
};

const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { user, text } = req.body; 

        if (!user || !text) return res.status(400).json({ error: 'Utilizador e texto são obrigatórios.' });
        if (text.length > 500) return res.status(400).json({ error: 'O post não pode exceder 500 caracteres.' });

        const updatedPost = await Post.update(id, user, text);
        res.json(updatedPost);

    } catch (err) {
        console.error('Erro no controlador updatePost:', err);
        if (err.message === 'Não autorizado') return res.status(403).json({ error: 'Apenas o autor pode editar este post.' });
        if (err.message === 'Post não encontrado') return res.status(404).json({ error: 'Post não encontrado.' });
        res.status(500).json({ error: 'Erro ao atualizar o post' });
    }
};

module.exports = {
  getFeed,
  getExplore,
  createNewPost,
  addLike,
  removeLike,
  getPostComments,
  addPostComment,
  updatePost 
};