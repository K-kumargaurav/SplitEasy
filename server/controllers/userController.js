const User = require("../models/User");
const Group = require("../models/Group");
const Expense = require("../models/Expense");
const Settlement = require("../models/Settlement");
const bcrypt = require("bcryptjs");

// @GET /api/users/profile
const getProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
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
    friends: user.friends,
  });
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
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const { name, bio, profilePhoto, isOnline, country } = req.body;
    const user = await User.findById(req.user._id);
    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
    if (country !== undefined) user.country = country;
    const { profilePublic } = req.body;
    if (profilePublic !== undefined) user.profilePublic = profilePublic;
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
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @PUT /api/users/change-password
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword || newPassword.length < 6)
      return res.status(400).json({ message: "Invalid password data" });
    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
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
        .status(401)
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
    res.status(500).json({ message: "Server error", error: error.message });
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
    res.status(500).json({ message: "Server error", error: error.message });
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
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @GET /api/users/search?email=xxx
const searchUsers = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const users = await User.find({
      email: { $regex: email, $options: "i" }, // case-insensitive search
      _id: { $ne: req.user._id }, // exclude yourself
    })
      .select("name email")
      .limit(5);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @GET /api/users/notifications
const getNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    // Return newest first
    const notifications = [...user.notifications]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20); // max 20
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @PUT /api/users/notifications/read
const markNotificationsRead = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.notifications.forEach((n) => (n.read = true));
    await user.save();
    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
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
    res.status(500).json({ message: "Server error", error: err.message });
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
            if (!split.paid) balances[owedBy][paidBy] += split.share;
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
    res.status(500).json({ message: "Server error", error: err.message });
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
};
