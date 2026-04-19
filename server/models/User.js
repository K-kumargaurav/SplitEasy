const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      minlength: 6,
      // optional — not set for Google-only accounts
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    bio: {
      type: String,
      default: "",
      maxlength: 150,
    },
    profilePhoto: {
      type: String,
      default: "",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
    },
    country: {
      type: String,
      default: "India",
    },
    upiId: {
      type: String,
      default: "",
      trim: true,
    },
    phoneNumber: {
      type: String,
      default: "",
      trim: true,
    },
    profilePublic: {
      type: Boolean,
      default: false,
    },
    paymentDetailsPublic: {
      type: Boolean,
      default: true,
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    friendRequests: [
      {
        from: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
      },
    ],
    notifications: [
      {
        message: { type: String },
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    passwordOtp:       { type: String },
    passwordOtpExpiry: { type: Date },
    emailVerified:     { type: Boolean, default: false },
    emailOtp:          { type: String },
    emailOtpExpiry:    { type: Date },
  },
  { timestamps: true },
);

// Text index for fast username + name search
userSchema.index({ username: "text", name: "text" });
// Compound index for name prefix queries
userSchema.index({ name: 1 });

module.exports = mongoose.model("User", userSchema);
