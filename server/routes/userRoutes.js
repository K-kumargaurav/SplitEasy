const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getProfile,
    getUserById,
    updateProfile,
    changePassword,
    sendPasswordOtp,
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
router.put("/profile", protect, updateProfile);
router.post("/send-password-otp", protect, sendPasswordOtp);
router.put("/change-password", protect, changePassword);
router.post("/friend-request/:id", protect, sendFriendRequest);
router.put("/friend-request/:id/accept", protect, acceptFriendRequest);
router.get("/friends", protect, getFriends);
router.get('/search', protect, searchUsers);
router.get('/notifications', protect, getNotifications);
router.put('/notifications/read', protect, markNotificationsRead);
router.get('/activity', protect, getUserActivity);
router.get('/debts', protect, getUserDebts);
router.get('/:id', protect, getUserById);

module.exports = router;
