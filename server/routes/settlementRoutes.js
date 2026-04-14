const express = require("express");
const router = express.Router();
const {
  settleUp,
  respondToSettlement,
  getPendingSettlements,
  getSettlements,
  getBalances,
} = require("../controllers/settlementController");

const { protect } = require("../middleware/authMiddleware");

router.get("/groups/:id/balances", protect, getBalances);
router.post("/groups/:id/settle", protect, settleUp);
router.put("/settlements/:id/respond", protect, respondToSettlement);
router.get("/settlements/pending", protect, getPendingSettlements);
router.get("/groups/:id/settlements", protect, getSettlements);

module.exports = router;