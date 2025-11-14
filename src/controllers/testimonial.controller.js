// src/controllers/testimonial.controller.js
const Testimonial = require('../models/testimonial.class');

// [GET] /api/testimonials/:username
const getTestimonialsForUser = async (req, res) => {
    try {
        const { username } = req.params;
        const testimonials = await Testimonial.findForUser(username);
        res.json({ testimonials });
    } catch (err) {
        console.error("Erro no controlador getTestimonialsForUser:", err);
        res.status(500).json({ error: 'Erro ao buscar depoimentos' });
    }
};

// [POST] /api/testimonials
const createNewTestimonial = async (req, res) => {
    try {
        const { from_user, to_user, text } = req.body;
        
        // --- VALIDAÇÃO ---
        if (!from_user || !to_user || !text) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }
        if (text.length > 500) {
            return res.status(400).json({ error: 'O depoimento não pode exceder 500 caracteres.' });
        }
        if (from_user === to_user) {
            return res.status(400).json({ error: 'Não pode escrever um depoimento para si mesmo.' });
        }
        // --- FIM DA VALIDAÇÃO ---

        const testimonial = new Testimonial({ from_user, to_user, text });
        await testimonial.save();
        
        res.status(201).json(testimonial);
    } catch (err) {
        console.error("Erro no controlador createNewTestimonial:", err);
        res.status(500).json({ error: 'Erro ao criar depoimento' });
    }
};

module.exports = {
  getTestimonialsForUser,
  createNewTestimonial
};