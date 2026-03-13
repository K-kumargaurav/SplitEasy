const express = require("express");
const router = express.Router({ mergeParams: true });
const { protect } = require("../middleware/authMiddleware");
const { 
    getBalances, 
    settleUp, 
    getSettlements 
} = require("../controllers/settlementController");

router.get("/balances", protect, getBalances);
router.post("/settle", protect, settleUp);
router.get("/settlements", protect, getSettlements)

module.exports = router;
