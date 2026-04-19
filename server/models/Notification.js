const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  read:    { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Auto-delete after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2_592_000 });
// Fast per-user queries sorted by newest
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
