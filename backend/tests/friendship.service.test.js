const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizePair,
  buildPairQuery,
  createFriendshipPayload,
  BOT_PROFILES,
} = require('../dist/services/friendship.service');

test('normalizePair stores the same relationship in stable order', () => {
  assert.deepEqual(normalizePair('user-b', 'user-a'), {
    user1Id: 'user-a',
    user2Id: 'user-b',
  });
});

test('buildPairQuery matches normalizePair output', () => {
  assert.deepEqual(buildPairQuery('z-user', 'a-user'), {
    user1Id: 'a-user',
    user2Id: 'z-user',
  });
});

test('createFriendshipPayload returns the partner relative to the viewer', () => {
  const friendship = {
    _id: { toString: () => 'friendship-1' },
    user1Id: 'user-a',
    user2Id: 'user-b',
    status: 'accepted',
    initiatorId: 'user-a',
    acceptedAt: new Date('2026-03-22T00:00:00.000Z'),
    updatedAt: new Date('2026-03-22T01:00:00.000Z'),
    createdAt: new Date('2026-03-22T00:30:00.000Z'),
  };

  assert.deepEqual(createFriendshipPayload(friendship, 'user-a'), {
    id: 'friendship-1',
    friendshipId: 'friendship-1',
    partnerId: 'user-b',
    status: 'accepted',
    initiatorId: 'user-a',
    acceptedAt: new Date('2026-03-22T00:00:00.000Z'),
    updatedAt: new Date('2026-03-22T01:00:00.000Z'),
    createdAt: new Date('2026-03-22T00:30:00.000Z'),
  });
});

test('bot profiles expose the shape used by the inbox UI', () => {
  assert.deepEqual(BOT_PROFILES.bot_ama, {
    id: 'bot_ama',
    _id: 'bot_ama',
    name: 'Ama',
    displayName: 'Ama',
    avatarUrl: null,
    profileImageUrl: null,
    isBot: true,
  });
});
