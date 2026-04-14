const Expense = require("../models/Expense");
const Settlement = require("../models/Settlement");
const Group = require("../models/Group");
const sendNotification = require("../utils/sendNotification");

// @GET /api/groups/:id/balances
const getBalances = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.members.some(m => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    const expenses = await Expense.find({ group: req.params.id }).lean();

    const balances = {};

    expenses.forEach(expense => {
      const paidBy = expense.paidBy.toString();

      expense.splitBetween.forEach(split => {
        const owedBy = split.user.toString();

        if (owedBy === paidBy) return;

        if (!balances[owedBy]) balances[owedBy] = {};
        if (!balances[owedBy][paidBy]) balances[owedBy][paidBy] = 0;

        // ONLY count unpaid
        if (!split.paid) {
          balances[owedBy][paidBy] += split.share;
        }
      });
    });

    const result = [];

    for (const debtor in balances) {
      for (const creditor in balances[debtor]) {
        const amount = balances[debtor][creditor];

        if (amount > 0) {
          result.push({
            owedBy: debtor,
            owedTo: creditor,
            amount: amount / 100,
          });
        }
      }
    }

    res.json(result);

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @POST /api/groups/:id/settle
//CREATE REQUEST ONLY
const settleUp = async (req, res) => {
  try {
    const { paidToId, amount } = req.body;

    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Not a member" });
    }

    const settlement = await Settlement.create({
      group: req.params.id,
      paidBy: req.user._id,
      paidTo: paidToId,
      amount: Math.round(amount * 100),
      status: "pending",
    });

    await sendNotification(
      paidToId,
      `${req.user.name} wants to settle ₹${amount} with you`,
    );

    if (global.io) {
      global.io.to(paidToId.toString()).emit("settlement_request", {
        message: `${req.user.name} wants to settle ₹${amount}`,
        groupId: req.params.id.toString(),
      });
    }

    res.status(201).json({
      message: "Settlement request sent",
      settlement: { ...settlement.toObject(), amount: settlement.amount / 100 },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @PUT /api/settlements/:id/respond
// CONFIRM / REJECT
const respondToSettlement = async (req, res) => {
  try {
    const { status } = req.body; // accepted / rejected
    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const settlement = await Settlement.findById(req.params.id);

    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    // Only receiver can respond
    if (settlement.paidTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (settlement.status !== "pending") {
      return res.status(400).json({ message: "Already processed" });
    }

    settlement.status = status;

    // Only now apply payment if accepted
    if (status === "accepted") {
      const expenses = await Expense.find({
        group: settlement.group,
        paidBy: settlement.paidTo,
      });

      let remaining = settlement.amount; // track how much to mark paid

      for (const expense of expenses) {
        const split = expense.splitBetween.find(
          (s) => s.user.toString() === settlement.paidBy.toString() && !s.paid,
        );

        if (split && remaining >= split.share) {
          split.paid = true;
          remaining -= split.share;
          await expense.save();
        }
      }
    }

    await settlement.save();

    await sendNotification(
      settlement.paidBy,
      status === "accepted"
        ? `${req.user.name} accepted your settlement`
        : `${req.user.name} rejected your settlement`,
    );

    if (global.io) {
      global.io.to(settlement.paidBy.toString()).emit("settlement_update", {
        status,
        groupId: settlement.group.toString(),
      });
    }

    res.json({
      message:
        status === "accepted" ? "Settlement confirmed" : "Settlement rejected",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @GET /api/settlements/pending
// GET RECEIVER REQUESTS
const getPendingSettlements = async (req, res) => {
  try {
    const settlements = await Settlement.find({
      paidTo: req.user._id,
      status: "pending",
    })
      .populate("paidBy", "name email")
      .populate("group", "name");

    res.json(settlements);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @GET /api/groups/:id/settlements
const getSettlements = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).select("members");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    const settlements = await Settlement.find({ group: req.params.id })
      .populate("paidBy", "name email")
      .populate("paidTo", "name email");

    res.json(settlements);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getBalances,
  settleUp,
  respondToSettlement,
  getPendingSettlements,
  getSettlements,
};
