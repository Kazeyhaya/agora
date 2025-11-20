// src/routes/post.routes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');
const upload = require('../config/storage'); // Importa o configurador de upload

// Rota para o Feed Pessoal
router.get('/', postController.getFeed);

// Rota para o Feed Explorar
router.get('/explore', postController.getExplore);

// 👇 ROTA DE CRIAR POST (AGORA COM UPLOAD) 👇
router.post('/', upload.single('image'), postController.createNewPost);

// Rota de Atualização (Editar Texto)
router.post('/:id/update', postController.updatePost);

// Rotas de Like
router.post('/:id/like', postController.addLike);
router.post('/:id/unlike', postController.removeLike);

// Rotas de Comentários
router.get('/:id/comments', postController.getPostComments);
router.post('/:id/comments', postController.addPostComment);

module.exports = router;