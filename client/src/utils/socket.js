import { io } from "socket.io-client";

const socket = io("http://localhost:5000"); // later use env for production

export default socket;