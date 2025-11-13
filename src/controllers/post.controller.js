// src/controllers/post.controller.js

// MUDANÇA: Importamos a CLASSE em vez do ficheiro de modelo antigo
const Post = require('../models/post.class'); 

// [GET] /api/posts (Feed Pessoal)
const getFeed = async (req, res) => {
  const { user } = req.query;
  if (!user) {
    return res.status(400).json({ error: 'Utilizador não fornecido' });
  }
  try {
    // Usamos o método estático da classe
    const posts = await Post.getPersonalizedFeed(user);
    res.json({ posts });
  } catch (err) {
    console.error('Erro no controlador getFeed:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

// [GET] /api/posts/explore (Feed Global)
const getExplore = async (req, res) => {
  try {
    // Usamos o método estático da classe
    const posts = await Post.getGlobalFeed();
    res.json({ posts });
  } catch (err) {
    console.error('Erro no controlador getExplore:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

// [POST] /api/posts (Criar Post)
const createNewPost = async (req, res) => {
  const { user, text } = req.body;
  if (!user || !text) {
    return res.status(400).json({ error: 'Usuário e texto são obrigatórios' });
  }
  try {
    // 1. Cria um novo objeto "Post" na memória
    const post = new Post({ user: user, text: text });
    
    // 2. Diz ao objeto para se salvar a si mesmo
    await post.save(); 
    
    res.status(201).json(post); // Envia o objeto 'post' (agora com ID)
  } catch (err) {
    console.error('Erro no controlador createNewPost:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

// [POST] /api/posts/:id/like
const addLike = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Encontra o post e cria um objeto "vivo"
    const post = await Post.findById(id); 
    if (!post) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }
    
    // 2. Diz ao objeto para adicionar um like a si mesmo
    await post.addLike(); 
    
    res.status(200).json(post); // Envia o objeto atualizado
  } catch (err) {
    console.error('Erro no controlador addLike:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

// [POST] /api/posts/:id/unlike
const removeLike = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Encontra o post
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }
    
    // 2. Diz ao objeto para remover um like de si mesmo
    await post.removeLike();
    
    res.status(200).json(post); // Envia o objeto atualizado
  } catch (err) {
    console.error('Erro no controlador removeLike:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

// --- CONTROLADORES DE COMENTÁRIOS (Usando a Classe) ---

// [GET] /api/posts/:id/comments
const getPostComments = async (req, res) => {
    try {
        const { id } = req.params;
        // Usamos o método estático da classe Post
        const comments = await Post.getComments(id);
        res.json({ comments });
    } catch (err) {
        console.error('Erro no controlador getPostComments:', err);
        res.status(500).json({ error: 'Erro ao buscar comentários' });
    }
};

// [POST] /api/posts/:id/comments
const addPostComment = async (req, res) => {
    try {
        const { id } = req.params; // ID do Post
        const { user, text } = req.body;
        if (!user || !text) {
            return res.status(400).json({ error: 'Utilizador e texto são obrigatórios' });
        }
        
        // Verificamos se o Post existe (boa prática)
        const post = await Post.findById(id);
        if (!post) {
             return res.status(404).json({ error: 'Post não encontrado' });
        }
        
        // Usamos o método estático da classe Post
        const newComment = await Post.createComment(id, user, text);
        res.status(201).json(newComment);
    } catch (err) {
        console.error('Erro no controlador addPostComment:', err);
        res.status(500).json({ error: 'Erro ao criar comentário' });
    }
};


module.exports = {
  getFeed,
  getExplore,
  createNewPost,
  addLike,
  removeLike,
  getPostComments,
  addPostComment
};