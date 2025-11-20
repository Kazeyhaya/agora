// src/config/storage.js
const multer = require('multer');

// Armazena na memória RAM temporariamente
const storage = multer.memoryStorage();

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Limite de 5MB
    }
});

module.exports = upload;