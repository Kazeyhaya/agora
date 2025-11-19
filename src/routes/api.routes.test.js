// src/routes/api.routes.test.js
const request = require('supertest');

// --- MOCKS (DEVEM VIR ANTES DOS IMPORTS REAIS) ---
jest.mock('../models/db', () => ({
  setupDatabase: jest.fn().mockResolvedValue(true),
  query: jest.fn().mockImplementation((text, params) => {
    // Retorna um resultado seguro padrão para qualquer query
    return Promise.resolve({ rows: [], rowCount: 0 });
  }),
}));

jest.mock('socket.io', () => ({
  Server: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
  })),
}));

jest.mock('../socket/chat.handler', () => ({
  initializeSocket: jest.fn(),
}));

// --- IMPORTA O APP DEPOIS DOS MOCKS ---
const app = require('../server');

describe('Testes de Integração da API', () => {
  
  // Rota Pública
  it('GET /api/posts/explore - deve retornar 200 OK', async () => {
    const response = await request(app)
      .get('/api/posts/explore')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('posts');
  });

  // Teste de Validação (O que estava dando erro)
  it('POST /api/profile/mood - deve falhar (400) se o mood for gigante', async () => {
    const longMood = 'A'.repeat(50); // Cria uma string com 50 letras
    
    const response = await request(app)
      .post('/api/profile/mood')
      .send({ user: 'Alexandre', mood: longMood })
      .expect('Content-Type', /json/);

    // Se der 500, mostramos o erro no console para debug
    if (response.status === 500) {
        console.error("ERRO 500 DETECTADO:", response.body);
    }

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('30 caracteres');
  });

  // Teste de Perfil Inexistente
  it('GET /api/profile/Inexistente - deve retornar estrutura correta', async () => {
    const response = await request(app)
      .get('/api/profile/Inexistente')
      .expect(200);

    // Na nova estrutura, esperamos profile, ratings e visitors
    expect(response.body).toHaveProperty('profile');
    expect(response.body).toHaveProperty('ratings');
    expect(response.body).toHaveProperty('visitors');
  });

});