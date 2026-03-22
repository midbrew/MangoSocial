import Notification from '../models/Notification';
import { Server } from 'socket.io';

let ioInstance: Server | null = null;

/** Call once at startup to enable live socket pushes for new notifications. */
export function setNotificationIO(io: Server) {
    ioInstance = io;
}

// Map of userId -> socketId, shared with matching handler via the 'identify' event.
// We rely on the global 'identify' event to populate this via setConnectedUsersMap().
let connectedUsersMap: Map<string, string> | null = null;

export function setConnectedUsersMap(map: Map<string, string>) {
    connectedUsersMap = map;
}

interface CreateNotificationInput {
    userId: string;
    type: 'friend_request' | 'friend_accepted' | 'match' | 'message';
    title: string;
    body: string;
    relatedId?: string;
    data?: Record<string, any>;
}

export async function createNotification(input: CreateNotificationInput) {
    const notification = await Notification.create({
        user: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        relatedId: input.relatedId,
        data: input.data,
    });

    // Push live to the user if they're connected
    if (ioInstance && connectedUsersMap) {
        const socketId = connectedUsersMap.get(input.userId);
        if (socketId) {
            ioInstance.to(socketId).emit('new-notification', {
                _id: notification._id.toString(),
                type: notification.type,
                title: notification.title,
                body: notification.body,
                read: notification.read,
                relatedId: notification.relatedId,
                data: notification.data,
                createdAt: notification.createdAt,
            });
        }
    }

    return notification;
}
