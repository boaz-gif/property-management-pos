jest.mock('../src/models/Conversation', () => ({
  findById: jest.fn(),
  isParticipant: jest.fn(),
  listParticipants: jest.fn()
}));

jest.mock('../src/models/Message', () => ({
  create: jest.fn(),
  listByConversationId: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../src/services/notificationService', () => ({
  create: jest.fn().mockResolvedValue(null)
}));

jest.mock('../src/services/PermissionService', () => ({
  ensurePropertyAccess: jest.fn().mockResolvedValue(true),
  ensureTenantAccess: jest.fn().mockResolvedValue(true)
}));

const ConversationService = require('../src/services/conversationService');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const PermissionService = require('../src/services/PermissionService');

describe('ConversationService entity boundary enforcement', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('denies access when user is not a participant', async () => {
    Conversation.findById.mockResolvedValue({ id: 'c1', entity_type: null, entity_id: null });
    Conversation.isParticipant.mockResolvedValue(false);

    await expect(
      ConversationService.ensureConversationAccess({ id: 1, role: 'admin' }, 'c1')
    ).rejects.toThrow('Access denied');
  });

  test('enforces entity access for property-scoped conversation', async () => {
    Conversation.findById.mockResolvedValue({ id: 'c1', entity_type: 'property', entity_id: 10 });
    Conversation.isParticipant.mockResolvedValue(true);

    await expect(
      ConversationService.ensureConversationAccess({ id: 1, role: 'admin', properties: [10] }, 'c1')
    ).resolves.toMatchObject({ id: 'c1' });

    expect(PermissionService.ensurePropertyAccess).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      10
    );
  });

  test('blocks message creation when entity access fails', async () => {
    Conversation.findById.mockResolvedValue({ id: 'c1', entity_type: 'property', entity_id: 999 });
    Conversation.isParticipant.mockResolvedValue(true);
    PermissionService.ensurePropertyAccess.mockRejectedValueOnce(new Error('Access denied'));

    await expect(
      ConversationService.createMessage({ id: 2, role: 'tenant', property_id: 1 }, 'c1', { content: 'hello' })
    ).rejects.toThrow('Access denied');

    expect(Message.create).not.toHaveBeenCalled();
  });
});

