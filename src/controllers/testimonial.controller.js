// src/controllers/testimonial.controller.js
const Testimonial = require('../models/testimonial.class'); // MUDANÇA: Importa a Classe

// [GET] /api/testimonials/:username
const getTestimonialsForUser = async (req, res) => {
    try {
        const { username } = req.params;
        // Usa o método estático da classe
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
        if (!from_user || !to_user || !text) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }
        
        // 1. Cria o objeto na memória
        const testimonial = new Testimonial({ from_user, to_user, text });
        // 2. Diz-lhe para se salvar
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