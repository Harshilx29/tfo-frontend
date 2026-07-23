import { io, Socket } from 'socket.io-client';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

/**
 * socket — a shared socket.io-client instance.
 *
 * - Connects to the backend WebSocket server.
 * - `withCredentials: true` sends the httpOnly session cookie during the
 *   handshake so the backend can authenticate the connection.
 * - `autoConnect: false` — connect() is called explicitly by AuthContext
 *   once the user's profile has been loaded.
 */
const socket: Socket = io(API_URL, {
  withCredentials: true,
  autoConnect: false,
  reconnectionAttempts: 10,
  reconnectionDelay: 1500,
  timeout: 10_000,
});

export default socket;
