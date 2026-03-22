import { Server, Socket } from 'socket.io';

export const setupChatHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    socket.on('join-chat', (data: { roomId: string }) => {
      if (!data.roomId) return;
      socket.join(data.roomId);
    });

    socket.on('send-message', (data: {
      roomId: string;
      senderId: string;
      text?: string;
      imageUrl?: string;
    }) => {
      if (!data.roomId || (!data.text && !data.imageUrl)) return;

      io.to(data.roomId).emit('receive-message', {
        senderId: data.senderId,
        text: data.text || '',
        imageUrl: data.imageUrl || undefined,
        timestamp: new Date(),
      });
    });

    socket.on('typing', (data: { roomId: string; userId: string; isTyping: boolean }) => {
      if (!data.roomId) return;
      socket.to(data.roomId).emit('partner-typing', {
        userId: data.userId,
        isTyping: data.isTyping
      });
    });

    socket.on('mark-read', (data: { roomId: string; userId: string }) => {
      if (!data.roomId) return;
      socket.to(data.roomId).emit('messages-read', {
        userId: data.userId,
        readAt: new Date()
      });
    });
  });
};
