const User = require("../models/User");

// @GET /api/users/profile
const getProfile = async (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    friends: req.user.friends,
  });
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

module.exports = {
  getProfile,
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  searchUsers,
  getNotifications,
  markNotificationsRead,
};
