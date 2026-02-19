const Property = require('../../src/models/Property');
const Database = require('../../src/utils/database');

// Mock dependencies
jest.mock('../../src/utils/database');

describe('Property Model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all properties', async () => {
      const mockUser = { role: 'admin', id: 1 };
      const mockProperties = [{ id: 1, name: 'Prop 1' }, { id: 2, name: 'Prop 2' }];
      Database.query.mockResolvedValueOnce({ rows: mockProperties });

      const result = await Property.findAll(mockUser);

      expect(Database.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM mv_property_aggregations'),
        expect.any(Array)
      );
      expect(result).toEqual(mockProperties);
    });
  });

  describe('findById', () => {
    it('should return property by id', async () => {
      const mockUser = { role: 'admin', id: 1 };
      const mockProperty = { id: 1, name: 'Prop 1' };
      Database.query.mockResolvedValueOnce({ rows: [mockProperty] });

      const result = await Property.findById(1, mockUser);

      expect(Database.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT p.*'),
        [1, 'admin', 1, [], null]
      );
      expect(result).toEqual(mockProperty);
    });
  });

  describe('create', () => {
    it('should create a property', async () => {
      const propertyData = {
        name: 'New Prop',
        address: '123 St',
        units: 10,
        rent: 1000,
        description: 'Desc',
        amenities: ['Wifi'],
        admin_id: 1
      };
      
      const mockCreated = { id: 1, ...propertyData };
      Database.query.mockResolvedValueOnce({ rows: [mockCreated] });

      const result = await Property.create(propertyData);

      expect(Database.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO properties'),
        expect.arrayContaining(['New Prop', '123 St', 10, 1000, 'active', 1])
      );
      expect(result).toEqual(mockCreated);
    });
  });
});
