// src/routes/profile.routes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const upload = require('../config/storage'); 

router.post('/login', profileController.login);
router.post('/profile/password', profileController.updateUserPassword);

router.get('/profile/:username', profileController.getProfileBio);
router.post('/profile', profileController.updateProfileBio);
router.post('/profile/mood', profileController.updateUserMood);

// Uploads
router.post('/profile/avatar', upload.single('avatar'), profileController.updateUserAvatar);
// 👇 ROTA NOVA DE CAPA 👇
router.post('/profile/cover', upload.single('cover'), profileController.updateUserCover);

router.post('/profile/rate', profileController.addProfileRating);
router.post('/profile/unrate', profileController.removeProfileRating);
router.get('/profile/:username/vibe', profileController.getDailyVibe);

router.get('/following/:username', profileController.getFollowingList);
router.get('/isfollowing/:username', profileController.getIsFollowing);
router.post('/follow', profileController.addFollow);
router.post('/unfollow', profileController.removeFollow);

module.exports = router;