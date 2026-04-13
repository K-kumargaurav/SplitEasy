const express = require("express");
const router = express.Router();
const {
  settleUp,
  respondToSettlement,
  getPendingSettlements,
  getSettlements
} = require("../controllers/settlementController");
const auth = require("../middleware/auth");

router.post("/groups/:id/settle", auth, settleUp);
router.put("/settlements/:id/respond", auth, respondToSettlement);
router.get("/settlements/pending", auth, getPendingSettlements);
router.get("/groups/:id/settlements", auth, getSettlements);

module.exports = router;