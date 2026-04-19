const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const compression = require("compression");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5000;

/* ── Compression ── */
app.use(compression());

/* ── Security headers ── */
app.use(helmet());

/* ── CORS ── */
app.use(
  cors({
    origin: function (origin, callback) {
      const allowed = [
        process.env.CLIENT_URL,
        "http://localhost:5173",
        "http://localhost:5174",
      ];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

/* ── Body parser with size limit ── */
app.use(express.json({ limit: "10kb" }));

/* ── Sanitize MongoDB operators from req.body only (req.query is read-only in newer Node) ── */
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body, { allowDots: false });
  next();
});

/* ── Rate limiters ── */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  message: { message: "Too many OTP requests, please wait 10 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { message: "Too many requests, slow down" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

/* ── Test route ── */
app.get("/", (req, res) => {
  res.json({ message: "SplitEasy API is running" });
});

/* ── Routes ── */
const authRoutes          = require("./routes/authRoutes");
const userRoutes          = require("./routes/userRoutes");
const groupRoutes         = require("./routes/groupRoutes");
const settlementRoutes    = require("./routes/settlementRoutes");
const pendingActionRoutes = require("./routes/pendingActionRoutes");

app.use("/api/auth/send-register-otp",  otpLimiter);
app.use("/api/auth/send-login-otp",     otpLimiter);
app.use("/api/auth/forgot-password",    otpLimiter);
app.use("/api/auth",    authLimiter, authRoutes);
app.use("/api/users/send-password-otp", otpLimiter);
app.use("/api/users/change-password",   otpLimiter);
app.use("/api/users",   userRoutes);
app.use("/api/groups",  groupRoutes);
app.use("/api",         settlementRoutes);
app.use("/api/groups/:id/pending-actions", pendingActionRoutes);

/* ── Global error handler (no stack traces to client) ── */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

/* ── HTTP server ── */
const server = http.createServer(app);

/* ── Socket.io with JWT auth ── */
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL, "http://localhost:5173"],
    credentials: true,
  },
});

global.io = io;

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication required"));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  // Join only the authenticated user's own room
  socket.join(socket.userId);

  socket.on("disconnect", () => {});
});

/* ── Connect to MongoDB + Start server ── */
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");

    const User = require("./models/User");
    await User.updateMany({ country: { $exists: false } }, { $set: { country: "India" } });
    await User.updateMany({ emailVerified: { $exists: false } }, { $set: { emailVerified: true } });

    /* Migrate embedded notifications → Notification collection */
    const Notification = require("./models/Notification");
    const usersWithNotifs = await User.find({
      "notifications.0": { $exists: true },
    }).select("_id notifications");
    for (const u of usersWithNotifs) {
      const docs = u.notifications.map((n) => ({
        userId: u._id,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt || new Date(),
      }));
      await Notification.insertMany(docs, { ordered: false }).catch(() => {});
      await User.updateOne({ _id: u._id }, { $set: { notifications: [] } });
    }
    if (usersWithNotifs.length) {
      console.log(`Migrated notifications for ${usersWithNotifs.length} user(s)`);
    }

    /* Backfill missing usernames */
    const usersWithoutUsername = await User.find({ username: { $exists: false } }).select("_id name");
    for (const u of usersWithoutUsername) {
      const base = (u.name || "user").toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "").slice(0, 15) || "user";
      let username, exists;
      do {
        username = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
        exists = await User.findOne({ username });
      } while (exists);
      await User.updateOne({ _id: u._id }, { $set: { username } });
    }
    if (usersWithoutUsername.length) {
      console.log(`Backfilled usernames for ${usersWithoutUsername.length} user(s)`);
    }

    server.listen(PORT, () => {
      console.log(`Server running on Port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB error : ", error.message);
    process.exit(1);
  });
