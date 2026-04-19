const User = require("../models/User");
const Group = require("../models/Group");
const Expense = require("../models/Expense");
const Settlement = require("../models/Settlement");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

// @GET /api/users/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      bio: user.bio,
      profilePhoto: user.profilePhoto,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      country: user.country || "India",
      profilePublic: user.profilePublic ?? false,
      paymentDetailsPublic: user.paymentDetailsPublic ?? true,
      upiId: user.upiId || "",
      phoneNumber: user.phoneNumber || "",
      friends: user.friends,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// @GET /api/users/:id — public profile (respects profilePublic)
const getUserById = async (req, res) => {
  try {
    const target = await User.findById(req.params.id).select(
      "name username bio profilePhoto isOnline lastSeen country profilePublic"
    );
    if (!target) return res.status(404).json({ message: "User not found" });

    if (!target.profilePublic) {
      return res.json({
        _id: target._id,
        name: target.name,
        isOnline: target.isOnline,
        profilePublic: false,
      });
    }

    res.json({
      _id: target._id,
      name: target.name,
      username: target.username,
      bio: target.bio,
      profilePhoto: target.profilePhoto,
      isOnline: target.isOnline,
      lastSeen: target.lastSeen,
      country: target.country || "India",
      profilePublic: true,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// @PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const { name, bio, profilePhoto, isOnline, country, upiId, phoneNumber } = req.body;
    const user = await User.findById(req.user._id);
    if (name        !== undefined) user.name        = String(name).trim().slice(0, 60);
    if (bio         !== undefined) user.bio         = String(bio).slice(0, 150);
    if (upiId       !== undefined) user.upiId       = String(upiId).trim().slice(0, 50);
    if (phoneNumber !== undefined) user.phoneNumber = String(phoneNumber).trim().replace(/\D/g, "").slice(0, 10);
    if (profilePhoto !== undefined) {
      // Only allow https URLs or empty string
      if (profilePhoto === "" || /^https:\/\/.+/.test(profilePhoto))
        user.profilePhoto = profilePhoto;
    }
    if (country !== undefined) user.country = country;
    const { profilePublic, paymentDetailsPublic } = req.body;
    if (profilePublic        !== undefined) user.profilePublic        = profilePublic;
    if (paymentDetailsPublic !== undefined) user.paymentDetailsPublic = paymentDetailsPublic;
    if (isOnline !== undefined) {
      user.isOnline = isOnline;
      if (!isOnline) user.lastSeen = new Date();
    }
    await user.save();
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      bio: user.bio,
      profilePhoto: user.profilePhoto,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      country: user.country || "India",
      profilePublic: user.profilePublic ?? false,
      paymentDetailsPublic: user.paymentDetailsPublic ?? true,
      upiId: user.upiId || "",
      phoneNumber: user.phoneNumber || "",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// @POST /api/users/send-password-otp
const sendPasswordOtp = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const otp = String(crypto.randomInt(100000, 999999));
    user.passwordOtp       = otp;
    user.passwordOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "SplitEasy — Password Change OTP",
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:auto">
          <h2 style="color:#10b981">SplitEasy</h2>
          <p>Your one-time password to change your account password:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;
                      color:#111;background:#f3f4f6;padding:16px 24px;
                      border-radius:12px;text-align:center;margin:16px 0">
            ${otp}
          </div>
          <p style="color:#6b7280;font-size:13px">
            This code expires in <strong>10 minutes</strong>.
            If you didn't request this, ignore this email.
          </p>
        </div>
      `,
    });

    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("sendPasswordOtp:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// @PUT /api/users/change-password
const changePassword = async (req, res) => {
  try {
    const { otp, newPassword } = req.body;
    if (!otp || !newPassword || newPassword.length < 8)
      return res.status(400).json({ message: "OTP and new password (min 8 chars) are required" });

    const user = await User.findById(req.user._id).select("+passwordOtp +passwordOtpExpiry");
    if (!user.passwordOtp || user.passwordOtp !== String(otp).trim())
      return res.status(400).json({ message: "Invalid OTP" });
    if (!user.passwordOtpExpiry || user.passwordOtpExpiry < new Date())
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });

    const salt = await bcrypt.genSalt(12);
    user.password          = await bcrypt.hash(newPassword, salt);
    user.passwordOtp       = undefined;
    user.passwordOtpExpiry = undefined;
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("changePassword:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @POST /api/users/friend-request/:id
const sendFriendRequest = async (req, res) => {
  try {
    const toUser = await User.findById(req.params.id);

    if (!toUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Can't send request to yourself
    if (req.params.id == req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "Cannot send request to yourself" });
    }

    // Check if already friend
    if (toUser.friends.includes(req.user._id)) {
      return res.status(400).json({ message: "Already friends" });
    }

    // Check if request already sent
    const alreadySent = toUser.friendRequests.find(
      (r) => r.from.toString() === req.user._id.toString(),
    );
    if (alreadySent) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    // Add friend request
    toUser.friendRequests.push({ from: req.user._id });
    await toUser.save();

    res.json({ message: "Friend request sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @PUT /api/users/friend-request/:id/accept
const acceptFriendRequest = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);

    const request = currentUser.friendRequests.find(
      (r) => r.from.toString() === req.params.id,
    );

    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // update user status
    request.status = "accepted";

    // Add each other as friends
    currentUser.friends.push(req.params.id);
    await currentUser.save();

    const fromUser = await User.findById(req.params.id);
    if (!fromUser) {
      return res.status(404).json({ message: "Requesting user not found" });
    }
    fromUser.friends.push(req.user._id);
    await fromUser.save();

    res.json({ message: "Friend request accepted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @GET /api/users/friends
const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "friends",
      "name email",
    );
    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @GET /api/users/search?q=username_or_name
const searchUsers = async (req, res) => {
  try {
    const q = (req.query.q || "").trim().replace(/^@/, "").toLowerCase();

    if (!q || q.length < 2) {
      return res.status(400).json({ message: "Query too short" });
    }

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const users = await User.find({
      $or: [
        { username: { $regex: `^${escaped}`, $options: "i" } },
        { name:     { $regex: escaped,        $options: "i" } },
      ],
      _id: { $ne: req.user._id },
    })
      .select("name email username profilePhoto")
      .limit(6);

    res.json(users);
  } catch (error) {
    console.error("searchUsers:", error);
    res.status(500).json({ message: "Search failed" });
  }
};

// @GET /api/users/notifications
const getNotifications = async (req, res) => {
  try {
    const Notification = require("../models/Notification");
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @PUT /api/users/notifications/read
const markNotificationsRead = async (req, res) => {
  try {
    const Notification = require("../models/Notification");
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { $set: { read: true } },
    );
    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @GET /api/users/activity — all settlements involving the user (newest first)
const getUserActivity = async (req, res) => {
  try {
    const settlements = await Settlement.find({
      $or: [{ paidBy: req.user._id }, { paidTo: req.user._id }],
    })
      .populate("paidBy", "name")
      .populate("paidTo", "name")
      .populate("group", "name")
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    res.json(settlements.map((s) => ({ ...s, amount: s.amount / 100 })));
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// @GET /api/users/debts — what the user owes across all groups
const getUserDebts = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate("members", "name")
      .lean();

    const allDebts = [];

    await Promise.all(
      groups.map(async (group) => {
        const [expenses, settlements] = await Promise.all([
          Expense.find({ group: group._id }).lean(),
          Settlement.find({ group: group._id, status: "accepted" }).lean(),
        ]);

        const balances = {};
        expenses.forEach((expense) => {
          const paidBy = expense.paidBy.toString();
          expense.splitBetween.forEach((split) => {
            const owedBy = split.user.toString();
            if (owedBy === paidBy) return;
            if (!balances[owedBy]) balances[owedBy] = {};
            if (!balances[owedBy][paidBy]) balances[owedBy][paidBy] = 0;
            balances[owedBy][paidBy] += split.share;
          });
        });

        settlements.forEach((s) => {
          const paidBy = s.paidBy.toString();
          const paidTo = s.paidTo.toString();
          if (balances[paidBy]?.[paidTo] !== undefined) {
            balances[paidBy][paidTo] = Math.max(0, balances[paidBy][paidTo] - s.amount);
          }
        });

        const myOwed = balances[req.user._id.toString()];
        if (!myOwed) return;

        Object.entries(myOwed).forEach(([creditorId, amt]) => {
          if (amt <= 0) return;
          const creditor = group.members.find((m) => m._id.toString() === creditorId);
          allDebts.push({
            groupId: group._id,
            groupName: group.name,
            owedTo: creditorId,
            owedToName: creditor?.name ?? "Unknown",
            amount: amt / 100,
          });
        });
      })
    );

    res.json(allDebts);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getProfile,
  getUserById,
  updateProfile,
  changePassword,
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  searchUsers,
  getNotifications,
  markNotificationsRead,
  getUserActivity,
  getUserDebts,
  sendPasswordOtp,
};
