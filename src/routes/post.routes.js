// src/routes/post.routes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');
const upload = require('../config/storage'); 

// Feed Pessoal
router.get('/', postController.getFeed);

// Feed Explorar
router.get('/explore', postController.getExplore);

// 👇 AQUI: Rota com Upload de Imagem 👇
router.post('/', upload.single('image'), postController.createNewPost);

// Atualização (Editar)
router.post('/:id/update', postController.updatePost);

// Likes
router.post('/:id/like', postController.addLike);
router.post('/:id/unlike', postController.removeLike);

// Comentários
router.get('/:id/comments', postController.getPostComments);
router.post('/:id/comments', postController.addPostComment);

module.exports = router;