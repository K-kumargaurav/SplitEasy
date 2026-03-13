const express = require('express');
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { createGroup, 
    getGroups, 
    getGroupById, 
    addExpense, 
    getGroupExpenses 
} = require('../controllers/groupController');

router.post("/", protect, createGroup);
router.get("/", protect, getGroups);
router.get("/:id", protect, getGroupById);
router.post("/:id/expenses", protect, addExpense);
router.get("/:id/expenses", protect, getGroupExpenses);

module.exports = router;