const mongoose = require("mongoose");

const pendingActionSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    type: {
      type: String,
      enum: ["leave_request", "expense_edit", "remove_member"],
      required: true,
    },
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // For leave_request and remove_member: who is being acted on
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // For expense_edit
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
    },
    proposedChanges: {
      description: String,
      category: String,
    },
    votes: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        approve: Boolean,
        votedAt: { type: Date, default: Date.now },
      },
    ],
    // Users who must vote for this to resolve
    requiredVoters: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

pendingActionSchema.index({ group: 1, status: 1 });

module.exports = mongoose.model("PendingAction", pendingActionSchema);
