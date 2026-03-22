import Notification from '../models/Notification';

interface CreateNotificationInput {
    userId: string;
    type: 'friend_request' | 'friend_accepted' | 'match' | 'message';
    title: string;
    body: string;
    relatedId?: string;
    data?: Record<string, any>;
}

export async function createNotification(input: CreateNotificationInput) {
    return Notification.create({
        user: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        relatedId: input.relatedId,
        data: input.data,
    });
}
