const express = require('express');
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
    createGroup,
  getGroups,
  getGroupById,
  addExpense,
  getGroupExpenses,
  deleteExpense,
  sendInvite,
  respondToInvite,
  getPendingInvites,
  addComment,
  updateGroup,
} = require('../controllers/groupController');

router.post("/", protect, createGroup);
router.get("/", protect, getGroups);
router.get('/invites/pending', protect, getPendingInvites);
router.get("/:id", protect, getGroupById);
router.put("/:id", protect, updateGroup);
router.post("/:id/expenses", protect, addExpense);
router.get("/:id/expenses", protect, getGroupExpenses);
router.delete("/:id/expenses/:expenseId", protect, deleteExpense);
router.post("/:id/expenses/:expenseId/comments", protect, addComment);
router.post('/:id/invite', protect, sendInvite);
router.put('/:id/invite/respond', protect, respondToInvite);

module.exports = router;
