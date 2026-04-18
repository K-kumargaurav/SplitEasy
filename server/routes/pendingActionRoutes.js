const express = require("express");
const router  = express.Router({ mergeParams: true });
const { protect } = require("../middleware/authMiddleware");
const { getPendingActions, castVote } = require("../controllers/pendingActionController");

router.get("/",                   protect, getPendingActions);
router.post("/:actionId/vote",    protect, castVote);

module.exports = router;
