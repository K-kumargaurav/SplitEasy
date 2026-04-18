import { io } from "socket.io-client";

let socket = null;

export function getSocket(token) {
  if (socket && socket.connected) return socket;
  if (socket) socket.disconnect();

  socket = io(import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000", {
    auth: { token },
    autoConnect: true,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
