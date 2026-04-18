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
  editExpense,
  sendInvite,
  respondToInvite,
  approveInvite,
  getPendingInvites,
  leaveGroup,
  removeMember,
  addComment,
  updateGroup,
  deleteGroup,
} = require('../controllers/groupController');

router.post("/", protect, createGroup);
router.get("/", protect, getGroups);
router.get('/invites/pending', protect, getPendingInvites);
router.get("/:id", protect, getGroupById);
router.put("/:id", protect, updateGroup);
router.delete("/:id", protect, deleteGroup);
router.delete("/:id/leave", protect, leaveGroup);
router.delete("/:id/members/:memberId", protect, removeMember);
router.post("/:id/expenses", protect, addExpense);
router.get("/:id/expenses", protect, getGroupExpenses);
router.put("/:id/expenses/:expenseId", protect, editExpense);
router.delete("/:id/expenses/:expenseId", protect, deleteExpense);
router.post("/:id/expenses/:expenseId/comments", protect, addComment);
router.post('/:id/invite', protect, sendInvite);
router.put('/:id/invite/respond', protect, respondToInvite);
router.put('/:id/invite/approve', protect, approveInvite);

module.exports = router;
