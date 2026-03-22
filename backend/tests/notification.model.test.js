const test = require('node:test');
const assert = require('node:assert/strict');

const Notification = require('../dist/models/Notification').default;

test('notification model supports all user-facing notification types', () => {
  const enumValues = Notification.schema.path('type').options.enum;
  assert.deepEqual(enumValues, ['friend_request', 'friend_accepted', 'match', 'message']);
});

test('notification model stores arbitrary data payloads for navigation context', () => {
  const dataPath = Notification.schema.path('data');
  assert.ok(dataPath, 'expected mixed data path to exist on notification schema');
});
