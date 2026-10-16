import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    let userId: string | undefined;
    if (typeof window !== 'undefined') {
      try {
        const u = localStorage.getItem('user');
        if (u) userId = JSON.parse(u)?.id;
      } catch {}
    }

    socket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      auth: { userId },
      query: { userId },
      withCredentials: true,
    });
  }
  return socket;
}