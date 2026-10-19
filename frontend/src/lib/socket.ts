import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

let socket: Socket | null = null;

export const getSocket = (userId?: string): Socket => {
  const URL =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001';

  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('token') || Cookies.get('token') || ''
      : '';

  if (!socket) {
    socket = io(URL, {
      auth: { token, userId: userId || '' },
      query: { userId: userId || '' },
      transports: ['websocket', 'polling'],
      autoConnect: !!token,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });
  } else {
    const auth = (socket.auth || {}) as any;
    const tokenChanged = auth.token !== token;
    const userChanged = userId && auth.userId !== userId;

    if (tokenChanged || userChanged) {
      socket.auth = { token, userId: userId || auth.userId || '' };
      (socket.io as any).opts.query = { userId: userId || auth.userId || '' };
      if (socket.connected) socket.disconnect();
      if (token) socket.connect();
    } else if (token && !socket.connected) {
      socket.connect();
    }
  }

  return socket;
};

/** À appeler au logout */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};