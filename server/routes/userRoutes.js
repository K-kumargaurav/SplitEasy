const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getProfile, 
    sendFriendRequest, 
    acceptFriendRequest, 
    getFriends 
} = require("../controllers/userController");

router.get("/profile", protect, getProfile);
router.post("/friend-request/:id", protect, sendFriendRequest);
router.put("/friend-request/:id/accept", protect, acceptFriendRequest);
router.get("/friends", protect, getFriends);

module.exports = router;
