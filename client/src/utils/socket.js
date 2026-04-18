import { io } from "socket.io-client";

let socket = null;

export function getSocket(token) {
  if (socket && socket.connected) return socket;
  if (socket) socket.disconnect();

  socket = io(import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000", {
    auth: { token },
    transports: ["websocket"],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
