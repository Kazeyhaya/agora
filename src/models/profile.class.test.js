// src/models/profile.class.test.js
const Profile = require('./profile.class');
const db = require('./db');

// Mock do Banco de Dados para este teste unitário
jest.mock('./db', () => ({
  query: jest.fn()
}));

describe('Profile Class Unit Tests', () => {
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('addRating deve rejeitar tipos de avaliação inválidos', async () => {
    // Tenta adicionar um voto do tipo "batata" (que não existe)
    await expect(Profile.addRating('user1', 'user2', 'batata'))
      .rejects
      .toThrow('Tipo de avaliação inválido');
  });

  test('addRating deve aceitar tipos válidos (ex: toxico)', async () => {
    // Simula sucesso no banco
    db.query.mockResolvedValue({ rows: [] });
    
    const result = await Profile.addRating('user1', 'user2', 'toxico');
    expect(result).toEqual({ success: true });
    expect(db.query).toHaveBeenCalled();
  });

});