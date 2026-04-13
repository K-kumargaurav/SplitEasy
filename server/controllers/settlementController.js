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

    // check membership
    if (!group.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    const expenses = await Expense.find({ group: req.params.id }).lean();

    const balances = {};

    expenses.forEach((expense) => {
      const paidBy = expense.paidBy.toString();

      expense.splitBetween.forEach((split) => {
        const owedBy = split.user.toString();

        if (split.paid || owedBy === paidBy) return;

        const amount = split.share;

        if (!balances[paidBy]) balances[paidBy] = {};
        if (!balances[paidBy][owedBy]) balances[paidBy][owedBy] = 0;

        balances[paidBy][owedBy] += amount;
      });
    });

    const result = [];
    for (const creditor in balances) {
      for (const debtor in balances[creditor]) {
        if (balances[creditor][debtor] > 0) {
          result.push({
            owedBy: debtor,
            owedTo: creditor,
            amount: balances[creditor][debtor] / 100,
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

    if (!group.members.includes(req.user._id)) {
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

    global.io.to(paidToId.toString()).emit("settlement_request", {
      message: `${req.user.name} wants to settle ₹${amount}`,
      groupId: req.params.id.toString(),
    });

    res.status(201).json({
      message: "Settlement request sent",
      settlement,
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

      for (const expense of expenses) {
        const split = expense.splitBetween.find(
          (s) => s.user.toString() === settlement.paidBy.toString() && !s.paid,
        );

        if (split) {
          split.paid = true;
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

    global.io.to(settlement.paidBy.toString()).emit("settlement_update", {
      status,
      groupId: settlement.group.toString(),
    });

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
