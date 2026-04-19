const mongoose = require("mongoose");

const balanceSnapshotSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true,
    unique: true,
  },
  balances: [
    {
      owedBy: String,
      owedTo: String,
      amount: Number,
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("BalanceSnapshot", balanceSnapshotSchema);
