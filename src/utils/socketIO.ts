interface RoomPayload {
  roomId?: string | number;
}

type Acknowledgement = (message: string) => void;

interface SocketLike {
  join(room: string): void;
  leave(room: string): void;
  on(event: 'join-room', listener: (data: RoomPayload, callback: Acknowledgement) => void): void;
  on(event: 'leave-room', listener: (data: RoomPayload) => void): void;
  on(event: 'disconnect', listener: () => void): void;
}

interface SocketServerLike {
  on(event: 'connection', listener: (socket: SocketLike) => void): void;
}

const socketIO = (io: SocketServerLike): void => {
  io.on('connection', (socket: SocketLike) => {
    socket.on('join-room', (data: RoomPayload, callback: Acknowledgement) => {
      if (data?.roomId) {
        socket.join(`room${data.roomId}`);
        callback('Join room successful');
      } else {
        callback('Must provide a valid user id');
      }
    });

    socket.on('leave-room', (data: RoomPayload) => {
      if (data?.roomId) {
        socket.leave(`room${data.roomId}`);
      }
    });

    socket.on('disconnect', () => {});
  });
};

export default socketIO;
