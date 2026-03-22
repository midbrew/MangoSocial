const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateMatchScore, findBestMatch } = require('../dist/services/matching.service');

function createUser({
  gender = 'Female',
  genderPreference = ['Male'],
  interests = [],
  starSign,
  useStarSignMatching = false,
} = {}) {
  return {
    profile: {
      gender,
      starSign,
    },
    matchingPreferences: {
      genderPreference,
      useStarSignMatching,
    },
    interests: interests.map((value) => ({ value })),
  };
}

test('calculateMatchScore returns 0 for incompatible gender preferences', () => {
  const userA = createUser({ gender: 'Female', genderPreference: ['Male'], interests: ['Music'] });
  const userB = createUser({ gender: 'Female', genderPreference: ['Female'], interests: ['Music'] });

  assert.equal(calculateMatchScore(userA, userB), 0);
});

test('calculateMatchScore rewards shared interests and compatible star signs', () => {
  const userA = createUser({
    gender: 'Female',
    genderPreference: ['Male'],
    interests: ['Music', 'Travel', 'Art'],
    starSign: 'Aries',
    useStarSignMatching: true,
  });
  const userB = createUser({
    gender: 'Male',
    genderPreference: ['Female'],
    interests: ['Music', 'Art', 'Sports'],
    starSign: 'Leo',
    useStarSignMatching: true,
  });

  assert.equal(calculateMatchScore(userA, userB), 10);
});

test('findBestMatch returns the highest scoring compatible user in queue', () => {
  const newUser = createUser({
    gender: 'Female',
    genderPreference: ['Male'],
    interests: ['Music', 'Travel'],
    starSign: 'Sagittarius',
    useStarSignMatching: true,
  });

  const waitingQueue = [
    {
      socketId: 'socket-a',
      user: createUser({
        gender: 'Male',
        genderPreference: ['Female'],
        interests: ['Music'],
        starSign: 'Aries',
        useStarSignMatching: true,
      }),
    },
    {
      socketId: 'socket-b',
      user: createUser({
        gender: 'Male',
        genderPreference: ['Female'],
        interests: ['Music', 'Travel'],
        starSign: 'Leo',
        useStarSignMatching: true,
      }),
    },
  ];

  const result = findBestMatch(waitingQueue, newUser);
  assert.equal(result.matchIndex, 1);
  assert.equal(result.score, 10);
});
