const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getProfile,
    sendFriendRequest,
    acceptFriendRequest,
    getFriends,
    searchUsers,
    getNotifications,
    markNotificationsRead,
    getUserActivity,
    getUserDebts,
} = require("../controllers/userController");

router.get("/profile", protect, getProfile);
router.post("/friend-request/:id", protect, sendFriendRequest);
router.put("/friend-request/:id/accept", protect, acceptFriendRequest);
router.get("/friends", protect, getFriends);
router.get('/search', protect, searchUsers);
router.get('/notifications', protect, getNotifications);
router.put('/notifications/read', protect, markNotificationsRead);
router.get('/activity', protect, getUserActivity);
router.get('/debts', protect, getUserDebts);

module.exports = router;
