const User = require('../../src/models/User');
const Database = require('../../src/utils/database');
const bcrypt = require('bcryptjs');

// Mock dependencies
jest.mock('../../src/utils/database');
jest.mock('bcryptjs');

describe('User Model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should return a user when found', async () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
      Database.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await User.findByEmail('test@example.com');

      expect(Database.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
        ['test@example.com']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return undefined when not found', async () => {
      Database.query.mockResolvedValueOnce({ rows: [] });

      const result = await User.findByEmail('nonexistent@example.com');

      expect(result).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should hash password and create user', async () => {
      const userData = {
        name: 'New User',
        email: 'new@example.com',
        password: 'plainpassword',
        role: 'tenant',
        property_id: 1,
        unit: '101'
      };
      
      const hashedPassword = 'hashed_password';
      bcrypt.hash.mockResolvedValue(hashedPassword);
      
      const mockCreatedUser = { ...userData, id: 1, password: hashedPassword };
      Database.query.mockResolvedValueOnce({ rows: [mockCreatedUser] });

      const result = await User.create(userData);

      expect(bcrypt.hash).toHaveBeenCalledWith('plainpassword', 10);
      expect(Database.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['New User', 'new@example.com', hashedPassword, 'tenant', undefined, 1, '101', 'active'])
      );
      expect(result).toEqual(mockCreatedUser);
    });
  });
});
