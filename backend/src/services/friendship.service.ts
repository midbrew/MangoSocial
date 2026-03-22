import Friendship, { IFriendship } from '../models/Friendship';

export const BOT_IDS = ['bot_ama', 'bot_kofi'] as const;

export const BOT_PROFILES: Record<string, {
    id: string;
    _id: string;
    name: string;
    displayName: string;
    avatarUrl: string | null;
    profileImageUrl: string | null;
    isBot: true;
}> = {
    bot_ama: {
        id: 'bot_ama',
        _id: 'bot_ama',
        name: 'Ama',
        displayName: 'Ama',
        avatarUrl: null,
        profileImageUrl: null,
        isBot: true,
    },
    bot_kofi: {
        id: 'bot_kofi',
        _id: 'bot_kofi',
        name: 'Kofi',
        displayName: 'Kofi',
        avatarUrl: null,
        profileImageUrl: null,
        isBot: true,
    },
};

export function normalizePair(userA: string, userB: string) {
    return userA < userB
        ? { user1Id: userA, user2Id: userB }
        : { user1Id: userB, user2Id: userA };
}

export function buildPairQuery(userA: string, userB: string) {
    return normalizePair(userA, userB);
}

export async function findFriendshipBetween(userA: string, userB: string) {
    return Friendship.findOne({
        $or: [
            { user1Id: userA, user2Id: userB },
            { user1Id: userB, user2Id: userA }
        ]
    });
}

export async function isAcceptedFriendship(userA: string, userB: string) {
    const friendship = await Friendship.findOne({
        $or: [
            { user1Id: userA, user2Id: userB },
            { user1Id: userB, user2Id: userA }
        ],
        status: 'accepted',
    });

    return !!friendship;
}

export async function isBlockedPair(userA: string, userB: string) {
    const friendship = await Friendship.findOne({
        $or: [
            { user1Id: userA, user2Id: userB },
            { user1Id: userB, user2Id: userA }
        ],
        status: 'blocked',
    });

    return !!friendship;
}

export async function getBlockedPartnerIds(userId: string) {
    const blocked = await Friendship.find({
        status: 'blocked',
        $or: [{ user1Id: userId }, { user2Id: userId }],
    }).select('user1Id user2Id');

    return blocked.map((friendship) => friendship.user1Id === userId ? friendship.user2Id : friendship.user1Id);
}

export function createFriendshipPayload(friendship: IFriendship, viewerId: string) {
    const partnerId = friendship.user1Id === viewerId ? friendship.user2Id : friendship.user1Id;

    return {
        id: friendship._id.toString(),
        friendshipId: friendship._id.toString(),
        partnerId,
        status: friendship.status,
        initiatorId: friendship.initiatorId || null,
        acceptedAt: friendship.acceptedAt || null,
        updatedAt: friendship.updatedAt,
        createdAt: friendship.createdAt,
    };
}
