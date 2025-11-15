// src/routes/community.routes.js
const express = require('express');
const communityController = require('../controllers/community.controller');

// Router 1: Para rotas que começam com /api/communities (plural)
const communitiesRouter = express.Router();

// [GET] /api/communities/joined
communitiesRouter.get('/joined', communityController.getJoined);

// [GET] /api/communities/explore
communitiesRouter.get('/explore', communityController.getExplore);

// [POST] /api/communities/create
communitiesRouter.post('/create', communityController.create);


// Router 2: Para rotas que começam com /api/community (singular)
const communityRouter = express.Router();

// [POST] /api/community/join
communityRouter.post('/join', communityController.join);

// [GET] /api/community/:id/posts
communityRouter.get('/:id/posts', communityController.getPosts);

// 👇 NOVA ROTA ADICIONADA 👇
// [GET] /api/community/:id/members
communityRouter.get('/:id/members', communityController.getMembers);


// Exportamos os dois routers
module.exports = {
  communitiesRouter,
  communityRouter
};